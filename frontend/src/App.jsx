import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import Dashboard from '@/pages/home';
import Login from '@/pages/login';
import Register from '@/pages/register';
import { ThemeProvider } from './context/ThemeContext';

function PrivateRoute({ children }) {
  const token = localStorage.getItem("authToken");
  if (!token) return <Navigate to="/login" />;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("authToken");
      return <Navigate to="/login" />;
    }
  } catch {
    return <Navigate to="/login" />;
  }
  return children;
}

export default function App() {
  const [authKey, setAuthKey] = useState(0);

  useEffect(() => {
    const handleAuthChange = () => setAuthKey(k => k + 1);
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  return (
    // key on both providers forces full unmount+remount on auth change
    <AppProvider key={authKey}>
      <ThemeProvider key={authKey}>
        <Routes>
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </AppProvider>
  );
}