import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { confirmPasswordReset } from '../api/services';
import styles from './login.module.css';

export default function ResetConfirm() {
  const { uid, token }          = useParams<{ uid: string; token: string }>();
  const navigate                = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!password.trim())        { setError('Password is required.'); return; }
    if (password.length < 6)     { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm)    { setError('Passwords do not match.'); return; }
    if (!uid || !token)          { setError('Invalid reset link.'); return; }

    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(uid, token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={styles.layout}>
        <div className={styles.main}>
          <h1>Password updated</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Your password has been changed. Redirecting you to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <h1>New password</h1>
        {error && <p className={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            autoComplete="new-password"
            className={styles.inputClass}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={styles.inputClass}
          />
          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
        <p className={styles.registerText}>
          <Link to="/login" className={styles.registerLink}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}