import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { v2 as cloudinary } from 'cloudinary';
import { generateRemotionCode } from './generateVideo.js';
import { generateVoiceovers, downloadBackgroundMusic } from './generateAudio.js';

const chromiumPath = process.env.CHROME_EXECUTABLE_PATH || null;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => res.send('Video agent running'));

app.post('/job', async (req, res) => {
  res.sendStatus(200);
  const job = req.body;
  console.log('Received job:', JSON.stringify(job, null, 2));
  processVideoJob(job).catch(async err => {
    console.error('Job failed:', err);
    await notifyWhatsApp(job.requester, `Sorry, something went wrong: ${err.message}`);
  });
});

async function processVideoJob(job) {
  const { product, requester } = job;
  console.log(`\n=== Starting job for: ${product} ===`);

  // 1 — Generate custom Remotion code for this job
  console.log('[1/5] Generating custom video code with Claude...');
  await generateRemotionCode(job);

  // 2 — Generate voiceovers for each scene
  console.log('[2/5] Generating voiceovers...');
  await generateVoiceovers(job.scenes);

  // 3 — Download background music
  console.log('[3/5] Getting background music...');
  await downloadBackgroundMusic(job.tone);

  // 4 — Render with Remotion
  console.log('[4/5] Rendering video...');
  const bundled = await bundle({
    entryPoint: path.resolve('./remotion-project/src/index.ts'),
    webpackOverride: (config) => config,
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'PitchVideo',
    inputProps: job,
    browserExecutable: process.env.CHROME_EXECUTABLE_PATH || null,
  });

  const outputPath = `/tmp/video-${Date.now()}.mp4`;
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: job,
    browserExecutable: process.env.CHROME_EXECUTABLE_PATH || null,
    concurrency: 1,
    x264Preset: 'ultrafast',
    chromiumOptions: { gl: 'angle' },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  Rendering: ${Math.round(progress * 100)}%`);
    },
  });
  console.log('\nRender complete!');

  // 5 — Upload and notify
  console.log('[5/5] Uploading and notifying...');
  const result = await cloudinary.uploader.upload(outputPath, {
    resource_type: 'video',
    folder: 'pitch-videos',
    public_id: `video-${Date.now()}`,
  });
  fs.unlinkSync(outputPath);

  await sendWhatsAppVideo(requester, result.secure_url, product);
  console.log(`=== Done! Video sent to ${requester} ===\n`);
}

  // In selectComposition:
  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'PitchVideo',
    inputProps: job,
    browserExecutable: chromiumPath,
    chromiumOptions: {
        disableWebSecurity: false,
        gl: 'angle',
    },
  });

  const outputPath = `/tmp/video-${Date.now()}.mp4`;
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: job,
    browserExecutable: chromiumPath,
    concurrency: 1,
    timeoutInMilliseconds: 120000,
    chromiumOptions: {
        disableWebSecurity: false,
        gl: 'angle',          // change from swangle to angle
    },
    x264Preset: 'ultrafast',
    onProgress: ({ progress }) => {
        console.log(`Rendering: ${Math.round(progress * 100)}%`);
    },
  });
  console.log('Video rendered!');

  console.log('Uploading...');
  const result = await cloudinary.uploader.upload(outputPath, {
    resource_type: 'video',
    folder: 'pitch-videos',
    public_id: `video-${Date.now()}`,
  });
  console.log('Uploaded:', result.secure_url);

  fs.unlinkSync(outputPath);

  await sendWhatsAppVideo(requester, result.secure_url, product);
  console.log('Done! Notified user.');
}

async function sendWhatsAppVideo(to, videoUrl, product) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`, {
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
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('WhatsApp send error:', err);
    await notifyWhatsApp(to, `Your video is ready: ${videoUrl}`);
  }
}

async function notifyWhatsApp(to, message) {
  await fetch(`https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`, {
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
  });
}

process.on('uncaughtException', err => console.error('UNCAUGHT:', err));
process.on('unhandledRejection', err => console.error('UNHANDLED:', err));

app.listen(PORT, () => console.log(`Video agent listening on port ${PORT}`));