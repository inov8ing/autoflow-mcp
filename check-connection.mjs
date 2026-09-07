import { startBridgeServer, isExtensionConnected, getExtensionInfo, sendRpc, closeBridgeServer } from './src/bridge/ws-server.js';

console.log('==============================================');
console.log('🤖 Autoflow MCP — Live Extension Listener');
console.log('==============================================');
console.log('Starting local WebSocket bridge on ws://127.0.0.1:19845...');

startBridgeServer(19845);

console.log('Waiting up to 30 seconds for Chrome Extension to connect...');
console.log('💡 Tip: Keep Chrome open — it will connect automatically!\n');

let elapsed = 0;
const interval = setInterval(async () => {
  elapsed += 1;
  if (isExtensionConnected()) {
    clearInterval(interval);
    console.log('🎉 SUCCESS: Autoflow Chrome Extension connected!');
    const info = getExtensionInfo();
    console.log('Extension Details:', JSON.stringify(info.info, null, 2));

    try {
      console.log('\nQuerying Google Flow tab status...');
      const status = await sendRpc('STATUS', {}, { timeoutMs: 5000 });
      console.log('Flow Status:', JSON.stringify(status, null, 2));
      if (!status.flowTabActive) {
        console.log('\n⚠️ No Google Flow tab active. Opening https://flow.google.com/...');
        await sendRpc('OPEN_FLOW', {}, { timeoutMs: 10000 });
        console.log('✓ Flow tab opened!');
      } else {
        console.log('✓ Google Flow tab is active and ready!');
      }
    } catch (err) {
      console.error('Error querying status:', err.message);
    }

    closeBridgeServer();
    process.exit(0);
  }

  if (elapsed >= 30) {
    clearInterval(interval);
    console.log('\n⏳ Extension has not connected yet.');
    console.log('To connect:');
    console.log('1. Open Google Chrome.');
    console.log('2. Navigate to chrome://extensions');
    console.log('3. Click the Refresh 🔄 icon on your "Autoflow" extension.');
    console.log('4. Run this check again: node check-connection.mjs\n');
    closeBridgeServer();
    process.exit(0);
  }
}, 1000);
