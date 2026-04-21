import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { v2 as cloudinary } from 'cloudinary';
import { generateRemotionCode } from './generateVideo.js';
import { generateVoiceovers, downloadBackgroundMusic } from './generateAudio.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4000;

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('Video agent running'));

// ── Job receiver ──────────────────────────────────────────────────────────────
app.post('/job', async (req, res) => {
  res.sendStatus(200);
  const job = req.body;
  console.log('Received job:', JSON.stringify(job, null, 2));
  processVideoJob(job).catch(async err => {
    console.error('Job failed:', err);
    await notifyWhatsApp(job.requester, `Sorry, something went wrong: ${err.message}`);
  });
});

// ── Main pipeline ─────────────────────────────────────────────────────────────
async function processVideoJob(job) {
  const { product, requester } = job;
  console.log(`\n=== Starting job for: ${product} ===`);

  // Step 1 — Generate custom Remotion code with Claude
  console.log('[1/5] Generating custom video code with Claude...');
  await generateRemotionCode(job);

  // Step 2 — Generate voiceovers
  console.log('[2/5] Generating voiceovers...');
  await generateVoiceovers(job.scenes);

  // Step 3 — Background music
  console.log('[3/5] Getting background music...');
  await downloadBackgroundMusic(job.tone);

  // Step 4 — Bundle and render
  console.log('[4/5] Bundling Remotion project...');
  const bundled = await bundle({
    entryPoint: path.resolve('./remotion-project/src/index.ts'),
    webpackOverride: (config) => config,
  });

  console.log('Selecting composition...');
  const chromiumPath = process.env.CHROME_EXECUTABLE_PATH || null;
  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'PitchVideo',
    inputProps: job,
    browserExecutable: chromiumPath,
    chromiumOptions: { gl: 'angle' },
  });
  console.log(`Composition: ${composition.durationInFrames} frames at ${composition.fps}fps`);

  const outputPath = `/tmp/video-${Date.now()}.mp4`;
  console.log('Rendering...');
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: job,
    browserExecutable: chromiumPath,
    concurrency: 1,
    x264Preset: 'ultrafast',
    chromiumOptions: { gl: 'angle' },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  Rendering: ${Math.round(progress * 100)}%`);
    },
  });
  console.log('\nRender complete!');

  // Step 5 — Upload and notify
  console.log('[5/5] Uploading to Cloudinary...');
  const result = await cloudinary.uploader.upload(outputPath, {
    resource_type: 'video',
    folder: 'pitch-videos',
    public_id: `video-${Date.now()}`,
  });
  console.log('Uploaded:', result.secure_url);

  fs.unlinkSync(outputPath);

  await sendWhatsAppVideo(requester, result.secure_url, product);
  console.log(`=== Done! Video sent to ${requester} ===\n`);
}

// ── Send video via WhatsApp ───────────────────────────────────────────────────
async function sendWhatsAppVideo(to, videoUrl, product) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'video',
        video: {
          link: videoUrl,
          caption: `Here is your pitch video for ${product}!`,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('WhatsApp video send error:', err);
    await notifyWhatsApp(to, `Your video is ready! Watch it here: ${videoUrl}`);
  }
}

// ── Send text message via WhatsApp ────────────────────────────────────────────
async function notifyWhatsApp(to, message) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    }
  );
  if (!res.ok) console.error('WhatsApp notify error:', await res.text());
}

// ── Error handlers ────────────────────────────────────────────────────────────
process.on('uncaughtException', err => console.error('UNCAUGHT:', err));
process.on('unhandledRejection', err => console.error('UNHANDLED:', err));

app.listen(PORT, () => console.log(`Video agent listening on port ${PORT}`));