import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Drawer } from '@/components/Drawer'
import { FileViewer } from '@/components/FileViewer'
import { AssignmentDetails } from '@/components/AssignmentDetails'
import SettingsPage from '@/app/settings/page'
import NotificationsPage from '@/app/notifications/page'

// Mock next-themes
const mockSetTheme = jest.fn()
let mockCurrentTheme = 'light'

jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockCurrentTheme,
    setTheme: mockSetTheme,
  }),
}))

// Mock Supabase
jest.mock('../utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { encrypted_token: 'valid-token', last_sync: '2026-09-01T10:00:00Z' },
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/storage/v1/object/public/course_files/test.pdf' },
        }),
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    },
  }),
}))

// Mock moodle-client
jest.mock('../lib/moodle-client', () => ({
  uploadFileToDraft: jest.fn(),
  saveSubmission: jest.fn(),
  getSubmissionStatus: jest.fn(),
}))

describe('Drawer component', () => {
  it('renders title and children when isOpen is true', () => {
    render(
      <Drawer isOpen={true} onClose={jest.fn()} title="Test Drawer">
        <div>Drawer Child Content</div>
      </Drawer>
    )

    expect(screen.getByText('Test Drawer')).toBeInTheDocument()
    expect(screen.getByText('Drawer Child Content')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(
      <Drawer isOpen={false} onClose={jest.fn()} title="Closed Drawer">
        <div>Hidden Content</div>
      </Drawer>
    )

    expect(screen.queryByText('Closed Drawer')).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument()
  })

  it('invokes onClose callback when close button is clicked', () => {
    const handleClose = jest.fn()
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Closeable Drawer">
        <div>Content</div>
      </Drawer>
    )

    const closeBtn = screen.getByRole('button', { name: /close drawer/i })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('invokes onClose callback on Escape key press', () => {
    const handleClose = jest.fn()
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Escape Drawer">
        <div>Content</div>
      </Drawer>
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('applies rounded-2xl and shadow-2xl classes to container in normal mode', () => {
    render(
      <Drawer isOpen={true} onClose={jest.fn()} title="Styled Drawer">
        <div>Content</div>
      </Drawer>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('rounded-2xl')
    expect(dialog).toHaveClass('shadow-2xl')
    expect(dialog).toHaveClass('border-border/60')
  })

  it('applies rounded-none and max-w-none in fullScreen mode', () => {
    render(
      <Drawer isOpen={true} onClose={jest.fn()} title="Fullscreen Drawer" fullScreen={true}>
        <div>Fullscreen Content</div>
      </Drawer>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('rounded-none')
    expect(dialog).toHaveClass('max-w-none')
  })
})

describe('FileViewer component', () => {
  const mockModPdf = {
    id: 101,
    name: 'Syllabus.pdf',
    contents: [
      {
        filename: 'Syllabus.pdf',
        fileurl: 'https://moodle.example.com/files/syllabus.pdf',
      },
    ],
  }

  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      return Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test content'], { type: 'application/pdf' })),
      } as Response)
    }) as any
  })

  it('renders preview iframe and download button in rounded frame for pdf', async () => {
    render(<FileViewer mod={mockModPdf} courseId={12} token="mock-token" />)

    await waitFor(() => {
      expect(screen.getByTitle('Syllabus.pdf')).toBeInTheDocument()
    })

    expect(screen.getByText(/native browser preview/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download direct/i })).toBeInTheDocument()
  })

  it('renders office document preview toolbar for docx files', async () => {
    const mockModDocx = {
      id: 102,
      name: 'Lecture1.docx',
      contents: [
        {
          filename: 'Lecture1.docx',
          fileurl: 'https://moodle.example.com/files/lecture1.docx',
        },
      ],
    }

    render(<FileViewer mod={mockModDocx} courseId={12} token="mock-token" />)

    await waitFor(() => {
      expect(screen.getByTitle('Lecture1.docx')).toBeInTheDocument()
    })

    expect(screen.getByText(/office document preview/i)).toBeInTheDocument()
  })

  it('renders friendly error card when loading fails', async () => {
    const mockModInvalid = {
      id: 999,
      name: 'Corrupted.pdf',
      contents: [],
    }

    render(<FileViewer mod={mockModInvalid} courseId={12} token="mock-token" />)

    await waitFor(() => {
      expect(screen.getByText(/no file url found in module/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/could not load preview/i)).toBeInTheDocument()
  })
})

describe('AssignmentDetails component', () => {
  const mockAssignment = {
    id: 42,
    cmid: 1042,
    coursename: 'Systems Engineering',
    name: 'Term Project Part 1',
    duedate: 1800000000, // Future timestamp
    grade: 100,
    intro: '<p>Complete all sections and submit report.</p>',
    introattachments: [
      { filename: 'rubric.pdf', fileurl: 'https://moodle.example.com/rubric.pdf', filesize: 204800 },
    ],
  }

  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      if (typeof url === 'string' && url.includes('/api/moodle/token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-moodle-token' }),
        } as Response)
      }
      return Promise.reject(new Error('not found'))
    }) as any
  })

  it('displays pending submission status when not submitted and shows due date and files', async () => {
    const { getSubmissionStatus } = require('../lib/moodle-client')
    getSubmissionStatus.mockResolvedValueOnce({
      submitted: false,
      graded: false,
      status: 'new',
      files: [],
    })

    render(<AssignmentDetails assignment={mockAssignment} />)

    expect(screen.getByText('Term Project Part 1')).toBeInTheDocument()
    expect(screen.getByText('Systems Engineering')).toBeInTheDocument()
    expect(screen.getByText(/rubric\.pdf/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open in moodle/i })).toHaveAttribute(
      'href',
      'https://hselearning.sriher.com/mod/assign/view.php?id=1042'
    )

    await waitFor(() => {
      expect(screen.getByText(/pending submission/i)).toBeInTheDocument()
    })
  })

  it('displays submitted status pill when assignment has been submitted', async () => {
    const { getSubmissionStatus } = require('../lib/moodle-client')
    getSubmissionStatus.mockResolvedValueOnce({
      submitted: true,
      graded: true,
      status: 'submitted',
      files: [{ filename: 'final-submission.pdf', filesize: 512000 }],
    })

    render(<AssignmentDetails assignment={mockAssignment} />)

    await waitFor(() => {
      expect(screen.getByText(/submitted for grading/i)).toBeInTheDocument()
    })
    expect(screen.getByText('final-submission.pdf')).toBeInTheDocument()
  })

  it('renders interactive dropzone and updates to file preview card when file is selected or dropped', async () => {
    const { getSubmissionStatus } = require('../lib/moodle-client')
    getSubmissionStatus.mockResolvedValueOnce({
      submitted: false,
      graded: false,
      status: 'new',
      files: [],
    })

    render(<AssignmentDetails assignment={mockAssignment} />)

    await waitFor(() => {
      expect(screen.getByText(/pending submission/i)).toBeInTheDocument()
    })

    // Initial dropzone copy is present
    expect(screen.getByText(/drag and drop your assignment file here/i)).toBeInTheDocument()
    expect(screen.getByText(/supports pdf, docx, zip/i)).toBeInTheDocument()

    // File input is accessible
    const input = screen.getByLabelText(/upload assignment file/i) as HTMLInputElement
    const file = new File(['assignment content'], 'assignment1.pdf', { type: 'application/pdf' })

    // Simulate file selection
    fireEvent.change(input, { target: { files: [file] } })

    // File preview card should now be rendered
    expect(screen.getByText('assignment1.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove selected file/i })).toBeInTheDocument()
  })

  it('clears the selected file when remove button is clicked', async () => {
    const { getSubmissionStatus } = require('../lib/moodle-client')
    getSubmissionStatus.mockResolvedValueOnce({
      submitted: false,
      graded: false,
      status: 'new',
      files: [],
    })

    render(<AssignmentDetails assignment={mockAssignment} />)

    await waitFor(() => {
      expect(screen.getByText(/pending submission/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/upload assignment file/i) as HTMLInputElement
    const file = new File(['assignment content'], 'homework.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByText('homework.docx')).toBeInTheDocument()

    // Click remove button
    const removeBtn = screen.getByRole('button', { name: /remove selected file/i })
    fireEvent.click(removeBtn)

    // Drops back to dropzone
    expect(screen.queryByText('homework.docx')).not.toBeInTheDocument()
    expect(screen.getByText(/drag and drop your assignment file here/i)).toBeInTheDocument()
  })

  it('handles dragover, dragleave, and drop events on dropzone', async () => {
    const { getSubmissionStatus } = require('../lib/moodle-client')
    getSubmissionStatus.mockResolvedValueOnce({
      submitted: false,
      graded: false,
      status: 'new',
      files: [],
    })

    render(<AssignmentDetails assignment={mockAssignment} />)

    await waitFor(() => {
      expect(screen.getByText(/pending submission/i)).toBeInTheDocument()
    })

    const dropzone = screen.getByRole('button', { name: /drag and drop your assignment file here/i })

    // Fire drag over
    fireEvent.dragOver(dropzone)
    expect(dropzone).toHaveClass('border-foreground')

    // Fire drag leave
    fireEvent.dragLeave(dropzone)
    expect(dropzone).not.toHaveClass('border-foreground')

    // Fire drop
    const file = new File(['dropped file content'], 'project.zip', { type: 'application/zip' })
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    })

    expect(screen.getByText('project.zip')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove selected file/i })).toBeInTheDocument()
  })
})


