import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';
import styles from './offlinebanner.module.css';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className={styles.banner}>
      <WifiOff size={14} />
      <span>You're offline — changes won't save until you reconnect.</span>
    </div>
  );
}
