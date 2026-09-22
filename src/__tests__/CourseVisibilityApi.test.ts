/**
 * @jest-environment node
 */
import { GET as getCatalog, POST as postCatalog } from '../app/api/courses/catalog/route'
import { POST as toggleVisibility } from '../app/api/admin/courses/toggle-visibility/route'

jest.mock('../utils/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('../lib/audit-logger', () => ({
  recordAuditLog: jest.fn(),
}))

const { createClient } = require('../utils/supabase/server')
const { recordAuditLog } = require('../lib/audit-logger')

describe('Course Visibility APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/courses/catalog returns 401 if unauthenticated', async () => {
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })

    const res = await getCatalog()
    expect(res.status).toBe(401)
  })

  it('GET /api/courses/catalog returns courses for authenticated user', async () => {
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ course_id: 101, fullname: 'Course 101', shortname: 'C101', is_hidden: false, updated_at: '2026-09-22T00:00:00Z' }],
          error: null,
        }),
      }),
    })

    const res = await getCatalog()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.courses).toHaveLength(1)
    expect(json.courses[0].course_id).toBe(101)
  })

  it('POST /api/courses/catalog ingests courses for authenticated user', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null })
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [] }),
        upsert: mockUpsert,
      }),
    })

    const req = new Request('http://localhost/api/courses/catalog', {
      method: 'POST',
      body: JSON.stringify({
        courses: [{ id: 101, fullname: 'Course 101', shortname: 'C101' }],
      }),
    })

    const res = await postCatalog(req)
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          course_id: 101,
          fullname: 'Course 101',
          shortname: 'C101',
        }),
      ]),
      expect.objectContaining({ onConflict: 'course_id', ignoreDuplicates: true })
    )
  })

  it('POST /api/courses/catalog preserves existing is_hidden values by skipping existing courses', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null })
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ course_id: 101, is_hidden: true }],
        }),
        upsert: mockUpsert,
      }),
    })

    const req = new Request('http://localhost/api/courses/catalog', {
      method: 'POST',
      body: JSON.stringify({
        courses: [
          { id: 101, fullname: 'Course 101 Updated Name', shortname: 'C101' },
          { id: 102, fullname: 'Course 102 New', shortname: 'C102' },
        ],
      }),
    })

    const res = await postCatalog(req)
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          course_id: 102,
          fullname: 'Course 102 New',
          shortname: 'C102',
          is_hidden: false,
        }),
      ],
      expect.objectContaining({ onConflict: 'course_id', ignoreDuplicates: true })
    )
    expect(mockUpsert).not.toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ course_id: 101 }),
      ]),
      expect.anything()
    )
  })

  it('POST /api/admin/courses/toggle-visibility forbids non-superusers', async () => {
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'regular-user' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { is_superuser: false } }),
      }),
    })

    const req = new Request('http://localhost/api/admin/courses/toggle-visibility', {
      method: 'POST',
      body: JSON.stringify({ courseId: 101, isHidden: true }),
    })

    const res = await toggleVisibility(req)
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/courses/toggle-visibility validates input parameters', async () => {
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { is_superuser: true } }),
      }),
    })

    const req = new Request('http://localhost/api/admin/courses/toggle-visibility', {
      method: 'POST',
      body: JSON.stringify({ courseId: 'invalid', isHidden: 'not-boolean' }),
    })

    const res = await toggleVisibility(req)
    expect(res.status).toBe(400)
  })

  it('POST /api/admin/courses/toggle-visibility updates visibility and logs audit for superusers', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })

    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@test.com' } } }) },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { is_superuser: true } }),
          }
        }
        return {
          update: mockUpdate,
        }
      }),
    })

    const req = new Request('http://localhost/api/admin/courses/toggle-visibility', {
      method: 'POST',
      body: JSON.stringify({ courseId: 101, isHidden: true }),
    })

    const res = await toggleVisibility(req)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_hidden: true, updated_by: 'admin-1' })
    )
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.course_visibility',
        entityType: 'course',
        entityId: '101',
      })
    )
  })
})
