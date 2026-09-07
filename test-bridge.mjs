import { startBridgeServer, isExtensionConnected, sendRpc, closeBridgeServer } from './src/bridge/ws-server.js';
import { WebSocket } from 'ws';

async function runTest() {
  console.log('--- Testing Autoflow MCP WebSocket Bridge ---');

  // 1. Start Bridge Server on test port 19846
  const TEST_PORT = 19846;
  startBridgeServer(TEST_PORT);
  console.log('✓ Bridge server started on port', TEST_PORT);

  // 2. Simulate Extension Client Connection
  const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);

  await new Promise((resolve, reject) => {
    client.on('open', resolve);
    client.on('error', reject);
  });
  console.log('✓ Mock extension client connected');

  // 3. Send Handshake
  client.send(JSON.stringify({
    type: 'EXTENSION_HELLO',
    name: 'Mock Autoflow Extension',
    version: '1.2.0.15',
    extensionId: 'mock-ext-id'
  }));

  // Wait a tick for server to record handshake
  await new Promise(r => setTimeout(r, 100));
  if (!isExtensionConnected()) {
    throw new Error('isExtensionConnected() returned false after handshake');
  }
  console.log('✓ Handshake recorded, extension is connected');

  // 4. Mock Extension RPC Listener
  client.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    console.log('✓ Mock extension received RPC action:', msg.action, 'id:', msg.id);
    if (msg.action === 'STATUS') {
      client.send(JSON.stringify({
        id: msg.id,
        success: true,
        flowTabActive: true,
        flowTabUrl: 'https://flow.google.com/project/mock-uuid',
        version: '1.2.0.15'
      }));
    } else if (msg.action === 'SCREENSHOT') {
      client.send(JSON.stringify({
        id: msg.id,
        success: true,
        mimeType: 'image/jpeg',
        data: 'fake_base64_jpeg_data',
        url: 'https://flow.google.com/project/mock-uuid',
        title: 'Google Flow Project'
      }));
    } else if (msg.action === 'SCAN_ASSETS') {
      client.send(JSON.stringify({
        id: msg.id,
        success: true,
        total: 2,
        assets: [
          { type: 'video', url: 'https://example.com/video1.mp4', duration: 4 },
          { type: 'image', url: 'https://example.com/image1.jpg', width: 1024, height: 1024 }
        ]
      }));
    } else if (msg.action === 'HEAL_TAB') {
      client.send(JSON.stringify({
        id: msg.id,
        success: true,
        modalDismissed: true,
        detectedError: 'Quota warning'
      }));
    }
  });

  // 5. Send RPC from Server side
  const response = await sendRpc('STATUS', {}, { timeoutMs: 3000 });
  console.log('✓ Received STATUS response:', response.flowTabActive);

  const screenshot = await sendRpc('SCREENSHOT', {}, { timeoutMs: 3000 });
  console.log('✓ Received SCREENSHOT response (length):', screenshot.data.length);

  const assets = await sendRpc('SCAN_ASSETS', {}, { timeoutMs: 3000 });
  console.log('✓ Received SCAN_ASSETS response (count):', assets.total);

  const heal = await sendRpc('HEAL_TAB', {}, { timeoutMs: 3000 });
  console.log('✓ Received HEAL_TAB response (dismissed):', heal.modalDismissed);

  // 6. Cleanup
  client.close();
  closeBridgeServer();
  console.log('✓ All bridge and healing tests passed successfully!');
}

runTest().catch((err) => {
  console.error('✗ Bridge test failed:', err);
  process.exit(1);
});
