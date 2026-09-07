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
    }
  });

  // 5. Send RPC from Server side
  const response = await sendRpc('STATUS', {}, { timeoutMs: 3000 });
  console.log('✓ Received RPC response:', response);

  if (!response.success || !response.flowTabActive) {
    throw new Error('RPC response verification failed');
  }

  // 6. Cleanup
  client.close();
  closeBridgeServer();
  console.log('✓ All bridge tests passed successfully!');
}

runTest().catch((err) => {
  console.error('✗ Bridge test failed:', err);
  process.exit(1);
});
