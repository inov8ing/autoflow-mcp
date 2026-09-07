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
  sendRpc
} from './bridge/ws-server.js';

// Start the local WebSocket Bridge for the Autoflow Chrome Extension
const port = process.env.AUTOFLOW_PORT || 19845;
startBridgeServer(port);

// Initialize MCP Server
const server = new Server(
  {
    name: 'autoflow-mcp',
    version: '2.0.0'
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
    name: 'autoflow_generate',
    description: 'Generate an AI video or image on Google Flow using Veo 3 or Nano Banana models via the Autoflow extension.',
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
          description: 'Aspect ratio: "16:9", "9:16", "1:1", "4:3", "3:4".',
          enum: ['16:9', '9:16', '1:1', '4:3', '3:4']
        },
        outputCount: {
          type: 'number',
          description: 'Number of outputs to generate (1, 2, or 4). Default is 1.',
          enum: [1, 2, 4]
        },
        videoOption: {
          type: 'string',
          description: 'Duration for video: "4s", "6s", "8s", "10s".',
          enum: ['4s', '6s', '8s', '10s']
        },
        characters: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of character names to automatically mention with @ in the prompt.'
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
    name: 'autoflow_cancel',
    description: 'Cancel any running or queued generation in Google Flow.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'Optional group ID of the job to cancel.'
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

        const extStatus = await sendRpc('STATUS', {}, { timeoutMs: 10000 });
        const info = getExtensionInfo();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'connected',
                  extensionConnected: true,
                  extension: info.info,
                  flow: extStatus
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

      case 'autoflow_generate': {
        const prompt = args.prompt;
        const isVideo = args.mode?.includes('Video') ||
          (!args.mode && (prompt.toLowerCase().includes('video') || prompt.toLowerCase().includes('shot') || prompt.toLowerCase().includes('cinematic')));

        const defaultMode = isVideo ? 'textToVideo' : 'textToImage';
        const defaultModel = isVideo ? 'Veo 3.1 - Fast' : 'Nano Banana 2';

        const params = {
          prompt,
          mode: args.mode || defaultMode,
          model: args.model || defaultModel,
          aspectRatio: args.aspectRatio || '16:9',
          outputCount: args.outputCount || 1,
          videoOption: args.videoOption || '4s',
          characters: args.characters || [],
          autoDownloadResourceQuality: args.autoDownloadResourceQuality || '1080',
          folderName: args.folderName || 'Autoflow_MCP'
        };

        const result = await sendRpc('GENERATE', params, {
          timeoutMs: 600000 // 10 minutes
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
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

      case 'autoflow_cancel': {
        const result = await sendRpc('CANCEL', { groupId: args.groupId }, { timeoutMs: 10000 });
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
