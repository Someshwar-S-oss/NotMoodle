import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '@/app/dashboard/page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('../utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', user_metadata: { full_name: 'Jane Doe' } } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { is_approved: true, full_name: 'Jane Doe', created_at: '2026-01-01' },
          }),
        }),
      }),
    }),
  }),
}));

let mockTimelineEvents: any[] = [];

jest.mock('../lib/moodle-client', () => ({
  getSiteInfo: jest.fn().mockResolvedValue({ userid: 101 }),
  getCurrentCourses: jest.fn().mockResolvedValue([
    { id: 1, fullname: 'CS 101', shortname: 'CS' },
  ]),
  getTimelineEvents: jest.fn().mockImplementation(() => Promise.resolve(mockTimelineEvents)),
  getAssignments: jest.fn().mockResolvedValue([]),
  getSubmissionStatus: jest.fn().mockResolvedValue({ submitted: false }),
}));

describe('Dashboard Urgency Metric Cards & Interactive Filtering', () => {
  const now = Date.now();
  // 2 days ago -> overdue
  const overdueTime = Math.floor((now - 2 * 86400 * 1000) / 1000);
  // 1 hour ago -> today (Math.ceil(-1/24) = 0)
  const todayTime = Math.floor((now - 3600 * 1000) / 1000);
  // 3 days later -> upcoming (Math.ceil(3) = 3)
  const upcomingTime = Math.floor((now + 3 * 86400 * 1000) / 1000);

  const mockCache = {
    courses: [{ id: 1, fullname: 'CS 101', shortname: 'CS' }],
    assignments: [],
    events: [
      {
        id: 1,
        name: 'Database Project Milestone',
        description: 'Submit schema diagrams',
        eventtype: 'assign',
        course: { id: 1, fullname: 'CS 101' },
        timestart: overdueTime,
        instance: 1,
      },
      {
        id: 2,
        name: 'Algorithms Problem Set 4',
        description: 'Dynamic programming problems',
        eventtype: 'assign',
        course: { id: 1, fullname: 'CS 101' },
        timestart: todayTime,
        instance: 2,
      },
      {
        id: 3,
        name: 'Operating Systems Lab 2',
        description: 'Thread synchronization',
        eventtype: 'assign',
        course: { id: 1, fullname: 'CS 101' },
        timestart: upcomingTime,
        instance: 3,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockTimelineEvents = [...mockCache.events];
    global.fetch = jest.fn((url: string) => {
      if (url === '/api/moodle/token') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ token: 'mock-token' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
    }) as any;

    localStorage.setItem('moodle_dashboard_cache', JSON.stringify(mockCache));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders urgency metric cards with badges and counts', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('NEEDS ATTENTION')).toBeInTheDocument();
    });

    expect(screen.getByText('TACKLE TODAY')).toBeInTheDocument();
    expect(screen.getByText('ON SCHEDULE')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 3, name: 'Overdue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Due Today' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Upcoming' })).toBeInTheDocument();
  });

  it('displays dynamic greeting subtitle based on overdue items', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/Action required: You have 1 overdue item\./i),
      ).toBeInTheDocument();
    });
  });

  it('navigates to /assignments?filter=overdue when clicking Overdue card', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('NEEDS ATTENTION')).toBeInTheDocument();
    });

    const overdueCard = screen.getByRole('button', {
      name: /Overdue assignments/i,
    });
    fireEvent.click(overdueCard);

    expect(mockPush).toHaveBeenCalledWith('/assignments?filter=overdue');
  });

  it('navigates to /assignments?filter=today when clicking Due Today card', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('TACKLE TODAY')).toBeInTheDocument();
    });

    const todayCard = screen.getByRole('button', {
      name: /Due today assignments/i,
    });
    fireEvent.click(todayCard);

    expect(mockPush).toHaveBeenCalledWith('/assignments?filter=today');
  });

  it('navigates to /assignments?filter=upcoming when clicking Upcoming card', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('ON SCHEDULE')).toBeInTheDocument();
    });

    const upcomingCard = screen.getByRole('button', {
      name: /Upcoming assignments/i,
    });
    fireEvent.click(upcomingCard);

    expect(mockPush).toHaveBeenCalledWith('/assignments?filter=upcoming');
  });

  it('shows focus mode greeting when no overdue but today events exist', async () => {
    // Only today events
    mockTimelineEvents = [mockCache.events[1]];
    localStorage.setItem(
      'moodle_dashboard_cache',
      JSON.stringify({ ...mockCache, events: mockTimelineEvents }),
    );

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/Focus mode: 1 deadline scheduled today\./i),
      ).toBeInTheDocument();
    });
  });

  it('shows clear horizon greeting when neither overdue nor today events exist', async () => {
    mockTimelineEvents = [mockCache.events[2]]; // only upcoming
    localStorage.setItem(
      'moodle_dashboard_cache',
      JSON.stringify({ ...mockCache, events: mockTimelineEvents }),
    );

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/Clear horizon: You're all caught up on submissions\./i),
      ).toBeInTheDocument();
    });
  });
});
