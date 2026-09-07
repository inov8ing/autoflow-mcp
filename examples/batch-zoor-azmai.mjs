import { startBridgeServer, isExtensionConnected, closeBridgeServer } from '../src/bridge/ws-server.js';
import { jobQueue } from '../src/queue/mcp-queue.js';

const prompts = [
  "Create a 10-second ultra-realistic cinematic video in a crowded old South Asian roadside tea stall at golden-hour sunset. Two powerful older men, both around 65–70 years old, wearing traditional loose shalwar kameez, stand opposite each other beside a wooden tea counter. They look serious but playful. The first man suddenly places a massive metal kettle on the counter and challenges the second man to lift it with one hand. The second man smirks, grabs the handle, and effortlessly lifts it while the surrounding tea drinkers freeze in amazement. At second 6, the first man unexpectedly grabs an even larger sack of tea leaves and swings it onto his shoulder, escalating the competition. Steam from boiling tea, flying dust, handheld camera movement, expressive faces, realistic elderly skin detail, natural cloth physics, warm sunlight, shallow depth of field. End with both men staring each other down as the crowd begins cheering. No text, no subtitles, no logos.",
  "Create a 10-second dramatic wide-format cinematic video on a remote rocky mountain road at dawn, surrounded by towering cliffs, mist and pine trees. Two older men, approximately 65–70, dressed in rugged traditional mountain clothing, face each other beside an old wooden cart loaded with enormous stones. The first man challenges the second to pull the cart uphill using a thick rope. He braces his feet and pulls hard; gravel slides beneath his shoes. Just when it appears the cart is impossible to move, the second man calmly steps forward, wraps the rope around his waist, and drags the entire loaded cart several meters uphill, causing both men to laugh in disbelief. Camera starts low behind the wheels, then rapidly pushes toward their faces. Strong morning fog, realistic rock textures, breath visible in cold air, powerful natural lighting, subtle slow motion during the cart movement.",
  "Create a 10-second vibrant cinematic scene inside a lavish South Asian wedding hall, filled with colorful fabric decorations, chandeliers, musicians and dozens of guests. Two elderly men around 65–70 years old, wearing elegant traditional waistcoats and turbans, stand beside a giant decorated wooden table. They begin a playful arm-wrestling match while guests gather around. At first, both seem evenly matched. Suddenly, the table itself begins sliding across the polished floor from the force of their struggle. Everyone gasps. At second 7, one man notices the table moving and switches from arm wrestling to grabbing the entire edge of the table, pushing it back into place with surprising strength. The crowd erupts laughing and cheering. Dynamic circular camera movement around them, colorful bokeh lights, realistic fabric movement, energetic wedding atmosphere, cinematic depth of field.",
  "Create a 10-second visually spectacular winter scene on a frozen river surrounded by snow-covered mountains and pine forests. Two rugged older men, approximately 65–70, wearing heavy wool coats, fur-lined caps and traditional winter clothing, stand on thick ice beside a huge fallen tree branch. They challenge each other to drag it across the frozen surface. One man pulls with all his strength, his boots scraping loudly across the ice. The other man suddenly lets go, takes a running start, and slides across the ice while pulling the tree behind him, winning by momentum rather than brute force. The first man bursts into laughter. Wide aerial opening transitioning into a low tracking shot, visible condensation from their breath, detailed snow particles, realistic ice reflections, cold blue natural light, epic mountain scale.",
  "Create a 10-second hyper-realistic rural farmyard scene during harsh midday sunlight. Two older farmers in their late 60s, wearing dusty traditional work clothes, stand beside an old red tractor stuck deep in muddy ground. They jokingly compete over who is stronger. One man ties a thick rope to the tractor and begins pulling it by hand, sinking his boots into the mud. The tractor shifts slightly. The second man laughs, ties another rope around his waist, and pulls from a different angle. Suddenly, both men pull simultaneously and the tractor bursts free from the mud, spraying muddy water everywhere and covering both men. They stand stunned for half a second, then laugh. Camera positioned close to the muddy wheels, dramatic low angle, realistic mud particles, natural sunlight, strong physical effort, humorous final beat.",
  "Create a 10-second atmospheric cinematic video in the courtyard of an ancient stone fortress. Late afternoon sunlight streams between weathered arches. Two older men, around 70, wearing traditional historical-inspired clothing with textured shawls, stand beside a huge ancient stone block. They silently challenge each other. The first man squats down, grips the stone and manages to lift one edge. The second man studies him, then unexpectedly uses only one hand to rotate the enormous stone slightly, revealing that he has been waiting for the right angle. The first man's eyes widen in disbelief. Dust falls from the ancient walls as nearby birds fly away. Slow push-in camera, detailed stone textures, dramatic shadows, realistic body movement, subtle wind through clothing, epic historical atmosphere.",
  "Create a 10-second fast-paced cinematic scene in a chaotic open-air city market packed with fruit stands, bicycles, hanging fabrics and pedestrians. Two strong older men, around 65–70, wearing simple traditional clothing, are carrying separate oversized sacks of produce. They notice each other and instantly turn the moment into a spontaneous strength competition. One man hoists his sack onto one shoulder. The second man casually stacks two smaller sacks on top of each other and lifts both at once. The crowd begins reacting. At second 7, the first man suddenly grabs a third sack from a nearby vendor, lifts it, and starts walking away triumphantly — only for the second man to follow carrying an absurdly larger bundle. Handheld documentary-style camera, rapid whip-pan between reactions, realistic crowd motion, colorful market atmosphere, natural sunlight, comedic escalation, energetic ending.",
  "Create a 10-second cinematic coastal scene at an old fishing harbor just before sunrise. Fishing boats sway in the water, ropes creak, seabirds circle overhead and orange light reflects on the sea. Two elderly fishermen, around 65–70, wearing weathered jackets and traditional caps, stand beside a massive rusty boat anchor lying on the pier. One man grabs the chain and begins pulling the anchor toward himself. His muscles and clothing strain realistically. The second man watches calmly, then suddenly lifts the anchor completely off the ground, carrying it two steps as though it were a normal object. The first man stares in shock. A wave crashes against the harbor wall at the exact moment he realizes he has lost. Cinematic slow motion, wet wooden pier reflections, ocean mist, realistic rust and chain textures, golden sunrise backlight.",
  "Create a 10-second epic cinematic scene in a remote desert village at sunset, with orange dunes, mud-brick walls and a traditional stone well. Two older men around 65–70, wearing flowing desert robes and head coverings, compete to operate the heavy wooden mechanism used to draw water from the deep well. The first man pulls the thick rope with tremendous effort. Suddenly he stops and gestures confidently toward the second man. The second man grabs the rope and pulls an enormous water container upward so quickly that both men stumble backward. The container swings dramatically through the air and lands safely beside them. They exchange a proud look. Camera begins close on the rope fibers, then rapidly widens to reveal the massive desert landscape. Golden-hour haze, blowing sand, realistic fabric physics, dramatic silhouettes, high-detail environment.",
  "Create a 10-second high-impact cinematic finale on the rooftop of an old multi-story building overlooking a dense city at blue hour. Two elderly men, approximately 65–70 years old, stand opposite each other wearing traditional clothing, surrounded by water tanks, clotheslines and old brick walls. They begin a serious-looking strength contest using two enormous concrete blocks. Each man lifts his block simultaneously. The camera rapidly circles them as their clothing moves in the wind. At second 6, both men suddenly drop the blocks and look upward. A large water tank on wheels begins rolling toward them from the sloped rooftop. Instead of panicking, they both run toward it, grab it together, stop it inches from the edge, then look at each other proudly. End on a dramatic wide shot with the city lights turning on below. Strong cinematic lighting, realistic physics, rooftop wind, detailed facial expressions, natural elderly movement, suspense followed by an unexpected heroic twist, no text, no logos."
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

  console.log('✅ Connected! Enqueuing 10 "Zoor Azmai" Video Generation Jobs...\n');

  const jobs = [];
  for (const prompt of prompts) {
    const jobPromise = jobQueue.enqueue({
      prompt: prompt,
      mode: 'textToVideo',
      model: 'Omni Flash', // Using Omni Flash as requested
      videoOption: '10s',  // 10 second clip
      aspectRatio: '9:16', // Vertical aspect ratio requested
      outputCount: 1,
      folderName: 'Autoflow_Zoor_Azmai'
    });
    jobs.push(jobPromise);
  }

  console.log('All 10 video jobs enqueued! The mcp-queue is now processing them sequentially in the background.\n');
  
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
