import { render, screen } from '@testing-library/react';
import { NavigationDock } from '@/components/NavigationDock';

let mockPathname = '/dashboard';
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
}));

describe('NavigationDock', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = '/dashboard';
  });

  it('renders dock items for Dashboard, Notifications, and Settings', () => {
    render(<NavigationDock />);
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('marks Dashboard as active with aria-current="page" when on /dashboard', () => {
    mockPathname = '/dashboard';
    render(<NavigationDock />);
    const dashboardBtn = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
  });

  it('marks Notifications as active with aria-current="page" when on /notifications', () => {
    mockPathname = '/notifications';
    render(<NavigationDock />);
    const notificationsBtn = screen.getByRole('button', { name: 'Notifications' });
    expect(notificationsBtn).toHaveAttribute('aria-current', 'page');
  });

  it('marks Settings as active with aria-current="page" when on /settings', () => {
    mockPathname = '/settings';
    render(<NavigationDock />);
    const settingsBtn = screen.getByRole('button', { name: 'Settings' });
    expect(settingsBtn).toHaveAttribute('aria-current', 'page');
  });
});
