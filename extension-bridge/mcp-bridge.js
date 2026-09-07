// Autoflow MCP WebSocket Bridge
// Connects the extension's background service worker to the local Autoflow MCP server

const MCP_WS_PORT = 19845;
const MCP_WS_URL = `ws://127.0.0.1:${MCP_WS_PORT}`;
const RECONNECT_DELAY_MS = 5000;

let socket = null;
let isConnected = false;
let reconnectTimer = null;
let activeJobs = new Map(); // requestId -> { resolve, reject, groupId }

function log(...args) {
  console.log('[Autoflow MCP Bridge]', ...args);
}

function warn(...args) {
  console.warn('[Autoflow MCP Bridge]', ...args);
}

function error(...args) {
  console.error('[Autoflow MCP Bridge]', ...args);
}

// Find existing Google Flow tab or return null
async function getFlowTab() {
  try {
    const tabs = await chrome.tabs.query({
      url: ['*://flow.google.com/*', '*://labs.google/*']
    });
    const tab = tabs.find(t => t.url && (t.url.includes('flow.google.com') || t.url.includes('labs.google'))) || null;
    if (tab && tab.id) {
      // Memory-Saver Shield: prevent Chrome from freezing/discarding this tab
      try {
        chrome.tabs.update(tab.id, { autoDiscardable: false });
      } catch (e) {}
    }
    return tab;
  } catch (err) {
    warn('Error querying flow tabs:', err);
    return null;
  }
}

// Ensure Flow tab is open, protected from memory discarding, and ready
async function ensureFlowTab(options = {}) {
  const { makeActive = false } = options;
  let tab = await getFlowTab();

  if (tab && tab.id) {
    // Check if the tab's window is minimized. If minimized, un-minimize to normal state without stealing focus
    try {
      const win = await chrome.windows.get(tab.windowId);
      if (win.state === 'minimized') {
        await chrome.windows.update(tab.windowId, { state: 'normal', focused: false });
      }
    } catch (e) {}

    // Ensure tab cannot be discarded by Chrome Memory Saver
    try {
      await chrome.tabs.update(tab.id, { autoDiscardable: false, active: makeActive });
    } catch (e) {}

    return tab;
  }

  log('No active Flow tab found, opening https://flow.google.com/ in background...');
  tab = await chrome.tabs.create({
    url: 'https://flow.google.com/',
    active: makeActive
  });

  // Protect from discard immediately
  try {
    chrome.tabs.update(tab.id, { autoDiscardable: false });
  } catch (e) {}

  // Wait up to 15 seconds for navigation
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const current = await chrome.tabs.get(tab.id);
      if (current && current.status === 'complete') {
        await new Promise(r => setTimeout(r, 1000));
        return current;
      }
    } catch (e) {}
  }
  return tab;
}

