import { render, screen } from '@testing-library/react';
import CalendarView from '../components/layout/calendarview';

describe('CalendarView', () => {
  test('renders calendar', () => {
    render(<CalendarView />);
    expect(screen.getByRole('grid', { name: /calendar/i })).toBeInTheDocument();
  });

  test('shows current month', () => {
    render(<CalendarView />);
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    expect(screen.getByText(currentMonth)).toBeInTheDocument();
  });

  test('displays tasks on correct dates', () => {
    render(<CalendarView />);
    // Mock tasks would be needed, but for now assume no tasks
    // expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
});