import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const audioDir = path.resolve('./remotion-project/public/audio');

export async function generateVoiceovers(scenes) {
  fs.mkdirSync(audioDir, { recursive: true });

  for (const scene of scenes) {
    const outputPath = `${audioDir}/scene-${scene.scene}.mp3`;

    // Skip if already exists and is valid (more than 1KB)
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 1024) {
        console.log(`  Scene ${scene.scene} voiceover already exists, skipping.`);
        continue;
      }
      // File exists but is too small — delete and regenerate
      fs.unlinkSync(outputPath);
      console.log(`  Scene ${scene.scene} voiceover was invalid, regenerating...`);
    }

    console.log(`  Generating voiceover for scene ${scene.scene}: "${scene.text}"`);
    await generateSpeech(scene.text, outputPath);
  }

  console.log('  All voiceovers ready.');
}

async function generateSpeech(text, outputPath) {
  const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn('  No ELEVENLABS_API_KEY — creating silent placeholder.');
    createSilentAudio(outputPath, 5);
    return;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!response.ok) {
    console.warn(`  ElevenLabs failed: ${await response.text()}`);
    createSilentAudio(outputPath, 5);
    return;
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  console.log(`  Saved: ${outputPath}`);
}

function createSilentAudio(outputPath, durationSeconds) {
  try {
    execSync(
      `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSeconds} -q:a 9 -acodec libmp3lame "${outputPath}" -y`,
      { stdio: 'pipe' }
    );
    console.log(`  Created silent placeholder: ${outputPath}`);
  } catch (err) {
    console.warn('  ffmpeg not available, writing empty file.');
    fs.writeFileSync(outputPath, Buffer.alloc(0));
  }
}

export async function downloadBackgroundMusic(tone) {
  fs.mkdirSync(audioDir, { recursive: true });
  const outputPath = `${audioDir}/background.mp3`;

  // Skip if already exists and is valid
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 1024) {
      console.log('  Background music already exists, skipping.');
      return;
    }
    fs.unlinkSync(outputPath);
  }

  if (!process.env.PIXABAY_API_KEY) {
    console.warn('  No PIXABAY_API_KEY — creating silent background placeholder.');
    createSilentAudio(outputPath, 60);
    return;
  }

  const query = tone.toLowerCase().includes('fun') ? 'upbeat'
    : tone.toLowerCase().includes('professional') ? 'corporate'
    : tone.toLowerCase().includes('emotional') ? 'inspiring'
    : 'background';

  try {
    const res = await fetch(
      `https://pixabay.com/api/music/?key=${process.env.PIXABAY_API_KEY}&q=${query}&per_page=3`
    );
    const data = await res.json();
    const track = data.hits?.[0];

    if (track?.audio) {
      const audioRes = await fetch(track.audio);
      const buffer = await audioRes.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log(`  Background music saved: ${track.title}`);
    } else {
      console.warn('  No music found on Pixabay, creating silent placeholder.');
      createSilentAudio(outputPath, 60);
    }
  } catch (err) {
    console.warn('  Background music download failed:', err.message);
    createSilentAudio(outputPath, 60);
  }
}