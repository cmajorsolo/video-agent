import { Composition } from 'remotion';
import { PitchVideo } from './PitchVideo';

const defaultJob = {
  product: 'My Product',
  duration: '15s',
  audience: 'Everyone',
  tone: 'Professional',
  keyMessage: 'Buy now',
  scenes: [
    { scene: 1, visual: 'Opening shot', text: 'Welcome', duration: 5 },
    { scene: 2, visual: 'Product shot', text: 'Our product', duration: 5 },
    { scene: 3, visual: 'Call to action', text: 'Get yours today', duration: 5 },
  ],
};

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  const durationSeconds = parseInt(defaultJob.duration) || 15;

  return (
    <Composition
      id="PitchVideo"
      component={PitchVideo}
      durationInFrames={durationSeconds * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={defaultJob}
    />
  );
};