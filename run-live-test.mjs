import { startBridgeServer, isExtensionConnected, sendRpc, closeBridgeServer } from './src/bridge/ws-server.js';

console.log('====================================================');
console.log('🚀 RUNNING LIVE AUTOFLOW MCP TEST');
console.log('====================================================');

startBridgeServer(19845);

async function run() {
  console.log('Waiting for Autoflow extension connection on port 19845...');
  
  // Wait up to 15s for connection
  for (let i = 0; i < 30; i++) {
    if (isExtensionConnected()) break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (!isExtensionConnected()) {
    console.error('❌ Extension not connected yet. Please ensure Chrome is open.');
    process.exit(1);
  }

  console.log('✅ Extension connected!');
  console.log('\n--- Step 1: Checking Flow Tab ---');
  const status = await sendRpc('STATUS', {}, { timeoutMs: 5000 });
  console.log('Flow Status:', status);

  console.log('\n--- Step 2: Triggering Live Generation in Google Flow ---');
  console.log('Prompt: "A futuristic neon flying car hovering over a cyberpunk city, 8k photorealistic"');
  console.log('Mode: textToImage | Model: Nano Banana 2 | Ratio: 16:9');

  try {
    const genResult = await sendRpc('GENERATE', {
      prompt: 'A futuristic neon flying car hovering over a cyberpunk city, 8k photorealistic',
      mode: 'textToImage',
      model: 'Nano Banana 2',
      aspectRatio: '16:9',
      outputCount: 1,
      folderName: 'Autoflow_MCP_Live'
    }, {
      timeoutMs: 180000,
      onProgress: (prog) => {
        console.log(`[Progress Update] ${prog.percentage || 0}% - ${prog.status || 'generating'}`);
      }
    });

    console.log('\n🎉 SUCCESS! Generation Completed:', JSON.stringify(genResult, null, 2));
  } catch (err) {
    console.error('Error during generation:', err.message);
  } finally {
    closeBridgeServer();
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
