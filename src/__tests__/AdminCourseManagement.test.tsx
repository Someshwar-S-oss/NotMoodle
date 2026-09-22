import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from '../app/admin/page'

jest.mock('../utils/supabase/client', () => ({
  createClient: jest.fn(),
}))
jest.mock('../lib/audit-logger', () => ({
  recordClientAudit: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const { createClient } = require('../utils/supabase/client')
const { recordClientAudit } = require('../lib/audit-logger')

describe('AdminPage Course Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()

    createClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { is_superuser: true } }),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [] }),
        }
      }),
    })
  })

  it('renders Courses tab and displays course items with visibility toggle', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/courses/catalog')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            courses: [
              { course_id: 101, fullname: 'Machine Learning', shortname: 'CS401', is_hidden: false },
              { course_id: 102, fullname: 'Old Chemistry Lab', shortname: 'CH101', is_hidden: true },
            ],
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ auditLogs: [], totalCount: 0 }),
      })
    })

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Courses')).toBeInTheDocument()
    })

    // Click on Courses tab
    fireEvent.click(screen.getByRole('tab', { name: /courses/i }))

    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    expect(screen.getByText('Old Chemistry Lab')).toBeInTheDocument()
    expect(screen.getByText('Hide Course')).toBeInTheDocument()
    expect(screen.getByText('Show Course')).toBeInTheDocument()
  })

  it('filters courses via search input and visibility status pills', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/courses/catalog')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            courses: [
              { course_id: 101, fullname: 'Machine Learning', shortname: 'CS401', is_hidden: false },
              { course_id: 102, fullname: 'Old Chemistry Lab', shortname: 'CH101', is_hidden: true },
              { course_id: 103, fullname: 'Advanced Chemistry', shortname: 'CH301', is_hidden: false },
            ],
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ auditLogs: [], totalCount: 0 }),
      })
    })

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /courses/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /courses/i }))

    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    expect(screen.getByText('Old Chemistry Lab')).toBeInTheDocument()
    expect(screen.getByText('Advanced Chemistry')).toBeInTheDocument()

    // Test Search by title/code
    const searchInput = screen.getByLabelText(/search courses/i)
    fireEvent.change(searchInput, { target: { value: 'Chemistry' } })

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument()
    expect(screen.getByText('Old Chemistry Lab')).toBeInTheDocument()
    expect(screen.getByText('Advanced Chemistry')).toBeInTheDocument()

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByText('Machine Learning')).toBeInTheDocument()

    // Filter by Visible
    const visiblePill = screen.getByRole('button', { name: /^visible$/i })
    fireEvent.click(visiblePill)

    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    expect(screen.getByText('Advanced Chemistry')).toBeInTheDocument()
    expect(screen.queryByText('Old Chemistry Lab')).not.toBeInTheDocument()

    // Filter by Hidden
    const hiddenPill = screen.getByRole('button', { name: /^hidden$/i })
    fireEvent.click(hiddenPill)

    expect(screen.queryByText('Machine Learning')).not.toBeInTheDocument()
    expect(screen.queryByText('Advanced Chemistry')).not.toBeInTheDocument()
    expect(screen.getByText('Old Chemistry Lab')).toBeInTheDocument()
  })

  it('optimistically updates visibility and calls toggle endpoint without duplicate client audit log', async () => {
    let togglePayload: any = null

    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/courses/catalog')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            courses: [
              { course_id: 101, fullname: 'Machine Learning', shortname: 'CS401', is_hidden: false },
            ],
          }),
        })
      }
      if (url.includes('/api/admin/courses/toggle-visibility')) {
        togglePayload = JSON.parse(opts.body)
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, courseId: 101, isHidden: true }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ auditLogs: [], totalCount: 0 }),
      })
    })

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /courses/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /courses/i }))

    const hideBtn = screen.getByRole('button', { name: /hide course/i })
    fireEvent.click(hideBtn)

    await waitFor(() => {
      expect(togglePayload).toEqual({ courseId: 101, isHidden: true })
      expect(recordClientAudit).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /show course/i })).toBeInTheDocument()
    })
  })

  it('rolls back optimistic update when toggle endpoint fails', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/courses/catalog')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            courses: [
              { course_id: 101, fullname: 'Machine Learning', shortname: 'CS401', is_hidden: false },
            ],
          }),
        })
      }
      if (url.includes('/api/admin/courses/toggle-visibility')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Database error' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ auditLogs: [], totalCount: 0 }),
      })
    })

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /courses/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /courses/i }))

    const hideBtn = screen.getByRole('button', { name: /hide course/i })
    fireEvent.click(hideBtn)

    await waitFor(() => {
      // Must rollback to Hide Course
      expect(screen.getByRole('button', { name: /hide course/i })).toBeInTheDocument()
      expect(recordClientAudit).not.toHaveBeenCalled()
    })
  })
})
