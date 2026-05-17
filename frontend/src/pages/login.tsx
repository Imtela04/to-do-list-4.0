import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/services';
import { useAppStore } from '@/store/useAppStore';
import styles from './login.module.css';
import { HatGlasses, Loader, LogIn } from 'lucide-react';

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const [form, setForm]                 = useState<LoginForm>({ username: '', password: '' });
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const navigate                        = useNavigate();
  const resetState                      = useAppStore(s => s.resetState);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password.trim()) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    try {
      const res = await login({ username: form.username, password: form.password });
      localStorage.setItem('authToken', res.data.access);
      localStorage.setItem('refreshToken', res.data.refresh);
      sessionStorage.setItem('sessionActive', '1');

      resetState();
      window.dispatchEvent(new Event('auth-change'));
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } };
      const detail = e.response?.data?.detail
        ?? e.response?.data?.non_field_errors?.[0]
        ?? 'Invalid credentials';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/guest/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      localStorage.setItem('authToken',    data.access);
      localStorage.setItem('refreshToken', data.refresh);
      sessionStorage.setItem('sessionActive', '1');
      resetState();
      window.dispatchEvent(new Event('auth-change'));
      navigate('/');
    } catch {
      setError('Could not start guest session.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <h1>Login</h1>
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
          <div className={styles.passwordContainer}>
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              autoComplete="current-password"
              className={styles.inputClass}
            />
            <button
              type="submit"
              disabled={loading}
              title='Log In'
              className={styles.button}
            >
              {loading ? <Loader size={15}/> : <LogIn size={15}/>}
            </button>

          </div>
          
        </form>
        <p className={styles.registerText}>
          Don't have an account?{' '}
          <Link to="/register" className={styles.registerLink}>Register here</Link>
        </p>
        <p className={styles.registerText}>
          <Link to="/reset-password" className={styles.registerLink}>
            Forgot your password?
          </Link>
        </p>
        <button
          type="button"
          title='Continue as Guest'
          onClick={handleGuest}
          disabled={guestLoading}
          className={styles.guest}          
        >
          {guestLoading ? <Loader size={15}/> : <HatGlasses size={15}/>}
        </button>
      </div>
    </div>
  );
}