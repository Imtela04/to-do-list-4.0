import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Dashboard from '@/pages/home';
import Login from '@/pages/login';
import Register from '@/pages/register';
import { ThemeProvider } from './context/ThemeContext';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useAppStore } from '@/store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        1000 * 60 * 5,  // data stays fresh for 5 minutes
      retry:            1,              // retry failed requests once
      refetchOnWindowFocus: false,      // don't refetch just because user switched tabs
    },
  },
});

function PrivateRoute({ children }) {
  const token = localStorage.getItem('authToken');
  if (!token) return <Navigate to="/login" />;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('authToken');
      return <Navigate to="/login" />;
    }
  } catch {
    return <Navigate to="/login" />;
  }
  return children;
}

function AppLoader({ children }) {
  useDataLoader();
  return children;
}

export default function App() {
  const [authKey, setAuthKey] = useState(0);
  const resetState = useAppStore(s => s.resetState);

  useEffect(() => {
    const handleAuthChange = () => {
      queryClient.clear();  // ← wipe the React Query cache on logout
      resetState();
      setAuthKey(k => k + 1);
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider key={authKey}>
        <AppLoader key={authKey}>
          <Routes>
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLoader>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}