// Verify content script readiness before dispatching commands
async function waitForContentScript(tabId, maxWaitMs = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'CHECK_FLOW_PAGE' }, (res) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(res);
        });
      });
      if (response && response.isFlowPage) {
        return true;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

// Send message to local MCP server
function sendToMcp(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

// Handle RPC calls from MCP Server
async function handleRpcRequest(data) {
  const { id, action, params = {} } = data;
  if (!id || !action) return;

  log(`Received RPC action: ${action} (id: ${id})`, params);

  try {
    switch (action) {
      case 'STATUS': {
        const flowTab = await getFlowTab();
        sendToMcp({
          id,
          success: true,
          connected: true,
          flowTabActive: !!flowTab,
          flowTabUrl: flowTab ? flowTab.url : null,
          version: chrome.runtime.getManifest().version
        });
        break;
      }

      case 'OPEN_FLOW': {
        const tab = await ensureFlowTab();
        sendToMcp({
          id,
          success: true,
          tabId: tab.id,
          url: tab.url
        });
        break;
      }

      case 'SCAN_CHARACTERS': {
        const tab = await ensureFlowTab();
        chrome.tabs.sendMessage(tab.id, { type: 'SCAN_CHARACTERS' }, (response) => {
          const err = chrome.runtime.lastError;
          if (err) {
            sendToMcp({ id, success: false, error: err.message, characters: [] });
          } else {
            sendToMcp({ id, success: true, characters: response?.characters || [] });
          }
        });
        break;
      }

      case 'CANCEL': {
        const tab = await getFlowTab();
        if (!tab || !tab.id) {
          sendToMcp({ id, success: false, error: 'No Flow tab found to cancel' });
          return;
        }
        chrome.tabs.sendMessage(tab.id, {
          type: 'CANCEL_PROMPT_GROUP',
          groupId: params.groupId
        }, (response) => {
          sendToMcp({ id, success: true, response });
        });
        break;
      }

      case 'GENERATE': {
        const tab = await ensureFlowTab({ makeActive: true });
        if (!tab || !tab.id) {
          sendToMcp({ id, success: false, error: 'Could not open or find Google Flow tab' });
          return;
        }

        // Ensure content script is mounted and active
        await waitForContentScript(tab.id, 6000);

        const groupId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload = {
          prompt: params.prompt || '',
          mode: params.mode || (params.prompt?.toLowerCase().includes('video') ? 'textToVideo' : 'textToImage'),
          model: params.model || (params.mode?.includes('Video') ? 'Veo 3.1 - Fast' : 'Nano Banana 2'),
          aspectRatio: params.aspectRatio || '16:9',
          outputCount: params.outputCount || 1,
          videoOption: params.videoOption || '4s',
          characters: params.characters || [],
          images: params.images || [],
          autoDownloadResourceQuality: params.autoDownloadResourceQuality || '1080',
          folderName: params.folderName || 'Autoflow_MCP',
          promptIndex: 0,
          groupId: groupId,
          isConcat: false
        };

        activeJobs.set(groupId, { id, startTime: Date.now() });

        // Dispatch AUTO_FILL_FLOW to content script
        chrome.tabs.sendMessage(tab.id, {
          type: 'AUTO_FILL_FLOW',
          payloads: [payload],
          groupId: groupId,
          concurrentPrompts: 1,
          promptDelaySecondsMin: 0,
          promptDelaySecondsMax: 0
        }, (res) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            warn(`Failed to dispatch AUTO_FILL_FLOW for job ${groupId}:`, lastErr);
            activeJobs.delete(groupId);
            sendToMcp({ id, success: false, error: lastErr.message });
          } else {
            log(`AUTO_FILL_FLOW dispatched successfully for job ${groupId}`);
          }
        });
        break;
      }

      default:
        sendToMcp({
          id,
          success: false,
          error: `Unknown action: ${action}`
        });
        break;
    }
  } catch (err) {
    error(`Error handling RPC action ${action}:`, err);
    sendToMcp({
      id,
      success: false,
      error: err.message || String(err)
    });
  }
}

// Forward progress and completion events from content script to MCP
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'VIDEO_GENERATION_PROGRESS') {
    const { data } = message;
    if (data && data.groupId && activeJobs.has(data.groupId)) {
      const job = activeJobs.get(data.groupId);
      sendToMcp({
        type: 'PROGRESS',
        id: job.id,
        percentage: data.percentage,
        status: data.status,
        prompt: data.prompt
      });
    }
  } else if (message.type === 'PROMPT_GROUP_STATUS') {
    const { data } = message;
    if (data && data.id && activeJobs.has(data.id)) {
      const job = activeJobs.get(data.id);
      if (data.status === 'completed' || data.status === 'error' || data.status === 'cancelled') {
        activeJobs.delete(data.id);
        sendToMcp({
          id: job.id,
          success: data.status === 'completed',
          status: data.status,
          results: data.results,
          totalCount: data.totalCount,
          processedCount: data.processedCount
        });
      } else {
        // In-progress status update
        sendToMcp({
          type: 'STATUS_UPDATE',
          id: job.id,
          status: data.status,
          processedCount: data.processedCount,
          totalCount: data.totalCount
        });
      }
    }
  }
});

// Initialize WebSocket connection to local MCP server
export function initMcpBridge() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    socket = new WebSocket(MCP_WS_URL);

    socket.onopen = () => {
      isConnected = true;
      log(`Connected to Autoflow MCP Server at ${MCP_WS_URL}`);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      sendToMcp({
        type: 'EXTENSION_HELLO',
        name: 'Autoflow Extension',
        version: chrome.runtime.getManifest().version,
        extensionId: chrome.runtime.id,
        timestamp: Date.now()
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRpcRequest(data);
      } catch (err) {
        warn('Invalid message received from MCP server:', event.data);
      }
    };

    socket.onclose = () => {
      if (isConnected) {
        log('Disconnected from Autoflow MCP Server. Will attempt reconnect...');
      }
      isConnected = false;
      scheduleReconnect();
    };

    socket.onerror = () => {
      // Quietly handle connection errors (server may not be running yet)
      isConnected = false;
    };
  } catch (err) {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initMcpBridge();
  }, RECONNECT_DELAY_MS);
}

// Keep-alive alarm and tab triggers for Manifest V3 lifecycle
try {
  chrome.alarms.create('autoflow_mcp_keepalive', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoflow_mcp_keepalive') {
      initMcpBridge();
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('flow.google.com') || tab.url.includes('labs.google'))) {
      initMcpBridge();
    }
  });
} catch (e) {
  // Ignore in environments where alarms/tabs might be restricted
}

// Start bridge
initMcpBridge();

