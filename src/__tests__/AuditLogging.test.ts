/**
 * @jest-environment node
 */
import { logServerAuditEvent, recordClientAudit } from '@/lib/audit-logger'
import { POST as auditPost } from '@/app/api/audit/route'

import { GET as adminAuditLogsGet } from '@/app/api/admin/audit-logs/route'
import { POST as moodleConnectPost } from '@/app/api/moodle/connect/route'
import { POST as moodleSubmitPost } from '@/app/api/moodle/submit/route'
import { GET as calendarFeedGet } from '@/app/api/calendar/feed/[userId]/route'

// Mock Supabase server client
const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockIlike = jest.fn()
const mockOr = jest.fn()
const mockOrder = jest.fn()
const mockRange = jest.fn()
const mockMaybeSingle = jest.fn()
const mockSingle = jest.fn()
const mockUpsert = jest.fn()
const mockDownload = jest.fn()
const mockRemove = jest.fn()

let mockUser: any = null
let mockProfile: any = null
let mockAuditLogsData: any[] = []
let mockAuditLogsCount: number | null = 0
let mockInsertError: any = null

const mockSupabase = {
  auth: {
    getUser: jest.fn().mockImplementation(async () => ({
      data: { user: mockUser },
      error: mockUser ? null : new Error('No session'),
    })),
  },
  from: jest.fn().mockImplementation((table: string) => {
    if (table === 'audit_logs') {
      return {
        insert: mockInsert.mockImplementation(async (payload: any) => ({
          data: mockInsertError ? null : payload,
          error: mockInsertError,
        })),
        select: mockSelect.mockImplementation(() => ({
          order: mockOrder.mockImplementation(() => ({
            ilike: mockIlike.mockImplementation(() => ({
              or: mockOr.mockImplementation(() => ({
                range: mockRange.mockImplementation(async () => ({
                  data: mockAuditLogsData,
                  count: mockAuditLogsCount,
                  error: null,
                })),
              })),
              range: mockRange.mockImplementation(async () => ({
                data: mockAuditLogsData,
                count: mockAuditLogsCount,
                error: null,
              })),
            })),
            or: mockOr.mockImplementation(() => ({
              range: mockRange.mockImplementation(async () => ({
                data: mockAuditLogsData,
                count: mockAuditLogsCount,
                error: null,
              })),
            })),
            range: mockRange.mockImplementation(async () => ({
              data: mockAuditLogsData,
              count: mockAuditLogsCount,
              error: null,
            })),
          })),
        })),
      }
    }

    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnValue({
          eq: mockEq.mockReturnValue({
            maybeSingle: mockMaybeSingle.mockImplementation(async () => ({
              data: mockProfile,
              error: null,
            })),
          }),
        }),
      }
    }

    if (table === 'moodle_connections') {
      return {
        upsert: mockUpsert.mockImplementation(async () => ({
          data: null,
          error: null,
        })),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle.mockImplementation(async () => ({
              data: { encrypted_token: 'fake-token', cached_assignments: [{ id: 1, name: 'Task 1', duedate: 1800000000, coursename: 'Bio' }], last_sync: '2026-09-08T00:00:00Z' },
              error: null,
            })),
          }),
        }),
      }
    }

    return {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
  }),
  storage: {
    from: jest.fn().mockReturnValue({
      download: mockDownload.mockResolvedValue({ data: new Blob(['content']), error: null }),
      remove: mockRemove.mockResolvedValue({ data: [], error: null }),
    }),
  },
}

jest.mock('../utils/supabase/server', () => ({
  createClient: jest.fn().mockImplementation(async () => mockSupabase),
}))


jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => mockSupabase),
}))

