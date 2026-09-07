import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CoursePage from '@/app/course/[id]/page'
import { getCourseContents, getAssignments } from '@/lib/moodle-client'

// Mock React.use to resolve both Promise and raw objects synchronously in Jest test environment
jest.mock('react', () => {
  const actualReact = jest.requireActual('react')
  return {
    ...actualReact,
    use: (promiseOrValue: any) => {
      if (promiseOrValue && typeof promiseOrValue.then === 'function') {
        // If it's a mock promise, resolve value if attached, else default
        let resolved = { id: '1' }
        promiseOrValue.then((val: any) => {
          resolved = val
        })
        return resolved
      }
      return promiseOrValue
    },
  }
})

const mockPush = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('../utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', user_metadata: { full_name: 'Test Student' } } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { is_approved: true, full_name: 'Test Student' },
          }),
        }),
      }),
    }),
  }),
}))

let mockSections: any[] = []
let mockAssignments: any[] = []

jest.mock('../lib/moodle-client', () => ({
  getCourseContents: jest.fn().mockImplementation(() => Promise.resolve(mockSections)),
  getAssignments: jest.fn().mockImplementation(() => Promise.resolve(mockAssignments)),
}))

// Mock Drawer, FileViewer, AssignmentDetails
jest.mock('../components/Drawer', () => ({
  Drawer: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div data-testid="drawer-modal" role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}))

jest.mock('../components/FileViewer', () => ({
  FileViewer: ({ mod }: any) => (
    <div data-testid="file-viewer-content">
      <span>File: {mod.name}</span>
    </div>
  ),
}))

jest.mock('../components/AssignmentDetails', () => ({
  AssignmentDetails: ({ assignment }: any) => (
    <div data-testid="assignment-details-content">
      <span>Assignment: {assignment.name}</span>
    </div>
  ),
}))

global.fetch = jest.fn((url: any) => {
  if (url === '/api/moodle/token') {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ token: 'mock-moodle-token' }),
    } as Response)
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  } as Response)
}) as jest.Mock

