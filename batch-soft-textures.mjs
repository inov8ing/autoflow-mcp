import { startBridgeServer, isExtensionConnected, sendRpc, closeBridgeServer } from './src/bridge/ws-server.js';
import { jobQueue } from './src/queue/mcp-queue.js';

console.log('===============================================================');
console.log('🎨 AUTOFLOW MCP — BATCH 10 CONSISTENT SOFT-TEXTURED GENERATION');
console.log('===============================================================');

// Curated 10 Consistent, High-Quality, Soft-Textured Prompts
const PROMPTS = [
  {
    id: 1,
    title: 'Minimalist Ceramic Vase & Bouclé Drapery',
    prompt: 'Sculptural organic ceramic vase with tactile unglazed surface resting on soft cream bouclé fabric, subtle shadows, warm diffused morning sunlight, 85mm lens, shallow depth of field, high-end Kinfolk aesthetic, soft texture, 8k photorealistic'
  },
  {
    id: 2,
    title: 'Cozy Miniature Clay Character with Wool Scarf',
    prompt: 'Adorable handcrafted miniature clay character with warm felt scarf reading a book on a fluffy knitted armchair, soft tactile stop-motion aesthetic, cozy ambient warm lighting, macro photography, 4k detail, clean pastel composition'
  },
  {
    id: 3,
    title: 'Floating Cashmere Cloud Cushion',
    prompt: 'Soft brushed cashmere cloud cushion floating gently in air, tactile ribbed knit texture, delicate cotton fibers catching golden morning sunbeams, muted oatmeal and terracotta palette, elegant minimalist design, photorealistic 8k'
  },
  {
    id: 4,
    title: 'Organic Porcelain Tea Cup with Gentle Steam',
    prompt: 'Matte off-white ceramic cup of herbal tea resting on a slab of honed travertine stone, soft tactile linen coaster, delicate curling steam, muted sage and cream tones, soft natural rim light, architectural digest still life'
  },
  {
    id: 5,
    title: 'Sculpted Velvety Terracotta Flower',
    prompt: 'Single sculpted botanical flower made of velvety terracotta and blush matte clay, smooth curves, organic tactile petals with subtle subsurface scattering, warm studio background, soft shadows, macro photography'
  },
  {
    id: 6,
    title: 'Tactile Sandstone & Plaster Archway',
    prompt: 'Minimalist architectural alcove with soft textured plaster walls and smooth beige sandstone steps, gentle light gradients, calming serene aesthetic, tactile organic surfaces, contemporary scandinavian gallery, 8k resolution'
  },
  {
    id: 7,
    title: 'Fluffy Woven Wool Throw in Sunlit Nook',
    prompt: 'Draped thick woven wool throw blanket cascading over a light oak minimalist chair, soft tactile fringe details, gentle dust motes dancing in warm sunbeam, cozy quiet interior, high-end interior photography, soft tones'
  },
  {
    id: 8,
    title: 'Matte Ceramic Teapot on Raw Travertine',
    prompt: 'Modern matte stoneware teapot with bamboo handle resting on warm brushed travertine stone, delicate beige and almond tones, tactile speckled ceramic glaze, soft diffused lighting, peaceful wabi-sabi still life'
  },
  {
    id: 9,
    title: 'Tactile Ribbed Knit & Felt Ribbon Sculpture',
    prompt: 'Abstract geometric loop sculpture crafted from warm cream felt and ribbed ribbed knit fabric, tactile micro-textures, soft ambient illumination, clean neutral studio background, contemporary textile art, 8k editorial shot'
  },
  {
    id: 10,
    title: 'Cozy Claymation Studio Corner with Plants',
    prompt: 'Tactile miniature claymation interior vignette with a tiny potted succulent in terracotta pot, handmade wooden stool, soft felt rug, charming stop-motion texture, gentle cinematic glow, Wes Anderson pastel tones'
  }
];

startBridgeServer(19845);

async function runBatch() {
  console.log('Waiting for Autoflow Extension to connect on port 19845...');
  for (let i = 0; i < 30; i++) {
    if (isExtensionConnected()) break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (!isExtensionConnected()) {
    console.error('❌ Extension not connected. Please ensure Google Chrome is open with Autoflow active.');
    process.exit(1);
  }

  console.log('✅ Extension connected! Enqueueing 10 consistent soft-textured jobs into sequential queue...\n');

  const promises = PROMPTS.map((item, index) => {
    return jobQueue.enqueue({
      prompt: item.prompt,
      mode: 'textToImage',
      model: 'Nano Banana 2',
      aspectRatio: '16:9',
      outputCount: 1,
      folderName: 'Autoflow_Soft_Textures'
    }).then(res => {
      console.log(`\n🎉 [${index + 1}/10 COMPLETED] ${item.title}`);
      return res;
    }).catch(err => {
      console.error(`\n❌ [${index + 1}/10 FAILED] ${item.title}:`, err.message);
      return null;
    });
  });

  console.log(`All 10 jobs enqueued into McpJobQueue. Processing sequentially (1-by-1)...`);
  console.log(`Files will automatically download to folder: Downloads/Autoflow_Soft_Textures\n`);

  await Promise.all(promises);
  console.log('\n===============================================================');
  console.log('🏆 ALL 10 CONSISTENT SOFT-TEXTURED IMAGES GENERATED & DOWNLOADED!');
  console.log('===============================================================');
  closeBridgeServer();
}

runBatch().catch(err => {
  console.error('Fatal batch error:', err);
  process.exit(1);
});
