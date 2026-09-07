import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

const DEFAULT_PORT = 19845;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_TIMEOUT_MS = 600000; // 10 minutes default for video generation

let wss = null;
let activeSocket = null;
let extensionInfo = null;
const pendingRequests = new Map();

export function startBridgeServer(port = process.env.AUTOFLOW_PORT || DEFAULT_PORT) {
  if (wss) {
    return { wss, port };
  }

  const numericPort = Number(port);

  wss = new WebSocketServer({
    port: numericPort,
    host: DEFAULT_HOST
  });

  wss.on('listening', () => {
    // Note: Use stderr for logging so stdout remains clean for MCP stdio protocol
    console.error(`[Autoflow Bridge] WebSocket server listening on ws://${DEFAULT_HOST}:${numericPort}`);
  });

  wss.on('connection', (ws) => {
    console.error('[Autoflow Bridge] Chrome Extension connected');
    activeSocket = ws;

    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        handleExtensionMessage(message);
      } catch (err) {
        console.error('[Autoflow Bridge] Failed to parse message from extension:', err);
      }
    });

    ws.on('close', () => {
      console.error('[Autoflow Bridge] Chrome Extension disconnected');
      if (activeSocket === ws) {
        activeSocket = null;
        extensionInfo = null;
      }
    });

    ws.on('error', (err) => {
      console.error('[Autoflow Bridge] Socket error:', err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[Autoflow Bridge] Server error:', err.message);
  });

  return { wss, port: numericPort };
}

function handleExtensionMessage(message) {
  if (!message) return;

  // Extension Handshake
  if (message.type === 'EXTENSION_HELLO') {
    extensionInfo = {
      name: message.name,
      version: message.version,
      extensionId: message.extensionId,
      connectedAt: new Date().toISOString()
    };
    console.error(`[Autoflow Bridge] Extension identified: ${message.name} v${message.version}`);
    return;
  }

  // Progress streaming
  if (message.type === 'PROGRESS' || message.type === 'STATUS_UPDATE') {
    const pending = pendingRequests.get(message.id);
    if (pending && typeof pending.onProgress === 'function') {
      pending.onProgress(message);
    }
    return;
  }

  // Response to an RPC call
  if (message.id && pendingRequests.has(message.id)) {
    const { resolve, reject, timeoutTimer } = pendingRequests.get(message.id);
    clearTimeout(timeoutTimer);
    pendingRequests.delete(message.id);

    if (message.success) {
      resolve(message);
    } else {
      reject(new Error(message.error || 'Unknown error occurred in extension'));
    }
  }
}

export function isExtensionConnected() {
  return activeSocket !== null && activeSocket.readyState === WebSocket.OPEN;
}

export function getExtensionInfo() {
  return {
    connected: isExtensionConnected(),
    info: extensionInfo
  };
}

export function sendRpc(action, params = {}, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isExtensionConnected()) {
      return reject(new Error(
        'Autoflow Chrome Extension is not connected. Please ensure Google Chrome is open with the Autoflow extension active.'
      ));
    }

    const id = `mcp_req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

    const timeoutTimer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Autoflow request '${action}' timed out after ${timeoutMs / 1000}s`));
      }
    }, timeoutMs);

    pendingRequests.set(id, {
      resolve,
      reject,
      timeoutTimer,
      onProgress: options.onProgress
    });

    const payload = JSON.stringify({
      id,
      action,
      params
    });

    activeSocket.send(payload, (err) => {
      if (err) {
        clearTimeout(timeoutTimer);
        pendingRequests.delete(id);
        reject(new Error(`Failed to send command to extension: ${err.message}`));
      }
    });
  });
}

export function captureScreenshot(options = {}) {
  return sendRpc('SCREENSHOT', {}, { timeoutMs: options.timeoutMs || 15000 });
}

export function scanAssets(options = {}) {
  return sendRpc('SCAN_ASSETS', {}, { timeoutMs: options.timeoutMs || 15000 });
}

export function reloadTab(options = {}) {
  return sendRpc('RELOAD_TAB', {}, { timeoutMs: options.timeoutMs || 30000 });
}

export function healTab(options = {}) {
  return sendRpc('HEAL_TAB', {}, { timeoutMs: options.timeoutMs || 15000 });
}

export function closeBridgeServer() {
  if (wss) {
    wss.close();
    wss = null;
    activeSocket = null;
    extensionInfo = null;
  }
}

export async function downloadAndSaveAsset(url, outputPath) {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (url.startsWith('data:image/')) {
      const base64Data = url.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(outputPath, buffer);
      return { success: true, path: outputPath, bytes: buffer.length };
    } else if (url.startsWith('http')) {
      const resp = await fetch(url);
      if (resp.ok) {
        const buffer = Buffer.from(await resp.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        return { success: true, path: outputPath, bytes: buffer.length };
      }
      return { success: false, error: `HTTP ${resp.status}` };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Unsupported URL protocol' };
}

