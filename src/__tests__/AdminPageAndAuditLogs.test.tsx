import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from '@/app/admin/page'

// Mock audit-logger
const mockRecordClientAudit = jest.fn()
jest.mock('../lib/audit-logger', () => ({
  recordClientAudit: (...args: any[]) => mockRecordClientAudit(...args),
}))

// Mock Supabase
let mockUser: any = null
let mockProfile: any = null
let mockProfilesList: any[] = []
const mockUpdate = jest.fn()

const mockSupabase = {
  auth: {
    getUser: jest.fn().mockImplementation(async () => ({
      data: { user: mockUser },
      error: mockUser ? null : new Error('No session'),
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
          order: jest.fn().mockImplementation(async () => ({
            data: mockProfilesList,
            error: null,
          })),
        }),
        update: mockUpdate.mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      }
    }
    return {
      select: jest.fn().mockReturnThis(),
    }
  }),
}

jest.mock('../utils/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Admin Console & Audit Log Stream (Task 2)', () => {
  let mockAuditLogsData: any[] = []
  let mockAuditLogsTotal = 0

  beforeEach(() => {
    jest.clearAllMocks()

    mockUser = { id: 'admin-user-1', email: 'admin@university.edu' }
    mockProfile = { id: 'admin-user-1', is_superuser: true }

    mockProfilesList = [
      {
        id: 'user-1',
        email: 'alice@student.edu',
        full_name: 'Alice Student',
        is_superuser: false,
        is_approved: true,
        created_at: '2026-09-01T10:00:00Z',
      },
      {
        id: 'user-2',
        email: 'bob@student.edu',
        full_name: 'Bob Pending',
        is_superuser: false,
        is_approved: false,
        created_at: '2026-09-02T12:00:00Z',
      },
      {
        id: 'admin-user-1',
        email: 'admin@university.edu',
        full_name: 'Super Admin',
        is_superuser: true,
        is_approved: true,
        created_at: '2026-08-15T08:00:00Z',
      },
    ]

    mockAuditLogsData = [
      {
        id: 'audit-1',
        user_id: 'user-1',
        user_email: 'alice@student.edu',
        action: 'assignment.submit',
        entity_type: 'assignment',
        entity_id: 'assign-101',
        details: { filename: 'report.pdf', score: 95 },
        ip_address: '192.168.1.50',
        user_agent: 'Chrome/120',
        created_at: new Date(Date.now() - 120000).toISOString(), // 2m ago
      },
      {
        id: 'audit-2',
        user_id: 'user-2',
        user_email: 'bob@student.edu',
        action: 'moodle.connect',
        entity_type: 'moodle_token',
        entity_id: 'user-2',
        details: { syncStatus: 'ok' },
        ip_address: '10.0.0.12',
        user_agent: 'Firefox/115',
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1h ago
      },
      {
        id: 'audit-3',
        user_id: 'admin-user-1',
        user_email: 'admin@university.edu',
        action: 'admin.user_approval',
        entity_type: 'user_profile',
        entity_id: 'user-1',
        details: { newStatus: true },
        ip_address: '127.0.0.1',
        user_agent: 'Safari/17',
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ]
    mockAuditLogsTotal = 3

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/admin/audit-logs')) {
        return {
          ok: true,
          json: async () => ({
            auditLogs: mockAuditLogsData,
            totalCount: mockAuditLogsTotal,
          }),
        }
      }
      return {
        ok: true,
        json: async () => ({}),
      }
    }) as jest.Mock
  })

  it('redirects unauthenticated users to /login', async () => {
    mockUser = null
    render(<AdminPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('redirects unauthorized non-superusers to /dashboard', async () => {
    mockUser = { id: 'regular-user', email: 'regular@student.edu' }
    mockProfile = { id: 'regular-user', is_superuser: false }

    render(<AdminPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('renders hero header, 4 metric cards, and navigation tabs for superusers', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Admin Console')).toBeInTheDocument()
    })

    // Metric cards
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.getByText('Total Events')).toBeInTheDocument()

    // 3 total users, 2 approved, 1 pending, 3 total events
    expect(screen.getAllByText('3').length).toBeGreaterThan(0) // Total users & events
    expect(screen.getAllByText('2').length).toBeGreaterThan(0) // Approved
    expect(screen.getAllByText('1').length).toBeGreaterThan(0) // Pending

    // Segmented tabs
    expect(screen.getByRole('tab', { name: /user management/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /audit logs/i })).toBeInTheDocument()
  })

  it('switches between User Management and Audit Logs tabs', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Alice Student')).toBeInTheDocument()
    })

    // Switch to Audit Logs tab
    const auditTab = screen.getByRole('tab', { name: /audit logs/i })
    fireEvent.click(auditTab)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by user email or entity id/i)).toBeInTheDocument()
    })

    expect(screen.getByText('assignment.submit')).toBeInTheDocument()
    expect(screen.getByText('moodle.connect')).toBeInTheDocument()

    // Switch back to User Management tab
    const userTab = screen.getByRole('tab', { name: /user management/i })
    fireEvent.click(userTab)

    await waitFor(() => {
      expect(screen.getByText('Alice Student')).toBeInTheDocument()
    })
  })

  it('filters users in real time via search input and clear button', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Alice Student')).toBeInTheDocument()
      expect(screen.getByText('Bob Pending')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText(/search users/i)
    fireEvent.change(searchInput, { target: { value: 'bob' } })

    expect(screen.getByText('Bob Pending')).toBeInTheDocument()
    expect(screen.queryByText('Alice Student')).not.toBeInTheDocument()

    // Clear search
    const clearBtn = screen.getByLabelText(/clear user search/i)
    fireEvent.click(clearBtn)

    expect(screen.getByText('Alice Student')).toBeInTheDocument()
    expect(screen.getByText('Bob Pending')).toBeInTheDocument()
  })

  it('filters users by status tabs (Approved / Pending)', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Alice Student')).toBeInTheDocument()
    })

    // Click Pending filter
    const pendingBtn = screen.getByRole('button', { name: /^pending$/i })
    fireEvent.click(pendingBtn)

    expect(screen.getByText('Bob Pending')).toBeInTheDocument()
    expect(screen.queryByText('Alice Student')).not.toBeInTheDocument()

    // Click Approved filter
    const approvedBtn = screen.getByRole('button', { name: /^approved$/i })
    fireEvent.click(approvedBtn)

    expect(screen.getByText('Alice Student')).toBeInTheDocument()
    expect(screen.queryByText('Bob Pending')).not.toBeInTheDocument()
  })

  it('toggles user approval state and logs admin.user_approval audit event', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByTestId('user-card-user-2')).toBeInTheDocument()
    })

    // Bob Pending has "Approve Access" button
    const user2Card = screen.getByTestId('user-card-user-2')
    const approveBtn = user2Card.querySelector('button')!
    expect(approveBtn).toHaveTextContent(/approve access/i)

    fireEvent.click(approveBtn)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_approved: true })
      expect(mockRecordClientAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.user_approval',
          entityType: 'user_profile',
          entityId: 'user-2',
          details: expect.objectContaining({
            userEmail: 'bob@student.edu',
            previousStatus: false,
            newStatus: true,
          }),
        })
      )
    })
  })

  it('allows category filtering in Audit Logs stream and opens inspect modal', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Admin Console')).toBeInTheDocument()
    })

    // Switch to Audit Logs tab
    const auditTab = screen.getByRole('tab', { name: /audit logs/i })
    fireEvent.click(auditTab)

    await waitFor(() => {
      expect(screen.getByTestId('audit-log-row-audit-1')).toBeInTheDocument()
    })

    // Filter pills
    const moodleFilterPill = screen.getByRole('tab', { name: 'Moodle' })
    fireEvent.click(moodleFilterPill)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('action=moodle'))
    })

    // Inspect first audit log
    const firstRow = screen.getByTestId('audit-log-row-audit-1')
    const inspectBtn = firstRow.querySelector('button')!
    expect(inspectBtn).toHaveTextContent(/inspect/i)

    fireEvent.click(inspectBtn)

    // Modal dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Audit Event Details')).toBeInTheDocument()
      expect(screen.getByTestId('audit-modal-details-json')).toHaveTextContent('report.pdf')
    })

    // Close modal via Close dialog icon button
    const closeBtn = screen.getByLabelText(/close dialog/i)
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
