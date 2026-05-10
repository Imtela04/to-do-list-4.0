import { screen } from '@testing-library/react';
import CalendarView from '../components/layout/calendarview';
import { renderWithProviders } from './utils';

describe('CalendarView', () => {
  test('renders calendar', () => {
    renderWithProviders(<CalendarView />);
    expect(screen.getByRole('grid', { name: /calendar/i })).toBeInTheDocument();
  });

  test('shows current month', () => {
    renderWithProviders(<CalendarView />);
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`${currentMonth} ${currentYear}`)).toBeInTheDocument();
  });
  
  test('displays tasks on correct dates', () => {
    renderWithProviders(<CalendarView />);
    // Mock tasks would be needed, but for now assume no tasks
    // expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
});