import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/services";
import { useAppStore } from '@/store/useAppStore';
import styles from './login.module.css';

export default function Login() {
  const [form, setForm]       = useState({ username: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();
  const resetState            = useAppStore(s => s.resetState);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password.trim()) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    try {
      const res = await login({ username: form.username, password: form.password });
      localStorage.setItem('authToken', res.data.access);
      localStorage.setItem('refreshToken', res.data.refresh);
      resetState();
      window.dispatchEvent(new Event('auth-change')); // triggers AppLoader remount → useDataLoader refetches
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail
        || err.response?.data?.non_field_errors?.[0]
        || "Invalid credentials";
      setError(detail);
    } finally {
      setLoading(false);
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
            className={styles.button}
            onMouseOver={e => e.currentTarget.style.background = "var(--accent-hover)"}
            onMouseOut={e => e.currentTarget.style.background = "var(--accent-primary)"}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className={styles.registerText}>
          Don't have an account?{" "}
          <Link to="/register" className={styles.registerLink}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}