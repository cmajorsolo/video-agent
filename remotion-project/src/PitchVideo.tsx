import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, staticFile, Sequence } from 'remotion';

interface Scene {
  scene: number;
  visual: string;
  text: string;
  duration: number;
}

interface Props {
  product: string;
  duration: string;
  audience: string;
  tone: string;
  keyMessage: string;
  scenes: Scene[];
}

export const PitchVideo: React.FC<Props> = ({ product, keyMessage, scenes }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const framesPerScene = Math.floor(durationInFrames / 3);
  const sceneIndex = Math.min(Math.floor(frame / framesPerScene), 2);
  const sceneFrame = frame - sceneIndex * framesPerScene;
  const audioStartFrame = sceneIndex * framesPerScene;

  const fadeIn = interpolate(sceneFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const textSlide = interpolate(sceneFrame, [0, 15], [50, 0], { extrapolateRight: 'clamp' });
  const scaleSpring = spring({ frame: sceneFrame, fps, config: { damping: 12 } });

  const sceneColors = ['#4A90E2', '#FF6B6B', '#4ECDC4'];
  const backgroundColor = sceneColors[sceneIndex];

  return (
    <AbsoluteFill>
      <Audio src={staticFile('audio/background.mp3')} volume={0.15} />
      {scenes.map((scene, i) => (
        <Sequence key={i} from={i * framesPerScene} durationInFrames={framesPerScene}>
          <Audio src={staticFile(`audio/scene-${i + 1}.mp3`)} />
        </Sequence>
      ))}
      
      <AbsoluteFill style={{ backgroundColor, transition: 'background-color 0.5s ease' }}>
        {sceneIndex === 0 && (
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: fadeIn }}>
            <div style={{ fontSize: '120px', transform: `scale(${scaleSpring}) rotate(${interpolate(sceneFrame, [0, 30], [0, -10], { extrapolateRight: 'clamp' })}deg)` }}>
              😞
            </div>
            <div style={{ fontSize: '180px', marginTop: '20px', transform: `scale(${interpolate(sceneFrame, [10, 25], [0.5, 1], { extrapolateRight: 'clamp' })})` }}>
              ☕
            </div>
            <div style={{
              position: 'absolute',
              top: '60%',
              fontSize: '24px',
              color: '#fff',
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '10px 20px',
              borderRadius: '10px',
              transform: `translateY(${textSlide}px)`
            }}>
              ICE COLD ❄️
            </div>
          </AbsoluteFill>
        )}

        {sceneIndex === 1 && (
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: fadeIn }}>
            <div style={{
              position: 'relative',
              width: '300px',
              height: '350px',
              backgroundColor: '#fff',
              borderRadius: '20px 20px 40px 40px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              transform: `scale(${scaleSpring})`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{
                width: '200px',
                height: '250px',
                backgroundColor: '#2C3E50',
                borderRadius: '15px 15px 30px 30px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  transform: `translateX(-50%) translateY(${interpolate(sceneFrame, [0, 30], [0, -20], { extrapolateRight: 'clamp' })}px)`,
                  fontSize: '60px',
                  opacity: interpolate(sceneFrame, [0, 15, 30], [0.3, 1, 0.3])
                }}>
                  ♨️
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '40px',
                  width: '100%',
                  height: '60%',
                  backgroundColor: '#8B4513',
                  borderRadius: '10px'
                }}>
                </div>
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-10px',
                right: '-10px',
                width: '80px',
                height: '80px',
                backgroundColor: '#FFD700',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 5px 20px rgba(255,215,0,0.5)',
                transform: `rotate(${interpolate(sceneFrame, [0, 30], [0, 360])}deg)`
              }}>
                ⚡
              </div>
            </div>
          </AbsoluteFill>
        )}

        {sceneIndex === 2 && (
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: fadeIn }}>
            <div style={{ fontSize: '140px', transform: `scale(${scaleSpring})` }}>
              😊
            </div>
            <div style={{
              fontSize: '100px',
              marginTop: '20px',
              transform: `translateY(${interpolate(sceneFrame, [5, 20], [30, 0], { extrapolateRight: 'clamp' })}px) rotate(${interpolate(sceneFrame, [0, 30], [-5, 5])}deg)`
            }}>
              ☕
            </div>
            <div style={{
              position: 'absolute',
              fontSize: '60px',
              top: '25%',
              left: '20%',
              transform: `scale(${interpolate(sceneFrame, [10, 25], [0, 1], { extrapolateRight: 'clamp' })})`
            }}>
              ✨
            </div>
            <div style={{
              position: 'absolute',
              fontSize: '60px',
              top: '30%',
              right: '20%',
              transform: `scale(${interpolate(sceneFrame, [15, 30], [0, 1], { extrapolateRight: 'clamp' })})`
            }}>
              ✨
            </div>
            <div style={{
              position: 'absolute',
              bottom: '20%',
              fontSize: '48px',
              transform: `scale(${interpolate(sceneFrame, [20, 35], [0, 1], { extrapolateRight: 'clamp' })})`
            }}>
              💼 👍 🎉
            </div>
          </AbsoluteFill>
        )}

        <AbsoluteFill style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: '60px'
        }}>
          <div style={{
            fontSize: '56px',
            fontWeight: 'bold',
            color: '#fff',
            textAlign: 'center',
            textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
            padding: '20px 40px',
            backgroundColor: 'rgba(0,0,0,0.25)',
            borderRadius: '20px',
            transform: `translateY(${textSlide}px)`,
            opacity: fadeIn,
            maxWidth: '90%'
          }}>
            {scenes[sceneIndex].text}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};