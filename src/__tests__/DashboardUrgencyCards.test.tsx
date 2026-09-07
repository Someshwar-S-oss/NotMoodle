import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '@/app/dashboard/page';

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

  it('filters timeline when clicking Overdue card and clears filter with reset button', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Database Project Milestone')).toBeInTheDocument();
    });

    // Initially all 3 events are present
    expect(screen.getByText('Database Project Milestone')).toBeInTheDocument();
    expect(screen.getByText('Algorithms Problem Set 4')).toBeInTheDocument();
    expect(screen.getByText('Operating Systems Lab 2')).toBeInTheDocument();

    // Click Overdue card to filter
    const overdueCard = screen.getByRole('button', {
      name: /Overdue assignments/i,
    });
    fireEvent.click(overdueCard);

    // Overdue event should be visible, others should not
    expect(screen.getByText('Database Project Milestone')).toBeInTheDocument();
    expect(screen.queryByText('Algorithms Problem Set 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Operating Systems Lab 2')).not.toBeInTheDocument();

    // Filter indicator and Clear filter button should be shown
    const clearButton = screen.getByRole('button', {
      name: /Clear filter \(Show all\)/i,
    });
    expect(clearButton).toBeInTheDocument();

    // Reset filter
    fireEvent.click(clearButton);

    // All events restored
    expect(screen.getByText('Database Project Milestone')).toBeInTheDocument();
    expect(screen.getByText('Algorithms Problem Set 4')).toBeInTheDocument();
    expect(screen.getByText('Operating Systems Lab 2')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Clear filter \(Show all\)/i }),
    ).not.toBeInTheDocument();
  });

  it('toggles filter off when clicking the same active card again', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Algorithms Problem Set 4')).toBeInTheDocument();
    });

    const todayCard = screen.getByRole('button', {
      name: /Due today assignments/i,
    });

    // Click to filter by today
    fireEvent.click(todayCard);
    expect(screen.getByText('Algorithms Problem Set 4')).toBeInTheDocument();
    expect(screen.queryByText('Database Project Milestone')).not.toBeInTheDocument();

    // Click today card again to toggle off
    fireEvent.click(todayCard);
    expect(screen.getByText('Algorithms Problem Set 4')).toBeInTheDocument();
    expect(screen.getByText('Database Project Milestone')).toBeInTheDocument();
    expect(screen.getByText('Operating Systems Lab 2')).toBeInTheDocument();
  });

  it('filters timeline when clicking Upcoming card', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Operating Systems Lab 2')).toBeInTheDocument();
    });

    const upcomingCard = screen.getByRole('button', {
      name: /Upcoming assignments/i,
    });

    fireEvent.click(upcomingCard);
    expect(screen.getByText('Operating Systems Lab 2')).toBeInTheDocument();
    expect(screen.queryByText('Database Project Milestone')).not.toBeInTheDocument();
    expect(screen.queryByText('Algorithms Problem Set 4')).not.toBeInTheDocument();
  });

  it('applies active ring classes to cards when selected', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('NEEDS ATTENTION')).toBeInTheDocument();
    });

    const overdueCard = screen.getByRole('button', { name: /Overdue assignments/i });
    const todayCard = screen.getByRole('button', { name: /Due today assignments/i });
    const upcomingCard = screen.getByRole('button', { name: /Upcoming assignments/i });

    // Initially none have the active ring
    expect(overdueCard.className).not.toContain('ring-[var(--urgency-overdue)]');
    expect(todayCard.className).not.toContain('ring-[var(--urgency-today)]');
    expect(upcomingCard.className).not.toContain('ring-[var(--urgency-upcoming)]');

    // Click Overdue
    fireEvent.click(overdueCard);
    expect(overdueCard.className).toContain('ring-[var(--urgency-overdue)]');
    expect(overdueCard).toHaveAttribute('aria-pressed', 'true');

    // Click Today
    fireEvent.click(todayCard);
    expect(todayCard.className).toContain('ring-[var(--urgency-today)]');
    expect(todayCard).toHaveAttribute('aria-pressed', 'true');
    expect(overdueCard.className).not.toContain('ring-[var(--urgency-overdue)]');

    // Click Upcoming
    fireEvent.click(upcomingCard);
    expect(upcomingCard.className).toContain('ring-[var(--urgency-upcoming)]');
    expect(upcomingCard).toHaveAttribute('aria-pressed', 'true');
    expect(todayCard.className).not.toContain('ring-[var(--urgency-today)]');
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

  it('displays empty state message when a filtered category has no items', async () => {
    mockTimelineEvents = [mockCache.events[2]]; // only upcoming
    localStorage.setItem(
      'moodle_dashboard_cache',
      JSON.stringify({ ...mockCache, events: mockTimelineEvents }),
    );

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Operating Systems Lab 2')).toBeInTheDocument();
    });

    const overdueCard = screen.getByRole('button', { name: /Overdue assignments/i });
    fireEvent.click(overdueCard);

    expect(screen.getByText(/No overdue items found\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear filter \(Show all\)/i })).toBeInTheDocument();
  });
});
