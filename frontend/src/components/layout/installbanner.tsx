import { Download, X, Share } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import styles from './installbanner.module.css';

export default function InstallBanner() {
  const { visible, platform, install, dismiss } = useInstallPrompt();

  if (!visible) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.icon}><Download size={16} /></div>

      <div className={styles.text}>
        <span className={styles.title}>Install what-do</span>
        {platform === 'ios' ? (
          <span className={styles.sub}>
            Tap <Share size={12} className={styles.inlineIcon} /> then "Add to Home Screen"
          </span>
        ) : (
          <span className={styles.sub}>Add it to your home screen for quick access</span>
        )}
      </div>

      {platform === 'android' && (
        <button className={styles.installBtn} onClick={install}>Install</button>
      )}

      <button className={styles.closeBtn} onClick={dismiss} title="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}