// Mock fetch for recordClientAudit & moodle routes
const originalFetch = global.fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Audit Logging System', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    mockUser = { id: 'user-123', email: 'user@example.com' }
    mockProfile = { id: 'user-123', is_superuser: true }
    mockAuditLogsData = [
      {
        id: 'log-1',
        user_id: 'user-123',
        user_email: 'user@example.com',
        action: 'auth.login',
        entity_type: 'user_profile',
        entity_id: 'user-123',
        details: {},
        ip_address: '127.0.0.1',
        user_agent: 'JestTest',
        created_at: '2026-09-08T00:00:00Z',
      },
    ]
    mockAuditLogsCount = 1
    mockInsertError = null
  })

  afterAll(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  describe('logServerAuditEvent utility', () => {
    it('successfully extracts headers and inserts audit event', async () => {
      const mockReq = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'Mozilla/5.0 TestBrowser',
        },
      })

      await logServerAuditEvent({
        userId: 'user-123',
        userEmail: 'user@example.com',
        action: 'assignment.submit',
        entityType: 'assignment',
        entityId: 'assign-456',
        details: { filename: 'solution.pdf' },
        req: mockReq,
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          user_email: 'user@example.com',
          action: 'assignment.submit',
          entity_type: 'assignment',
          entity_id: 'assign-456',
          details: { filename: 'solution.pdf' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 TestBrowser',
        })
      )
    })

    it('falls back to x-real-ip when x-forwarded-for is missing', async () => {
      const mockReq = new Request('http://localhost/api/test', {
        headers: {
          'x-real-ip': '10.0.0.5',
        },
      })

      await logServerAuditEvent({
        action: 'auth.login',
        entityType: 'user_profile',
        req: mockReq,
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '10.0.0.5',
          user_agent: null,
        })
      )
    })

    it('never throws even if database insert fails', async () => {
      mockInsertError = new Error('Database connection failed')
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await expect(
        logServerAuditEvent({
          action: 'moodle.connect',
          entityType: 'moodle_token',
        })
      ).resolves.not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('recordClientAudit utility', () => {
    it('dispatches a POST request to /api/audit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await recordClientAudit({
        action: 'resource.view',
        entityType: 'course_resource',
        entityId: 'resource-789',
        details: { title: 'Lecture 1' },
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resource.view',
          entityType: 'course_resource',
          entityId: 'resource-789',
          details: { title: 'Lecture 1' },
        }),
      })
    })

    it('fails silently on network errors without throwing', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        recordClientAudit({
          action: 'resource.view',
          entityType: 'course_resource',
        })
      ).resolves.not.toThrow()
    })
  })

  describe('POST /api/audit', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockUser = null
      const req = new Request('http://localhost/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resource.view',
          entityType: 'course_resource',
        }),
      })

      const res = await auditPost(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('rejects invalid request body missing required fields with 400', async () => {
      mockUser = { id: 'user-123', email: 'user@example.com' }
      const req = new Request('http://localhost/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: {} }),
      })

      const res = await auditPost(req)
      expect(res.status).toBe(400)
    })

    it('logs server audit event and returns 200 on success', async () => {
      mockUser = { id: 'user-123', email: 'user@example.com' }
      const req = new Request('http://localhost/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resource.view',
          entityType: 'course_resource',
          entityId: 'res-1',
          details: { name: 'Syllabus' },
        }),
      })

      const res = await auditPost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          user_email: 'user@example.com',
          action: 'resource.view',
          entity_type: 'course_resource',
          entity_id: 'res-1',
        })
      )
    })
  })

  describe('GET /api/admin/audit-logs', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockUser = null
      const req = new Request('http://localhost/api/admin/audit-logs')
      const res = await adminAuditLogsGet(req)
      expect(res.status).toBe(401)
    })

    it('rejects non-superuser with 403', async () => {
      mockUser = { id: 'user-123', email: 'user@example.com' }
      mockProfile = { id: 'user-123', is_superuser: false }

      const req = new Request('http://localhost/api/admin/audit-logs')
      const res = await adminAuditLogsGet(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Forbidden')
    })

    it('allows superuser and returns audit logs with total count', async () => {
      mockUser = { id: 'user-123', email: 'user@example.com' }
      mockProfile = { id: 'user-123', is_superuser: true }

      const req = new Request('http://localhost/api/admin/audit-logs?limit=20&offset=0')
      const res = await adminAuditLogsGet(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.auditLogs).toHaveLength(1)
      expect(data.totalCount).toBe(1)
    })

    it('handles action and search query filters', async () => {
      mockUser = { id: 'user-123', email: 'user@example.com' }
      mockProfile = { id: 'user-123', is_superuser: true }

      const req = new Request('http://localhost/api/admin/audit-logs?action=moodle&search=test')
      const res = await adminAuditLogsGet(req)
      expect(res.status).toBe(200)
      expect(mockIlike).toHaveBeenCalledWith('action', 'moodle%')
      expect(mockOr).toHaveBeenCalledWith(expect.stringContaining('test'))
    })
  })

  describe('Route Instrumentation', () => {
    it('instruments /api/moodle/connect on successful connection', async () => {
      mockUser = { id: 'user-123', email: 'user@example.com' }
      const req = new Request('http://localhost/api/moodle/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'moodle-token-xyz' }),
      })

      const res = await moodleConnectPost(req)
      expect(res.status).toBe(200)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          user_email: 'user@example.com',
          action: 'moodle.connect',
          entity_type: 'moodle_token',
          entity_id: 'user-123',
        })
      )
    })

    it('instruments /api/moodle/submit on successful submission', async () => {
      mockUser = { id: 'user-123', email: 'user@example.com' }
      // Mock Moodle API responses
      mockFetch.mockResolvedValueOnce({
        json: async () => [{ itemid: 12345 }],
      })
      mockFetch.mockResolvedValueOnce({
        json: async () => ({}),
      })

      const req = new Request('http://localhost/api/moodle/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: 'assign-999',
          supabaseFilePath: 'temp/file.pdf',
          filename: 'file.pdf',
        }),
      })

      const res = await moodleSubmitPost(req)
      expect(res.status).toBe(200)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          user_email: 'user@example.com',
          action: 'assignment.submit',
          entity_type: 'assignment',
          entity_id: 'assign-999',
          details: { filename: 'file.pdf', assignmentId: 'assign-999' },
        })
      )
    })

    it('instruments /api/calendar/feed/[userId] on calendar export', async () => {
      const req = new Request('http://localhost/api/calendar/feed/user-123')
      const res = await calendarFeedGet(req, { params: Promise.resolve({ userId: 'user-123' }) })
      expect(res.status).toBe(200)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'calendar.export',
          entity_type: 'calendar_feed',
          entity_id: 'user-123',
        })
      )

    })
  })
})
