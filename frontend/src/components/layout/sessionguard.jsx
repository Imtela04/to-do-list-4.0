import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import styles from './sessionguard.module.css';

export default function SessionGuard({ children }) {
  const [warning, setWarning] = useState(false);
  const navigate = useNavigate();

  const handleExpire = useCallback(() => {
    setWarning(false);
    localStorage.removeItem('authToken');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  }, [navigate]);

  const handleWarn = useCallback(() => {
    setWarning(true);
  }, []);

  const { reset, clear } = useSessionTimer({
    onWarn:   handleWarn,
    onExpire: handleExpire,
  });

  const handleContinue = () => {
    setWarning(false);
    reset(); // restart the timer
  };

  const handleLogout = () => {
    clear();
    handleExpire();
  };

  if (!warning) return children;

  return (
    <>
      {children}
      <div className={styles.backdrop}>
        <div className={styles.modal}>
          <div className={styles.icon}>👋</div>
          <h2 className={styles.title}>Still there?</h2>
          <p className={styles.message}>
            Your session will expire in <strong>5 minutes</strong> due to inactivity.
          </p>
          <div className={styles.actions}>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Log out
            </button>
            <button className={styles.continueBtn} onClick={handleContinue}>
              Continue session
            </button>
          </div>
        </div>
      </div>
    </>
  );
}