import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type ToastType = 'error' | 'success' | 'info';

interface Toast {
  id:      number;
  message: string;
  type:    ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = nextId++;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(toast => toast.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, string> = {
  error:   '✕',
  success: '✓',
  info:    'ℹ',
};

const COLORS: Record<ToastType, string> = {
  error:   'var(--danger)',
  success: 'var(--accent-tertiary)',
  info:    'var(--accent-primary)',
};

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position:      'fixed',
      bottom:        '24px',
      left:          '50%',
      transform:     'translateX(-50%)',
      display:       'flex',
      flexDirection: 'column',
      gap:           '8px',
      zIndex:        99999,
      pointerEvents: 'none',
      alignItems:    'center',
    }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '10px',
          padding:      '10px 16px',
          background:   'var(--bg-card)',
          border:       `1px solid ${COLORS[toast.type]}`,
          borderRadius: 'var(--radius-md)',
          boxShadow:    'var(--shadow-md)',
          fontSize:     '0.82rem',
          color:        'var(--text-primary)',
          animation:    'fadeIn 200ms ease both',
          whiteSpace:   'nowrap',
        }}>
          <span style={{ color: COLORS[toast.type], fontWeight: 600 }}>
            {ICONS[toast.type]}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}