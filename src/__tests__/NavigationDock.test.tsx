import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { NavigationDock } from '@/components/NavigationDock';

let mockPathname = '/dashboard';
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
}));

let mockUser: any = null;
let mockProfile: any = null;

const mockSupabase = {
  auth: {
    getUser: jest.fn().mockImplementation(async () => ({
      data: { user: mockUser },
      error: null,
    })),
  },
  from: jest.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockImplementation(async () => ({
              data: mockProfile,
              error: null,
            })),
          }),
        }),
      };
    }
    return {
      select: jest.fn().mockReturnThis(),
    };
  }),
};

jest.mock('../utils/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

describe('NavigationDock', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = '/dashboard';
    mockUser = null;
    mockProfile = null;
  });

  it('renders dock as a toolbar with active route indicator', () => {
    render(<NavigationDock />);
    const toolbar = screen.getByRole('toolbar', { name: 'Application dock' });
    expect(toolbar).toHaveClass('dock-panel');

    const dashboardBtn = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashboardBtn).toHaveAttribute('aria-current', 'page');

    const dot = dashboardBtn.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('rounded-full', 'bg-foreground');
  });

  it('renders dock items for Dashboard, Notifications, and Settings without Admin for non-superuser', async () => {
    mockUser = { id: 'user-1' };
    mockProfile = { is_superuser: false };

    render(<NavigationDock />);
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('renders superuser profile with Dashboard, Notifications, Settings, and Admin item with Shield icon', async () => {
    mockUser = { id: 'superuser-1' };
    mockProfile = { is_superuser: true };

    render(<NavigationDock />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();

    const adminBtn = screen.getByRole('button', { name: 'Admin' });
    const svgIcon = adminBtn.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();

    fireEvent.click(adminBtn);
    expect(mockPush).toHaveBeenCalledWith('/admin');
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

  it('marks Admin as active with aria-current="page" and dot indicator when superuser on /admin', async () => {
    mockUser = { id: 'superuser-1' };
    mockProfile = { is_superuser: true };
    mockPathname = '/admin';

    render(<NavigationDock />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    });

    const adminBtn = screen.getByRole('button', { name: 'Admin' });
    expect(adminBtn).toHaveAttribute('aria-current', 'page');

    const dot = adminBtn.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('rounded-full', 'bg-foreground');
  });
});
