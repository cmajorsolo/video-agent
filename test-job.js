import 'dotenv/config';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { generateRemotionCode } from './generateVideo.js';
import { generateVoiceovers, downloadBackgroundMusic } from './generateAudio.js';
import fs from 'fs';
import path from 'path';

const testJob = {
  product: "Always Warm Coffee Mug",
  duration: "15s",
  audience: "Busy professionals",
  tone: "Fun and energetic",
  keyMessage: "Never drink cold coffee again",
  scenes: [
    {
      scene: 1,
      visual: "Person looking disappointed at cold coffee",
      text: "Tired of cold coffee?",
      duration: 5
    },
    {
      scene: 2,
      visual: "Close up of the sleek coffee mug with steam rising",
      text: "Meet the Always Warm Mug",
      duration: 5
    },
    {
      scene: 3,
      visual: "Happy professional smiling holding the mug at their desk",
      text: "Never drink cold coffee again!",
      duration: 5
    }
  ],
  requester: "test"
};

async function runTest() {
  console.log('=== Starting full pipeline test ===\n');

  try {
    // Step 1 — Claude generates custom Remotion code
    console.log('[1/5] Generating custom video code with Claude...');
    await generateRemotionCode(testJob);
    console.log('Code generated. Check remotion-project/src/PitchVideo.tsx to see what Claude wrote.\n');

    // Step 2 — Generate voiceovers
    console.log('[2/5] Generating voiceovers...');
    await generateVoiceovers(testJob.scenes);
    console.log('Voiceovers done.\n');

    // Step 3 — Background music
    console.log('[3/5] Getting background music...');
    await downloadBackgroundMusic(testJob.tone);
    console.log('Background music ready.\n');

    // Step 4 — Bundle and render
    console.log('[4/5] Bundling Remotion project...');
    const bundled = await bundle({
      entryPoint: path.resolve('./remotion-project/src/index.ts'),
      webpackOverride: (config) => config,
    });

    const composition = await selectComposition({
      serveUrl: bundled,
      id: 'PitchVideo',
      inputProps: testJob,
    });
    console.log(`Composition: ${composition.durationInFrames} frames at ${composition.fps}fps\n`);

    const outputPath = path.resolve('./test-output.mp4');
    console.log('[5/5] Rendering...');
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: testJob,
      concurrency: 1,
      x264Preset: 'ultrafast',
      onProgress: ({ progress }) => {
        process.stdout.write(`\r  Progress: ${Math.round(progress * 100)}%`);
      },
    });

    // Verify output
    console.log('\n');
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`Output: ${outputPath}`);
    console.log(`Size: ${sizeMB} MB`);
    console.log('\n=== Test passed! Open test-output.mp4 to preview ===');

  } catch (err) {
    console.error('\nTest failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runTest();