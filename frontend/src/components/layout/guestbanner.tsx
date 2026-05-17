import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import styles from './guestbanner.module.css';

export default function GuestBanner() {
  const isGuest    = useAppStore(s => s.isGuest);
  const resetState = useAppStore(s => s.resetState);
  const navigate   = useNavigate();

  if (!isGuest) return null;

  const handleExit = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/auth/guest/logout/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    resetState();
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  return (
    <div className={styles.banner}>
      <span className={styles.text}>
        👤 Guest mode
        <span className={styles.limits}>· data is temporary · 3 tasks max · no levels or XP</span>
      </span>
      <button className={styles.exitBtn} onClick={handleExit}>
        Sign up / Log in
      </button>
    </div>
  );
}