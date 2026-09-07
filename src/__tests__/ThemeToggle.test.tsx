import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/ThemeToggle';

const mockSetTheme = jest.fn();
let mockResolvedTheme = 'light';

jest.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockResolvedTheme = 'light';
  });

  it('renders mounted state with switch to dark theme when light', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
  });

  it('calls setTheme with dark when clicked in light theme', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme with light when clicked in dark theme', () => {
    mockResolvedTheme = 'dark';
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /switch to light mode/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
