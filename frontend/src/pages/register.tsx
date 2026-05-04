import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/services';
import styles from './register.module.css';

interface RegisterForm {
  username: string;
  password: string;
  confirm:  string;
}

export default function Register() {
  const [form, setForm]       = useState<RegisterForm>({ username: '', password: '', confirm: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password.trim() || !form.confirm.trim()) {
      setError('All fields required');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register({ username: form.username, password: form.password, confirm: form.confirm });
      navigate('/');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <h1>Register</h1>
        {error && <p className={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            autoComplete="username"
            className={styles.inputClass}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            autoComplete="new-password"
            className={styles.inputClass}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={form.confirm}
            onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
            autoComplete="new-password"
            className={styles.inputClass}
          />
          <button
            type="submit"
            disabled={loading}
            className={styles.button}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseOut={e =>  { e.currentTarget.style.background = 'var(--accent-primary)'; }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className={styles.registerText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.registerLink}>Login here</Link>
        </p>
      </div>
    </div>
  );
}