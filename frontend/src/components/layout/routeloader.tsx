import { useState } from 'react';
import styles from './routeloader.module.css';

const TIPS = [
  "Sharpening your pixel-cursor...",
  "Counting yesterday's streak...",
  "Bribing the XP bar to fill faster...",
];

export default function RouteLoader() {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  return (
    <div className={styles.wrap}>
      <span className={styles.tip}>{tip}</span>
    </div>
  );
}