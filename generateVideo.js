import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(job) {
  const { product, duration, tone, keyMessage, scenes } = job;
  const sceneCount = scenes.length;

  return `You are an expert Remotion (React video) developer.
Generate a complete PitchVideo.tsx component for this product video.

Job details:
- Product: ${product}
- Duration: ${duration}
- Tone: ${tone}
- Key message: ${keyMessage}
- Scenes: ${JSON.stringify(scenes, null, 2)}

STRICT SYNTAX RULES:

1. ALL transform animations must use template literals:
   CORRECT: style={{ transform: \`translateY(\${interpolate(frame,[0,15],[-50,0])}px)\` }}
   CORRECT: style={{ transform: \`scale(\${spring({frame,fps,config:{damping:12}})})\` }}
   WRONG:   style={{ transform: 'translateY(-50px)' }}
   WRONG:   transform: scale(1.2)

2. opacity must be a number:
   CORRECT: style={{ opacity: interpolate(frame,[0,15],[0,1],{extrapolateRight:'clamp'}) }}

3. fontSize must be a string with units:
   CORRECT: style={{ fontSize: '48px' }}
   WRONG:   style={{ fontSize: 48 }}

4. Scene switching — use this exact pattern:
   const framesPerScene = Math.floor(durationInFrames / ${sceneCount});
   const sceneIndex = Math.min(Math.floor(frame / framesPerScene), ${sceneCount - 1});
   const sceneFrame = frame - sceneIndex * framesPerScene;

5. AUDIO — this is critical. You MUST include these EXACTLY:

   At the top of your component body (before the return statement), add:
   const audioStartFrame = sceneIndex * framesPerScene;

   Inside the return JSX, add background music and per-scene voiceovers like this:
   <AbsoluteFill>
     <Audio src={staticFile('audio/background.mp3')} volume={0.15} />
     {scenes.map((scene, i) => (
       <Sequence key={i} from={i * framesPerScene} durationInFrames={framesPerScene}>
         <Audio src={staticFile(\`audio/scene-\${i + 1}.mp3\`)} />
       </Sequence>
     ))}
     {/* rest of your visual JSX */}
   </AbsoluteFill>

6. Imports must include Audio, staticFile, Sequence:
   import { AbsoluteFill, useCurrentFrame, useVideoConfig,
            interpolate, spring, Audio, staticFile, Sequence } from 'remotion';
   import React from 'react';

7. Component signature:
   interface Scene { scene: number; visual: string; text: string; duration: number; }
   interface Props { product: string; duration: string; audience: string;
                     tone: string; keyMessage: string; scenes: Scene[]; }
   export const PitchVideo: React.FC<Props> = ({ product, keyMessage, scenes }) => {

8. Make visuals match scene descriptions creatively:
   - Use colors, emoji, and animated shapes to represent the scene visually
   - Scene "${scenes[0]?.visual}" should look like what it describes
   - Match the tone "${tone}" with appropriate color palette and animation style

RETURN ONLY TYPESCRIPT CODE. No markdown, no backtick fences, no explanation.
First line must be: import React from 'react';`;
}

export async function generateRemotionCode(job) {
  let code = '';
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`  Generating code (attempt ${attempts}/${maxAttempts})...`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildPrompt(job) }],
    });

    let generated = response.content[0].text.trim();

    // Strip markdown fences if Claude added them
    generated = generated
      .replace(/^```typescript\n?/, '')
      .replace(/^```tsx?\n?/, '')
      .replace(/```$/, '')
      .trim();

    // Validation checks
    const hasBareTransform = generated.match(/transform:\s+(?!['"`])[a-zA-Z]+\(/);
    const hasStaticTransform = generated.match(/transform:\s+'[a-zA-Z]+\(/);
    const hasAudioTag = generated.includes('<Audio');
    const hasStaticFile = generated.includes('staticFile');
    const hasSequence = generated.includes('<Sequence');

    const issues = [];
    if (hasBareTransform || hasStaticTransform) issues.push('invalid CSS transform syntax');
    if (!hasAudioTag) issues.push('missing <Audio> tags');
    if (!hasStaticFile) issues.push('missing staticFile()');
    if (!hasSequence) issues.push('missing <Sequence> for voiceovers');

    if (issues.length === 0) {
      console.log('  Code validation passed.');
      code = generated;
      break;
    }

    console.warn(`  Issues found: ${issues.join(', ')} — retrying...`);

    if (attempts === maxAttempts) {
      console.warn('  Max attempts reached — writing code anyway.');
      code = generated;
    }
  }

  const outputPath = path.resolve('./remotion-project/src/PitchVideo.tsx');
  fs.writeFileSync(outputPath, code);
  console.log('  PitchVideo.tsx written.');

  // Print the audio section so you can verify it looks right
  const audioLines = code.split('\n').filter(l =>
    l.includes('Audio') || l.includes('staticFile') || l.includes('Sequence')
  );
  console.log('  Audio lines in generated code:');
  audioLines.forEach(l => console.log('   ', l.trim()));

  return code;
}