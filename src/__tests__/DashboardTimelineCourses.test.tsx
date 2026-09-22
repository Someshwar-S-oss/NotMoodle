import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '@/app/dashboard/page';
import {
  getRelativeTimeBadge,
  extractCourseCode,
  extractCourseDisplayName,
  getCourseAccent,
} from '@/lib/dashboard-utils';

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
let mockAssignments: any[] = [];
let mockCourses: any[] = [];

jest.mock('../lib/moodle-client', () => ({
  getSiteInfo: jest.fn().mockResolvedValue({ userid: 101 }),
  getCurrentCourses: jest.fn().mockImplementation(() => Promise.resolve(mockCourses)),
  getTimelineEvents: jest.fn().mockImplementation(() => Promise.resolve(mockTimelineEvents)),
  getAssignments: jest.fn().mockImplementation(() => Promise.resolve(mockAssignments)),
  getSubmissionStatus: jest.fn().mockResolvedValue({ submitted: false }),
}));

// Mock Drawer and AssignmentDetails to simplify drawer trigger assertions
jest.mock('../components/Drawer', () => ({
  Drawer: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div data-testid="assignment-drawer" role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

jest.mock('../components/AssignmentDetails', () => ({
  AssignmentDetails: ({ assignment }: any) => (
    <div data-testid="assignment-details-content">
      <span>Assignment: {assignment.name}</span>
      <span>Course: {assignment.coursename}</span>
    </div>
  ),
}));

describe('Dashboard Timeline & Course Cards Redesign', () => {
  describe('Helper: getRelativeTimeBadge', () => {
    it('returns Overdue for past timestamps', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const overdueTime = nowSec - 7200; // 2 hours ago
      const badge = getRelativeTimeBadge(overdueTime);
      expect(badge.variant).toBe('overdue');
      expect(badge.label).toBe('Overdue');
    });

    it('returns minutes or hours countdown for deadlines later today', () => {
      const now = new Date();
      const laterToday = new Date(now.getTime() + 30 * 60 * 1000);
      if (laterToday.getDate() === now.getDate()) {
        const badge = getRelativeTimeBadge(Math.floor(laterToday.getTime() / 1000));
        expect(badge.variant).toBe('today');
        expect(badge.label).toMatch(/Due in \d+m/);
      }

      const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      if (threeHoursLater.getDate() === now.getDate()) {
        const badge = getRelativeTimeBadge(Math.floor(threeHoursLater.getTime() / 1000));
        expect(badge.variant).toBe('today');
        expect(badge.label).toMatch(/Due in 3h/);
      }
    });

    it('returns Tomorrow for deadlines on tomorrow calendar day', () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const badge = getRelativeTimeBadge(Math.floor(tomorrow.getTime() / 1000));
      expect(badge.variant).toBe('today');
      expect(badge.label).toBe('Tomorrow');
    });

    it('returns In X days for deadlines within 2 to 7 days', () => {
      const now = new Date();
      const inFourDays = new Date(now);
      inFourDays.setDate(now.getDate() + 4);

      const badge = getRelativeTimeBadge(Math.floor(inFourDays.getTime() / 1000));
      expect(badge.variant).toBe('upcoming');
      expect(badge.label).toMatch(/In \d+ days/);
    });

    it('returns In X weeks for deadlines > 7 days away', () => {
      const now = new Date();
      const inTwoWeeks = new Date(now);
      inTwoWeeks.setDate(now.getDate() + 14);

      const badge = getRelativeTimeBadge(Math.floor(inTwoWeeks.getTime() / 1000));
      expect(badge.variant).toBe('upcoming');
      expect(badge.label).toBe('In 2 weeks');
    });
  });

  describe('Helper: extractCourseCode & extractCourseDisplayName & getCourseAccent', () => {
    it('extracts code from shortname or fullname', () => {
      expect(extractCourseCode('CS 101', 'Intro to Computer Science')).toBe('CS 101');
      expect(extractCourseCode('CS204', 'Data Structures')).toBe('CS204');
      expect(extractCourseCode('', 'MATH 202 Linear Algebra')).toBe('MATH 202');
      expect(extractCourseCode(undefined, 'Algorithms')).toBe('ALGORITHMS');
    });

    it('extracts course code and display name from Sriher hyphen convention e02-cyb23lu01-course name', () => {
      const rawFullName = 'e02-cyb23lu01-Cryptography and Network Security';
      expect(extractCourseCode(undefined, rawFullName)).toBe('CYB23LU01');
      expect(extractCourseDisplayName(rawFullName)).toBe('Cryptography and Network Security');

      // Works when shortname has the prefix as well
      expect(extractCourseCode('e02-cyb23lu01', 'Cryptography')).toBe('CYB23LU01');
      // If no hyphens, returns trimmed raw name
      expect(extractCourseDisplayName('Operating Systems')).toBe('Operating Systems');
    });

    it('determines deterministic course accent colors', () => {
      const accent1 = getCourseAccent(101, 0);
      const accent2 = getCourseAccent(101, 0);
      expect(accent1.hex).toBe(accent2.hex);
      expect(accent1.hex).toBeDefined();
    });
  });

  describe('Dashboard Component Timeline & Course Integration', () => {
    const now = Date.now();
    const overdueTime = Math.floor((now - 86400 * 1000) / 1000);
    const inThreeDaysTime = Math.floor((now + 3 * 86400 * 1000) / 1000);

    const mockCache = {
      courses: [
        { id: 10, fullname: 'CS 101 Computer Science', shortname: 'CS 101' },
        { id: 20, fullname: 'MATH 202 Linear Algebra', shortname: 'MATH 202' },
      ],
      assignments: [
        {
          id: 501,
          name: 'Algorithm Analysis Homework',
          intro: 'Complete problems 1 through 5.',
          course: 10,
          coursename: 'CS 101 Computer Science',
          duedate: inThreeDaysTime,
        },
      ],
      events: [
        {
          id: 1,
          name: 'Algorithm Analysis Homework',
          description: 'Complete problems 1 through 5.',
          eventtype: 'assign',
          course: { id: 10, fullname: 'CS 101 Computer Science' },
          timestart: inThreeDaysTime,
          instance: 501,
        },
        {
          id: 2,
          name: 'Overdue Project Report',
          description: 'Submit project writeup',
          eventtype: 'assign',
          course: { id: 10, fullname: 'CS 101 Computer Science' },
          timestart: overdueTime,
          instance: 999,
        },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockCourses = [...mockCache.courses];
      mockTimelineEvents = [...mockCache.events];
      mockAssignments = [...mockCache.assignments];

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

    it('renders timeline items with relative countdown badge and formatted date', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Algorithm Analysis Homework', level: 3 }),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole('heading', { name: 'Overdue Project Report', level: 3 }),
      ).toBeInTheDocument();
      expect(screen.getAllByText('Overdue').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/In \d+ days/)).toBeInTheDocument();

      const viewDetailsButtons = screen.getAllByText('View Details');
      expect(viewDetailsButtons.length).toBe(2);
    });

    it('opens assignment details drawer when clicking a timeline row with matching assignment', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Algorithm Analysis Homework', level: 3 }),
        ).toBeInTheDocument();
      });

      const eventHeading = screen.getByRole('heading', {
        name: 'Algorithm Analysis Homework',
        level: 3,
      });
      const timelineRow = eventHeading.closest('[role="button"]') || eventHeading;
      fireEvent.click(timelineRow);

      await waitFor(() => {
        expect(screen.getByTestId('assignment-drawer')).toBeInTheDocument();
        expect(screen.getByTestId('assignment-details-content')).toBeInTheDocument();
        expect(
          screen.getByText('Assignment: Algorithm Analysis Homework'),
        ).toBeInTheDocument();
      });
    });

    it('renders Enrolled Modules cards with Folder component, course code badges, and pending deadline count', async () => {
      const { container } = render(<Home />);

      await waitFor(() => {
        expect(screen.getAllByText('CS 101').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('MATH 202').length).toBeGreaterThanOrEqual(1);
      });

      // Verify Folder presentation elements are rendered for the enrolled courses
      const folders = container.querySelectorAll('.folder-container');
      expect(folders.length).toBe(2);

      // Verify course code badges
      const codeBadges = screen.getAllByTestId('course-code-badge');
      expect(codeBadges.length).toBe(2);
      expect(codeBadges[0]).toHaveTextContent('CS 101');
      expect(codeBadges[1]).toHaveTextContent('MATH 202');

      expect(screen.getByText('2 deadlines pending')).toBeInTheDocument();
      expect(screen.getByText('All clear')).toBeInTheDocument();
    });

    it('displays editorial empty state when zero events match', async () => {
      const emptyCache = {
        courses: [
          { id: 10, fullname: 'CS 101 Computer Science', shortname: 'CS 101' },
        ],
        events: [],
        assignments: [],
      };
      mockTimelineEvents = [];
      mockAssignments = [];
      mockCourses = emptyCache.courses;
      localStorage.setItem('moodle_dashboard_cache', JSON.stringify(emptyCache));

      render(<Home />);

      await waitFor(() => {
        expect(
          screen.getByText("No deadlines here — you're all set!"),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/You've tackled everything on your schedule/i),
      ).toBeInTheDocument();
    });

    it('partitions hidden courses into a collapsible past courses accordion', async () => {
      global.fetch = jest.fn((url: string, options?: any) => {
        if (url === '/api/moodle/token') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ token: 'mock-token' }),
          });
        }
        if (url === '/api/courses/catalog') {
          if (options?.method === 'POST') {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({ success: true }),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              courses: [
                { course_id: 20, is_hidden: true, fullname: 'MATH 202 Linear Algebra' },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      }) as any;

      render(<Home />);

      // CS 101 should be in the active grid
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'CS 101 Computer Science', level: 3 })).toBeInTheDocument();
      });

      // The collapsible Past / Inactive Courses accordion button should exist with count 1
      const accordionButton = screen.getByRole('button', { name: /Past \/ Inactive Courses/i });
      expect(accordionButton).toBeInTheDocument();
      expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
      expect(accordionButton).toHaveTextContent('1');

      // Inactive course MATH 202 should not be visible before expanding accordion
      expect(screen.queryByRole('heading', { name: 'MATH 202 Linear Algebra', level: 3 })).not.toBeInTheDocument();

      // Click to expand accordion
      fireEvent.click(accordionButton);
      expect(accordionButton).toHaveAttribute('aria-expanded', 'true');

      // Now MATH 202 should be visible in the accordion
      expect(screen.getByRole('heading', { name: 'MATH 202 Linear Algebra', level: 3 })).toBeInTheDocument();
      expect(screen.getByText('Past Course')).toBeInTheDocument();

      // Click to collapse accordion again
      fireEvent.click(accordionButton);
      expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('heading', { name: 'MATH 202 Linear Algebra', level: 3 })).not.toBeInTheDocument();
    });

    it('excludes assignments and events belonging to hidden courses from timeline and urgency counts', async () => {
      const mathEventTime = Math.floor((now + 3600 * 1000) / 1000); // 1 hour later (today)
      mockTimelineEvents = [
        ...mockCache.events,
        {
          id: 3,
          name: 'Linear Algebra Quiz',
          description: 'Matrix multiplication quiz',
          eventtype: 'assign',
          course: { id: 20, fullname: 'MATH 202 Linear Algebra' },
          timestart: mathEventTime,
          instance: 801,
        },
      ];

      global.fetch = jest.fn((url: string, options?: any) => {
        if (url === '/api/moodle/token') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ token: 'mock-token' }),
          });
        }
        if (url === '/api/courses/catalog') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              courses: [
                { course_id: 20, is_hidden: true, fullname: 'MATH 202 Linear Algebra' },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      }) as any;

      render(<Home />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Algorithm Analysis Homework', level: 3 }),
        ).toBeInTheDocument();
      });

      // Active course events should be displayed
      expect(
        screen.getByRole('heading', { name: 'Algorithm Analysis Homework', level: 3 }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Overdue Project Report', level: 3 }),
      ).toBeInTheDocument();

      // Linear Algebra Quiz belonging to hidden course 20 should NOT be in timeline
      expect(
        screen.queryByRole('heading', { name: 'Linear Algebra Quiz', level: 3 }),
      ).not.toBeInTheDocument();

      // Urgency counts: Due Today should be 0 (because the today event belongs to hidden course 20)
      const dueTodayCard = screen.getByRole('button', { name: /Due today assignments/i });
      expect(dueTodayCard).toHaveTextContent('0');

      // Overdue card has 1 (from CS 101)
      const overdueCard = screen.getByRole('button', { name: /Overdue assignments/i });
      expect(overdueCard).toHaveTextContent('1');

      // Upcoming card has 1 (from CS 101)
      const upcomingCard = screen.getByRole('button', { name: /Upcoming assignments/i });
      expect(upcomingCard).toHaveTextContent('1');
    });

    it('invokes silent background auto-discovery push to /api/courses/catalog with discovered courses', async () => {
      let catalogPostCalled = false;
      let postedBody: any = null;

      global.fetch = jest.fn((url: string, options?: any) => {
        if (url === '/api/moodle/token') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ token: 'mock-token' }),
          });
        }
        if (url === '/api/courses/catalog') {
          if (options?.method === 'POST') {
            catalogPostCalled = true;
            postedBody = JSON.parse(options.body);
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({ success: true }),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ courses: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      }) as any;

      render(<Home />);

      await waitFor(() => {
        expect(catalogPostCalled).toBe(true);
      });

      expect(postedBody).toEqual({
        courses: mockCache.courses,
      });
    });
  });
});

