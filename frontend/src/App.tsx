import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { ToastProvider, useToast   } from './context/ToastContext';
import { registerErrorHandler } from '@/api/client';
import OfflineBanner from '@/components/layout/offlinebanner';

//lazy load all pages
const Dashboard = lazy(() => import('@/pages/home'));
const Login     = lazy(() => import('@/pages/login'));
const Register  = lazy(() => import('@/pages/register'));
const ResetRequest = lazy(() => import('@/pages/resetrequest'));
const ResetConfirm = lazy(() => import('@/pages/resetconfirm'));
const AdminDashboard = lazy(() => import('@/pages/admin'));

import { ThemeProvider } from './context/ThemeContext';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useAppStore } from '@/store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           1000 * 60 * 5,
      retry:               1,
      refetchOnWindowFocus: false,
      refetchOnReconnect:     true,
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

function AdminRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('authToken');
  if (!token) return <Navigate to="/login" />;
  // isStaff is checked server-side on every API call,
  // this just prevents non-staff from seeing the UI
  const isStaff = useAppStore.getState().isStaff;
  if (!isStaff) return <Navigate to="/" />;
  return <AppLoader>{children}</AppLoader>;
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
        <OfflineBanner />
        <ErrorHandlerRegistrar />
        <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
          <Routes key={authKey}>
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password"               element={<ResetRequest />} />
            <Route path="/reset-password/:uid/:token"   element={<ResetConfirm />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
  );

}