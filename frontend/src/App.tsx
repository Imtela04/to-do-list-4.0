import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { ToastProvider, useToast   } from './context/ToastContext';
import { registerErrorHandler } from '@/api/client';

//lazy load all pages
const Dashboard = lazy(() => import('@/pages/home'));
const Login     = lazy(() => import('@/pages/login'));
const Register  = lazy(() => import('@/pages/register'));
import { ThemeProvider } from './context/ThemeContext';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useAppStore } from '@/store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           1000 * 60 * 5,
      retry:               1,
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('authToken');
  if (!token) return <Navigate to="/login" />;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp: number };
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('authToken');
      return <Navigate to="/login" />;
    }
  } catch {
    return <Navigate to="/login" />;
  }
  return <AppLoader>{children}</AppLoader>;
}

function AppLoader({ children }: { children: ReactNode }) {
  useDataLoader();
  return children;
}

function ErrorHandlerRegistrar() {
  const { showToast } = useToast();
  useEffect(() => {
    registerErrorHandler((msg) => showToast(msg, 'error'));
  }, [showToast]);
  return null;
}

export default function App() {
  const [authKey, setAuthKey] = useState(0);
  const resetState = useAppStore(s => s.resetState);

  useEffect(() => {
    const handleAuthChange = () => {
      const isLoggedIn = !!localStorage.getItem('authToken');
      if (!isLoggedIn) {
        queryClient.clear();
        resetState();
      }
      setAuthKey(k => k + 1);
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, [resetState]);

  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ToastProvider>
        <ErrorHandlerRegistrar />
        <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
          <Routes key={authKey}>
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ToastProvider>         {/* ← add */}
    </ThemeProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
  );

}