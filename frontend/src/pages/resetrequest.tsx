import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/services';
import styles from './login.module.css';  // reuse login styles

export default function ResetRequest() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.layout}>
        <div className={styles.main}>
          <h1>Check your email</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.
          </p>
          <Link to="/login" className={styles.registerLink}>Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <h1>Reset password</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Enter your email and we'll send a reset link.
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            className={styles.inputClass}
          />
          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p className={styles.registerText}>
          <Link to="/login" className={styles.registerLink}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}