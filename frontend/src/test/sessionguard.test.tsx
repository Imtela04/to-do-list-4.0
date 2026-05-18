import { screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import SessionGuard from '../components/layout/sessionguard';
import { renderWithProviders } from './utils/utils';

vi.mock('@/hooks/useSessionTimer', () => ({
  useSessionTimer: ({ onWarn }: { onWarn: () => void; onExpire: () => void }) => {
    // expose trigger via window for tests
    (window as any).__triggerWarn = onWarn;
    return { reset: vi.fn(), clear: vi.fn() };
  },
}));

describe('SessionGuard', () => {
  test('renders children normally', () => {
    renderWithProviders(<SessionGuard><p>content</p></SessionGuard>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  test('shows warning modal when session nears expiry', () => {
    renderWithProviders(<SessionGuard><p>content</p></SessionGuard>);
    act(() => (window as any).__triggerWarn());
    expect(screen.getByText(/still there/i)).toBeInTheDocument();
    expect(screen.getByText(/5 minutes/i)).toBeInTheDocument();
  });

  test('hides modal on continue', () => {
    renderWithProviders(<SessionGuard><p>content</p></SessionGuard>);
    act(() => (window as any).__triggerWarn());
    fireEvent.click(screen.getByText(/continue session/i));
    expect(screen.queryByText(/still there/i)).not.toBeInTheDocument();
  });

  test('Escape key dismisses modal', () => {
    renderWithProviders(<SessionGuard><p>content</p></SessionGuard>);
    act(() => (window as any).__triggerWarn());
    const modal = screen.getByText(/still there/i).closest('div')!;
    fireEvent.keyDown(modal, { key: 'Escape' });
    expect(screen.queryByText(/still there/i)).not.toBeInTheDocument();
  });
});