describe('SettingsPage component', () => {
  beforeEach(() => {
    mockSetTheme.mockClear()
    mockCurrentTheme = 'light'
    global.fetch = jest.fn((url: any) => {
      if (typeof url === 'string' && url.includes('/api/moodle/sync')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    }) as any
  })

  it('renders theme segmented options and triggers setTheme on click', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument()
    })

    const darkButton = screen.getByRole('radio', { name: /dark/i })
    const systemButton = screen.getByRole('radio', { name: /system/i })

    fireEvent.click(darkButton)
    expect(mockSetTheme).toHaveBeenCalledWith('dark')

    fireEvent.click(systemButton)
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('renders Google Calendar sync card with copy button and 3-step setup guide', async () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })

    render(<SettingsPage />)

    expect(screen.getByText('Google Calendar Sync')).toBeInTheDocument()
    expect(screen.getByText('Quick 3-Step Setup')).toBeInTheDocument()
    expect(screen.getByText('Copy Feed URL')).toBeInTheDocument()

    // Wait for userId to load so calendarUrl is generated
    const input = await screen.findByLabelText('Google Calendar Feed URL')
    await waitFor(() => {
      expect(input).toHaveValue('http://localhost/api/calendar/feed/user-123')
    })

    const copyBtn = screen.getByRole('button', { name: /copy calendar feed url/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost/api/calendar/feed/user-123')
    })
  })

  it('renders Moodle integration status card and handles sync trigger', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/connected/i)).toBeInTheDocument()
    })

    const syncBtn = screen.getByRole('button', { name: /sync now/i })
    fireEvent.click(syncBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/moodle/sync',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})

describe('NotificationsPage component', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      title: 'Assignment 1 Due Tomorrow',
      message: 'Don forget to submit your report before 11:59 PM.',
      type: 'deadline',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10m ago
    },
    {
      id: 'notif-2',
      title: 'Lab 2 Grade Released',
      message: 'Your grade for Lab 2 is now available.',
      type: 'grade',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
    },
    {
      id: 'notif-3',
      title: 'Course Announcement',
      message: 'New office hours scheduled this Wednesday.',
      type: 'message',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // Yesterday
    },
  ]

  beforeEach(() => {
    global.fetch = jest.fn((url: any, options: any) => {
      if (typeof url === 'string' && url.includes('/api/notifications')) {
        if (options?.method === 'PATCH') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notifications: mockNotifications }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    }) as any
  })

  it('renders category filter tabs and displays notifications count', async () => {
    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Assignment 1 Due Tomorrow')).toBeInTheDocument()
    })

    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /unread/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /deadlines/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /grades/i })).toBeInTheDocument()
  })

  it('filters notifications when clicking category tabs', async () => {
    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Assignment 1 Due Tomorrow')).toBeInTheDocument()
    })

    // Click Unread tab
    const unreadTab = screen.getByRole('tab', { name: /unread/i })
    fireEvent.click(unreadTab)

    expect(screen.getByText('Assignment 1 Due Tomorrow')).toBeInTheDocument()
    expect(screen.getByText('Course Announcement')).toBeInTheDocument()
    expect(screen.queryByText('Lab 2 Grade Released')).not.toBeInTheDocument()

    // Click Grades tab
    const gradesTab = screen.getByRole('tab', { name: /grades/i })
    fireEvent.click(gradesTab)

    expect(screen.getByText('Lab 2 Grade Released')).toBeInTheDocument()
    expect(screen.queryByText('Assignment 1 Due Tomorrow')).not.toBeInTheDocument()
  })

  it('marks a notification as read on acknowledge button click', async () => {
    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Assignment 1 Due Tomorrow')).toBeInTheDocument()
    })

    const ackButtons = screen.getAllByRole('button', { name: /mark .* as read/i })
    expect(ackButtons.length).toBeGreaterThan(0)
    fireEvent.click(ackButtons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'PATCH',
        })
      )
    })
  })

  it('renders friendly cloudy glow empty state when category has no items', async () => {
    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Assignment 1 Due Tomorrow')).toBeInTheDocument()
    })

    ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ notifications: [] }),
      })
    )

    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText(/all clear — you're fully up to date!/i)).toBeInTheDocument()
    })
  })
})
