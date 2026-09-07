import { startBridgeServer, isExtensionConnected, sendRpc, closeBridgeServer } from './src/bridge/ws-server.js';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('🌸 GENERATING CUTE KOREAN GIRL VIA AUTOFLOW MCP');
console.log('====================================================');

const PORT = 19845;
startBridgeServer(PORT);

const DOWNLOAD_DIR_USER = 'C:\\Users\\Rizwan\\Downloads\\Autoflow_Cute_Korean_Girl';
const DOWNLOAD_DIR_LOCAL = path.resolve('downloads');

if (!fs.existsSync(DOWNLOAD_DIR_USER)) fs.mkdirSync(DOWNLOAD_DIR_USER, { recursive: true });
if (!fs.existsSync(DOWNLOAD_DIR_LOCAL)) fs.mkdirSync(DOWNLOAD_DIR_LOCAL, { recursive: true });

async function saveAssetDirectly(url, filename) {
  try {
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetUser = path.join(DOWNLOAD_DIR_USER, cleanName);
    const targetLocal = path.join(DOWNLOAD_DIR_LOCAL, cleanName);

    if (url.startsWith('data:image/')) {
      const base64Data = url.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(targetUser, buffer);
      fs.writeFileSync(targetLocal, buffer);
      console.log(`💾 [Direct Save] Saved base64 image: ${targetUser}`);
      return targetUser;
    } else if (url.startsWith('http')) {
      const resp = await fetch(url);
      if (resp.ok) {
        const buffer = Buffer.from(await resp.arrayBuffer());
        fs.writeFileSync(targetUser, buffer);
        fs.writeFileSync(targetLocal, buffer);
        console.log(`💾 [Direct Save] Downloaded and saved: ${targetUser} (${buffer.length} bytes)`);
        return targetUser;
      } else {
        console.warn(`[Direct Save] HTTP fetch failed: ${resp.status}`);
      }
    }
  } catch (err) {
    console.error(`[Direct Save Error]`, err.message);
  }
  return null;
}

async function run() {
  console.log('Waiting for Autoflow Extension to connect on ws://127.0.0.1:19845...');

  for (let i = 0; i < 40; i++) {
    if (isExtensionConnected()) break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (!isExtensionConnected()) {
    console.error('❌ Extension did not connect within 20s.');
    process.exit(1);
  }

  console.log('✅ Autoflow Chrome Extension connected successfully!');

  // Check Flow tab
  const status = await sendRpc('STATUS', {}, { timeoutMs: 5000 });
  console.log('📍 Current Google Flow Tab Status:', status);

  const prompt = 'Close-up portrait of a breathtakingly cute 20-year-old Korean girl with sweet gentle smile, soft pastel oversized knit sweater, natural glass-skin makeup, delicate rosy cheeks, glossy peach lip tint, soft wispy bangs, candid warm golden hour café lighting, aesthetic bokeh background, ultra-detailed textures, 8k masterpiece, photorealistic';

  console.log('\n--- Dispatching Generation Job to Google Flow ---');
  console.log('Prompt:', prompt);
  console.log('Mode: textToImage | Model: Nano Banana 2 | Ratio: 9:16');

  try {
    const genResult = await sendRpc('GENERATE', {
      prompt: prompt,
      mode: 'textToImage',
      model: 'Nano Banana 2',
      aspectRatio: '9:16',
      outputCount: 1,
      folderName: 'Autoflow_Cute_Korean_Girl'
    }, {
      timeoutMs: 240000,
      onProgress: (prog) => {
        console.log(`[Flow Progress] ${prog.percentage || 0}% - ${prog.status || 'generating'} - "${prog.prompt ? prog.prompt.substring(0, 30) + '...' : ''}"`);
      }
    });

    console.log('\n🎉 GENERATION COMPLETED!');
    console.log('Result Data:', JSON.stringify(genResult, null, 2));

    // Double-Engine direct download verification
    if (genResult && Array.isArray(genResult.results)) {
      for (const res of genResult.results) {
        if (res.assetUrls && res.assetUrls.length > 0) {
          console.log(`\n📥 Downloading ${res.assetUrls.length} asset(s) directly via Node.js double-engine...`);
          for (let idx = 0; idx < res.assetUrls.length; idx++) {
            const assetUrl = res.assetUrls[idx];
            const fname = `cute_korean_girl_${Date.now()}_${idx + 1}.png`;
            await saveAssetDirectly(assetUrl, fname);
          }
        }
      }
    }

  } catch (err) {
    console.error('❌ Generation encountered error:', err.message);
  } finally {
    closeBridgeServer();
    console.log('Bridge server closed.');
  }
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
