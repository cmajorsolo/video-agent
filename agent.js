import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { v2 as cloudinary } from 'cloudinary';

process.env.CHROME_EXECUTABLE_PATH = '/run/current-system/sw/bin/chromium';

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
  console.log(`Rendering video for: ${product}`);

  // Bundle the Remotion project
  const bundled = await bundle({
    entryPoint: path.resolve('./src/index.ts'),
    webpackOverride: (config) => config,
  });

  // Select the composition
  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'PitchVideo',
    inputProps: job,
  });

  // Render the video
  const outputPath = `/tmp/video-${Date.now()}.mp4`;
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: job,
  });
  console.log('Video rendered!');

  // Upload to Cloudinary
  console.log('Uploading...');
  const result = await cloudinary.uploader.upload(outputPath, {
    resource_type: 'video',
    folder: 'pitch-videos',
    public_id: `video-${Date.now()}`,
  });
  console.log('Uploaded:', result.secure_url);

  // Clean up temp file
  fs.unlinkSync(outputPath);

  // Send video to WhatsApp
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