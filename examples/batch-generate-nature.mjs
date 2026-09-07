import { startBridgeServer, isExtensionConnected, closeBridgeServer } from './src/bridge/ws-server.js';
import { jobQueue } from './src/queue/mcp-queue.js';

const prompts = [
  "A serene misty morning in a dense pine forest, soft diffused sunlight filtering through the canopy, dew drops on lush green ferns, ethereal and tranquil atmosphere, 8k resolution, photorealistic, macro nature photography, soft focus background.",
  "A calm crystal-clear lake at pastel sunrise, soft pink and lavender sky reflecting on the mirror-like water, smooth stones on the shoreline, gentle mist rising from the surface, ultra-detailed, peaceful ambiance, cinematic lighting, 8k.",
  "Close-up of a delicate weeping willow branch dipping into a gently flowing stream, soft dappled sunlight, pastel green leaves, smooth water motion blur, peaceful nature scene, high-quality botanical photography, 8k.",
  "A hidden woodland waterfall cascading over mossy rocks, soft milky water effect, lush vibrant green foliage, gentle natural lighting, secluded and intimate nature scene, highly detailed, photorealistic masterpiece.",
  "A vast field of blooming lavender at golden hour, soft warm sunlight casting gentle shadows, a single majestic oak tree in the distance, vibrant purple hues, dreamy and romantic nature landscape, 8k, photorealistic.",
  "A macro shot of a delicate spider web covered in morning dew drops, glistening like diamonds in soft morning light, blurred green foliage background (bokeh), highly detailed, crisp focus, soft and gentle nature aesthetics.",
  "A snow-covered cabin in a quiet winter pine forest, soft gently falling snowflakes, warm glowing light from the windows contrasting with the cool blue snow, peaceful winter wonderland, photorealistic, 8k.",
  "A lush tropical rainforest canopy after a light rain, soft sunbeams piercing through the mist, vibrant green oversized leaves with water droplets, rich textures, serene and breathable atmosphere, high definition.",
  "A peaceful meadow filled with wild daisies, soft gentle breeze bending the flowers, fluffy white clouds in a pastel blue sky, bright but soft natural lighting, idyllic countryside scenery, 8k, photorealistic.",
  "A quiet sandy beach at dusk, soft rolling pastel waves, peach and periwinkle sky, smooth wet sand reflecting the sky, tranquil and meditative seascape, minimalist nature photography, 8k."
];

const PORT = 19845;
startBridgeServer(PORT);

async function run() {
  console.log('Waiting for Autoflow Extension to connect on ws://127.0.0.1:19845...');
  
  for (let i = 0; i < 40; i++) {
    if (isExtensionConnected()) break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (!isExtensionConnected()) {
    console.error('❌ Extension did not connect. Ensure Chrome is running.');
    process.exit(1);
  }

  console.log('✅ Connected! Enqueuing 10 Nature Photo Generation Jobs...\n');

  const jobs = [];
  for (const prompt of prompts) {
    const jobPromise = jobQueue.enqueue({
      prompt: prompt,
      mode: 'textToImage',
      model: 'Imagen 3', // Utilizing high quality image model
      aspectRatio: '16:9',
      outputCount: 1,
      folderName: 'Autoflow_Nature_Photos'
    });
    jobs.push(jobPromise);
  }

  console.log('All 10 jobs enqueued! The mcp-queue is now processing them sequentially in the background.\n');
  
  try {
    await Promise.allSettled(jobs);
    console.log('\n🎉 ALL 10 GENERATIONS COMPLETED AND SAVED!');
  } catch (err) {
    console.error('Some jobs failed:', err);
  } finally {
    closeBridgeServer();
    process.exit(0);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
