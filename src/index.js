#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import {
  startBridgeServer,
  isExtensionConnected,
  getExtensionInfo,
  sendRpc,
  captureScreenshot,
  scanAssets,
  reloadTab,
  healTab
} from './bridge/ws-server.js';
import { jobQueue } from './queue/mcp-queue.js';

// Start the local WebSocket Bridge for the Autoflow Chrome Extension
const port = process.env.AUTOFLOW_PORT || 19845;
startBridgeServer(port);

// Initialize MCP Server
const server = new Server(
  {
    name: 'autoflow-mcp',
    version: '2.1.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const TOOL_DEFINITIONS = [
  {
    name: 'autoflow_status',
    description: 'Check the connection status of the Autoflow Chrome Extension and Google Flow tab.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_open_flow',
    description: 'Instruct the Autoflow extension to open Google Flow (https://flow.google.com/) in an active browser tab.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_get_queue',
    description: 'Inspect the current status of the Autoflow sequential job queue (active job, pending jobs, and recent history).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_generate',
    description: 'Generate an AI video or image on Google Flow using Veo 3 or Nano Banana models via the Autoflow extension (queued sequentially).',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The creative prompt for the image or video generation.'
        },
        mode: {
          type: 'string',
          description: 'Generation mode: textToVideo, imageToVideo, textToImage, imageToImage.',
          enum: ['textToVideo', 'imageToVideo', 'textToImage', 'imageToImage']
        },
        model: {
          type: 'string',
          description: 'AI model to use (e.g. "Veo 3.1 - Fast", "Veo 3.1 - Quality", "Nano Banana 2", "Imagen 4").'
        },
        aspectRatio: {
          type: 'string',
          description: 'Aspect ratio: "16:9", "9:16", "1:1", "4:3", or "3:4".',
          enum: ['16:9', '9:16', '1:1', '4:3', '3:4']
        },
        outputCount: {
          type: 'number',
          description: 'Number of variations to produce (default: 1, max: 4).'
        },
        videoOption: {
          type: 'string',
          description: 'Video duration option: "4s" or "8s".',
          enum: ['4s', '8s']
        },
        characterTag: {
          type: 'string',
          description: 'Character tag to maintain subject consistency (e.g. "@character_1").'
        },
        autoDownloadResourceQuality: {
          type: 'string',
          description: 'Download quality: "1080", "2k", "4k", or "no-download".',
          enum: ['1080', '2k', '4k', 'no-download']
        },
        folderName: {
          type: 'string',
          description: 'Folder name where downloaded files should be saved.'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'autoflow_list_characters',
    description: 'Scan and list all available character tags in the currently open Google Flow project.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_capture_screenshot',
    description: 'Capture a visual JPEG screenshot of the Google Flow project workspace so the AI agent can inspect progress, verify visual output, or diagnose UI state.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_get_recent_assets',
    description: 'Scan and list all recent video and image generation assets produced on the Google Flow project canvas.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_heal_flow',
    description: 'Trigger self-healing: automatically detect and dismiss any blocking Google Flow error dialogs, rate limit popups, or warning snackbars.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_reload_tab',
    description: 'Force-reload the Google Flow project tab and re-mount the extension bridge if the web app appears frozen or unresponsive.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_clear_queue',
    description: 'Clear all pending queued generation jobs.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'autoflow_cancel',
    description: 'Cancel any running or queued generation job in Google Flow.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: {
          type: 'string',
          description: 'Optional job ID to cancel. If omitted, cancels the currently active job.'
        }
      }
    }
  }
];

// Register list of tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOL_DEFINITIONS };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'autoflow_status': {
        if (!isExtensionConnected()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'disconnected',
                    extensionConnected: false,
                    message: 'Autoflow Chrome Extension is not connected. Please ensure Google Chrome is open with the Autoflow extension active.'
                  },
                  null,
                  2
                )
              }
            ]
          };
        }

        const extStatus = await sendRpc('STATUS', {}, { timeoutMs: 8000 });
        const queueState = jobQueue.getQueueState();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'connected',
                  extensionConnected: true,
                  flowTabActive: extStatus.flowTabActive,
                  flowTabUrl: extStatus.flowTabUrl,
                  extensionVersion: extStatus.version,
                  queue: queueState
                },
                null,
                2
              )
            }
          ]
        };
      }

      case 'autoflow_open_flow': {
        const result = await sendRpc('OPEN_FLOW', {}, { timeoutMs: 15000 });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'autoflow_get_queue': {
        const state = jobQueue.getQueueState();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(state, null, 2)
            }
          ]
        };
      }

      case 'autoflow_generate': {
        const prompt = args.prompt;
        if (!prompt || typeof prompt !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Parameter "prompt" is required.');
        }

        const characters = [];
        if (args.characterTag) {
          characters.push(args.characterTag);
        }

        const genParams = {
          prompt,
          mode: args.mode,
          model: args.model,
          aspectRatio: args.aspectRatio,
          outputCount: args.outputCount || 1,
          videoOption: args.videoOption,
          characters,
          autoDownloadResourceQuality: args.autoDownloadResourceQuality || '1080',
          folderName: args.folderName || 'Autoflow_MCP'
        };

        const result = await jobQueue.enqueue(genParams);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Generation completed successfully for prompt: "${prompt.substring(0, 50)}..."`,
                  result
                },
                null,
                2
              )
            }
          ]
        };
      }

      case 'autoflow_list_characters': {
        const result = await sendRpc('SCAN_CHARACTERS', {}, { timeoutMs: 20000 });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'autoflow_capture_screenshot': {
        const result = await captureScreenshot();
        return {
          content: [
            {
              type: 'image',
              data: result.data,
              mimeType: result.mimeType || 'image/jpeg'
            },
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                url: result.url,
                title: result.title,
                message: 'Screenshot captured from active Google Flow workspace'
              }, null, 2)
            }
          ]
        };
      }

      case 'autoflow_get_recent_assets': {
        const result = await scanAssets();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'autoflow_heal_flow': {
        const result = await healTab();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'autoflow_reload_tab': {
        const result = await reloadTab();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'autoflow_clear_queue': {
        const result = jobQueue.clearQueue();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'autoflow_cancel': {
        const result = await jobQueue.cancel(args.jobId || args.groupId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool '${name}' not found.`);
    }
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: err.message || String(err),
              suggestion: !isExtensionConnected()
                ? 'Open Google Chrome and verify the Autoflow extension is active.'
                : 'Ensure a tab with https://flow.google.com/ is open.'
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  }
});

// Run MCP Stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Autoflow MCP] Server started and listening via stdio.');
}

run().catch((err) => {
  console.error('[Autoflow MCP] Fatal error starting server:', err);
  process.exit(1);
});
