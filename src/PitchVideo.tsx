import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

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

  const totalScenes = scenes.length;
  const framesPerScene = Math.floor(durationInFrames / totalScenes);
  const currentSceneIndex = Math.min(
    Math.floor(frame / framesPerScene),
    totalScenes - 1
  );
  const scene = scenes[currentSceneIndex];
  const sceneFrame = frame - currentSceneIndex * framesPerScene;

  const opacity = interpolate(sceneFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp'
  });

  const scale = spring({
    frame: sceneFrame,
    fps,
    config: { damping: 12, stiffness: 80 }
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      {/* Background gradient */}
      <AbsoluteFill style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }} />

      {/* Scene visual description */}
      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        opacity,
      }}>
        {/* Product name */}
        <div style={{
          fontSize: 28,
          color: '#e94560',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          marginBottom: 20,
          textTransform: 'uppercase',
          letterSpacing: 4,
          transform: `scale(${scale})`,
        }}>
          {product}
        </div>

        {/* Scene visual hint */}
        <div style={{
          fontSize: 16,
          color: '#a8b2d8',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          marginBottom: 40,
          maxWidth: 600,
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {scene?.visual}
        </div>

        {/* Main text */}
        <div style={{
          fontSize: 42,
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center',
          maxWidth: 700,
          lineHeight: 1.3,
          transform: `scale(${scale})`,
        }}>
          {scene?.text}
        </div>

        {/* Scene indicator dots */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          display: 'flex',
          gap: 8,
        }}>
          {scenes.map((_, i) => (
            <div key={i} style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: i === currentSceneIndex ? '#e94560' : '#444',
            }} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};