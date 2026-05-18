import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import styles from './guestbanner.module.css';
import { HatGlasses, LogIn, PenTool } from 'lucide-react';

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
        <HatGlasses size={15}/> Guest mode
        <span className={styles.limits}>· data is temporary</span>
      </span>
      <button className={styles.exitBtn} onClick={()=>handleExit('register')} title="Register">
        <PenTool size={15}/>
      </button>
      <button className={styles.exitBtn} onClick={()=>handleExit('login')} title="Log In">
        <LogIn size={15} />
      </button>
    </div>
  );
}