describe('Course Experience & Unified Resource Filtering (Task 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = new URLSearchParams()

    mockAssignments = [
      {
        id: 101,
        cmid: 1001,
        course: 1,
        coursename: 'CS101: Introduction to Algorithms',
        name: 'Problem Set 1',
        duedate: Math.floor(Date.now() / 1000) + 86400,
        cutoffdate: 0,
        allowsubmissionsfromdate: 0,
        intro: '<p>Solve all problems.</p>',
        grade: 100,
      },
      {
        id: 102,
        cmid: 1002,
        course: 1,
        coursename: 'CS101: Introduction to Algorithms',
        name: 'Midterm Project',
        duedate: Math.floor(Date.now() / 1000) + 172800,
        cutoffdate: 0,
        allowsubmissionsfromdate: 0,
        intro: '<p>Project details.</p>',
        grade: 100,
      },
    ]

    mockSections = [
      {
        id: 1,
        name: 'Week 1: Foundations',
        modules: [
          {
            id: 1001,
            name: 'Problem Set 1',
            modname: 'assign',
            url: 'https://moodle.sriher.com/mod/assign/view.php?id=1001',
          },
          {
            id: 1003,
            name: 'Lecture Notes 1',
            modname: 'resource',
            contents: [{ filename: 'lecture1.pdf', fileurl: 'https://moodle.sriher.com/file.pdf' }],
          },
          {
            id: 1004,
            name: 'Reference Link',
            modname: 'url',
            url: 'https://example.com/algorithms',
          },
        ],
      },
      {
        id: 2,
        name: 'Week 2: Sorting',
        modules: [
          {
            id: 1002,
            name: 'Midterm Project',
            modname: 'assign',
            url: 'https://moodle.sriher.com/mod/assign/view.php?id=1002',
          },
          {
            id: 1005,
            name: 'Supplementary Folder',
            modname: 'folder',
            url: 'https://moodle.sriher.com/mod/folder/view.php?id=1005',
          },
        ],
      },
    ]
  })

  it('renders hero breadcrumb, Clash Display course title, and stats summary bar', async () => {
    render(<CoursePage params={{ id: '1' }} />)

    // Wait for course materials to load
    await waitFor(() => {
      expect(screen.getAllByText('CS101: Introduction to Algorithms')[0]).toBeInTheDocument()
    })

    // Breadcrumbs
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument()

    // Stats bar
    const statsBar = screen.getByTestId('stats-summary-bar')
    expect(statsBar).toBeInTheDocument()
    expect(statsBar).toHaveTextContent('5 Materials')
    expect(statsBar).toHaveTextContent('2 Assignments')

    // Search bar shortcut indicator
    expect(screen.getByText(/press \/ to search/i)).toBeInTheDocument()
  })

  it('filters items accurately when clicking category filter pills', async () => {
    render(<CoursePage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
    })

    // Total 5 items in All
    expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
    expect(screen.getByText('Lecture Notes 1')).toBeInTheDocument()
    expect(screen.getByText('Reference Link')).toBeInTheDocument()
    expect(screen.getByText('Midterm Project')).toBeInTheDocument()
    expect(screen.getByText('Supplementary Folder')).toBeInTheDocument()

    // Click "Assignments" filter
    const assignmentsTab = screen.getByRole('tab', { name: /assignments/i })
    fireEvent.click(assignmentsTab)

    expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
    expect(screen.getByText('Midterm Project')).toBeInTheDocument()
    expect(screen.queryByText('Lecture Notes 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Reference Link')).not.toBeInTheDocument()
    expect(screen.queryByText('Supplementary Folder')).not.toBeInTheDocument()

    // Click "PDFs & Readings" filter
    const pdfsTab = screen.getByRole('tab', { name: /pdfs & readings/i })
    fireEvent.click(pdfsTab)

    expect(screen.getByText('Lecture Notes 1')).toBeInTheDocument()
    expect(screen.getByText('Supplementary Folder')).toBeInTheDocument() // folder is under resources
    expect(screen.queryByText('Problem Set 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Reference Link')).not.toBeInTheDocument()

    // Click "Links & Folders" filter
    const linksTab = screen.getByRole('tab', { name: /links & folders/i })
    fireEvent.click(linksTab)

    expect(screen.getByText('Reference Link')).toBeInTheDocument()
    expect(screen.queryByText('Lecture Notes 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Problem Set 1')).not.toBeInTheDocument()

    // Return to "All"
    const allTab = screen.getByRole('tab', { name: /^all/i })
    fireEvent.click(allTab)
    expect(screen.getByText('Lecture Notes 1')).toBeInTheDocument()
    expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
  })

  it('filters items in real time via search input with clear button and keyboard shortcut', async () => {
    render(<CoursePage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('textbox', { name: /search course materials/i })

    // Test search filter
    fireEvent.change(searchInput, { target: { value: 'midterm' } })
    expect(screen.getByText('Midterm Project')).toBeInTheDocument()
    expect(screen.queryByText('Problem Set 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Lecture Notes 1')).not.toBeInTheDocument()

    // Clear button appears and works
    const clearBtn = screen.getByRole('button', { name: /clear search/i })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)

    expect(searchInput).toHaveValue('')
    expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
    expect(screen.getByText('Lecture Notes 1')).toBeInTheDocument()

    // Test "/" keyboard shortcut to focus search input
    searchInput.blur()
    expect(document.activeElement).not.toBe(searchInput)
    fireEvent.keyDown(window, { key: '/' })
    expect(document.activeElement).toBe(searchInput)
  })

  it('opens assignment drawer when an assignment row or View Details button is clicked', async () => {
    render(<CoursePage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
    })

    const problemSetRow = screen.getByTestId('module-item-1001')
    fireEvent.click(problemSetRow)

    await waitFor(() => {
      expect(screen.getByTestId('drawer-modal')).toBeInTheDocument()
      expect(screen.getByTestId('assignment-details-content')).toHaveTextContent('Assignment: Problem Set 1')
    })
  })

  it('opens file viewer drawer when a resource file row or Preview button is clicked', async () => {
    render(<CoursePage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('Lecture Notes 1')).toBeInTheDocument()
    })

    const lectureRow = screen.getByTestId('module-item-1003')
    fireEvent.click(lectureRow)

    await waitFor(() => {
      expect(screen.getByTestId('drawer-modal')).toBeInTheDocument()
      expect(screen.getByTestId('file-viewer-content')).toHaveTextContent('File: Lecture Notes 1')
    })
  })

  it('renders friendly empty state with Clear search & filters reset button when no results match', async () => {
    render(<CoursePage params={{ id: '1' }} />)

    await waitFor(() => {
      expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('textbox', { name: /search course materials/i })
    fireEvent.change(searchInput, { target: { value: 'nonexistent query 12345' } })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/no matching materials found/i)).toBeInTheDocument()

    const resetBtn = screen.getByRole('button', { name: /clear search & filters/i })
    expect(resetBtn).toBeInTheDocument()

    fireEvent.click(resetBtn)

    expect(searchInput).toHaveValue('')
    expect(screen.getByText('Problem Set 1')).toBeInTheDocument()
    expect(screen.getByText('Lecture Notes 1')).toBeInTheDocument()
  })
})
