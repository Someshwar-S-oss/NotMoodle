/**
 * @jest-environment node
 */
import { syncUserAssignments } from '@/lib/sync-assignments'
import { GET as calendarFeedGet } from '@/app/api/calendar/feed/[userId]/route'
import { getSiteInfo, getCurrentCourses, getAssignments } from '../lib/moodle-client'

jest.mock('../lib/moodle-client', () => ({
  getSiteInfo: jest.fn(),
  getCurrentCourses: jest.fn(),
  getAssignments: jest.fn(),
}))

// Mocks
const mockSingle = jest.fn()
let mockConnectionData: any = null

const mockSupabase = {
  from: jest.fn().mockImplementation((table: string) => {
    if (table === 'moodle_connections') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle.mockImplementation(async () => ({
              data: mockConnectionData,
              error: mockConnectionData ? null : new Error('Not found'),
            })),
          }),
        }),
      }
    }
    return {
      select: jest.fn().mockReturnThis(),
    }
  }),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => mockSupabase),
}))

jest.mock('../lib/audit-logger', () => ({
  logServerAuditEvent: jest.fn().mockResolvedValue(true),
}))

describe('Calendar Sync & iCal Feed', () => {
  const originalFetch = global.fetch
  const originalLocalStorage = global.localStorage
  let mockFetch: jest.Mock
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch = jest.fn()
    global.fetch = mockFetch

    localStorageMock = {}
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => localStorageMock[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: jest.fn((key: string) => {
          delete localStorageMock[key]
        }),
        clear: jest.fn(() => {
          localStorageMock = {}
        }),
      },
      writable: true,
      configurable: true,
    })
  })

  afterAll(() => {
    global.fetch = originalFetch
    global.localStorage = originalLocalStorage
  })

  describe('syncUserAssignments', () => {
    it('queries Moodle functions client-side, posts assignments to /api/moodle/sync, updates localStorage timestamp, and returns success', async () => {
      ;(getSiteInfo as jest.Mock).mockResolvedValueOnce({
        userid: 42,
        username: 'student42',
        fullname: 'Test Student',
        sitename: 'SRIHER',
        userpictureurl: '',
      })

      ;(getCurrentCourses as jest.Mock).mockResolvedValueOnce([
        {
          id: 101,
          fullname: 'Biochemistry',
          shortname: 'BIO101',
          progress: null,
          lastaccess: null,
          startdate: 0,
          enddate: 0,
          courseimage: null,
        },
      ])

      const mockAssignments = [
        {
          id: 201,
          cmid: 501,
          course: 101,
          coursename: 'Biochemistry',
          name: 'Lab Report 1',
          duedate: 1774000000,
          cutoffdate: 0,
          allowsubmissionsfromdate: 0,
          intro: 'Submit report',
          grade: 100,
        },
      ]

      ;(getAssignments as jest.Mock).mockResolvedValueOnce(mockAssignments)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await syncUserAssignments('test-moodle-token')

      expect(getSiteInfo).toHaveBeenCalledWith('test-moodle-token')
      expect(getCurrentCourses).toHaveBeenCalledWith('test-moodle-token', 42)
      expect(getAssignments).toHaveBeenCalledWith('test-moodle-token', [101])

      expect(mockFetch).toHaveBeenCalledWith('/api/moodle/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: mockAssignments }),
      })

      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'moodle_last_sync_timestamp',
        expect.any(String)
      )
      expect(result).toEqual({ success: true, count: 1 })
    })

    it('handles network failure defensively and returns success: false with error message', async () => {
      ;(getSiteInfo as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to fetch Moodle site info')
      )

      const result = await syncUserAssignments('invalid-token')

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toContain('Failed to fetch Moodle site info')
    })
  })

  describe('Calendar Feed Route (RFC 5545 & Headers)', () => {
    it('returns RFC 5545 calendar headers: X-PUBLISHED-TTL:PT15M, REFRESH-INTERVAL, SEQUENCE:1, STATUS:CONFIRMED, and LAST-MODIFIED', async () => {
      mockConnectionData = {
        last_sync: '2026-09-08T05:00:00.000Z',
        cached_assignments: [
          {
            id: 999,
            name: 'Final Project',
            coursename: 'Computer Science',
            duedate: 1774000000, // 2026-03-20T09:46:40Z
          },
        ],
      }

      const req = new Request('http://localhost/api/calendar/feed/user-xyz')
      const res = await calendarFeedGet(req, { params: Promise.resolve({ userId: 'user-xyz' }) })

      expect(res.status).toBe(200)

      // HTTP Headers
      expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
      expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="notmoodle-deadlines.ics"')
      expect(res.headers.get('Cache-Control')).toBe('no-cache, no-store, max-age=0, must-revalidate')

      const icsBody = await res.text()

      // iCalendar RFC 5545 calendar refresh headers
      expect(icsBody).toContain('X-PUBLISHED-TTL:PT15M')
      expect(icsBody).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT15M')

      // iCalendar event attributes
      expect(icsBody).toContain('BEGIN:VEVENT')
      expect(icsBody).toContain('UID:assign_999@notmoodle.com')
      expect(icsBody).toContain('SUMMARY:[Due] Final Project')
      expect(icsBody).toContain('SEQUENCE:1')
      expect(icsBody).toContain('STATUS:CONFIRMED')
      expect(icsBody).toContain('LAST-MODIFIED:20260908T050000Z')
      expect(icsBody).toContain('END:VEVENT')
    })
  })
})
