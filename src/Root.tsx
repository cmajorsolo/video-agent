import { Composition } from 'remotion';
import { PitchVideo } from './PitchVideo';
import jobData from '../current-job.json';

const durationSeconds = parseInt(jobData.duration) || 15;
const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PitchVideo"
      component={PitchVideo}
      durationInFrames={durationSeconds * FPS}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={jobData}
    />
  );
};