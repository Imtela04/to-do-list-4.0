import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import styles from './guestbanner.module.css';
import { HatGlasses } from 'lucide-react';

export default function GuestBanner() {
  const isGuest    = useAppStore(s => s.isGuest);
  const resetState = useAppStore(s => s.resetState);
  const navigate   = useNavigate();

  if (!isGuest) return null;

  const handleExit = async (action: 'register' | 'login' ) => {
    const token = localStorage.getItem('authToken');

    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    resetState();
    navigate(`/${action}`);
    if (token) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/auth/guest/logout/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }
    window.dispatchEvent(new Event('auth-change'));
  };

  return (
    <div className={styles.banner}>
      <span className={styles.text}>
        <HatGlasses size={15}/> Guest mode |
        <span className={styles.limits}></span>
      </span>
      <button className={styles.exitBtn} onClick={()=>handleExit('register')}>
        Register
      </button>
      or
      <button className={styles.exitBtn} onClick={()=>handleExit('login')}>
        Login
      </button>
      to save progress
    </div>
  );
}