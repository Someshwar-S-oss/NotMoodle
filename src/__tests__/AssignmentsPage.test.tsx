import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AssignmentsPage from '@/app/assignments/page'

const mockPush = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('../utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
  }),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
  }),
}), { virtual: true })

describe('AssignmentsPage', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
    localStorage.setItem(
      'moodle_dashboard_cache',
      JSON.stringify({
        assignments: [
          { id: 1, name: 'Assignment Alpha', course: 10, coursename: 'AI 101', duedate: Math.floor(Date.now() / 1000) - 3600 },
          { id: 2, name: 'Assignment Beta', course: 20, coursename: 'Web 201', duedate: Math.floor(Date.now() / 1000) + 7200 },
        ],
        courses: [{ id: 10, shortname: 'AI 101', fullname: 'Artificial Intelligence' }],
        events: [],
        timestamp: Date.now(),
      })
    )
  })

  it('renders assignment carousel and supports left/right switching', async () => {
    render(<AssignmentsPage />)
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: /next assignment/i })
    fireEvent.click(nextBtn)
    expect(await screen.findByText('Assignment Beta')).toBeInTheDocument()
    const prevBtn = screen.getByRole('button', { name: /previous assignment/i })
    fireEvent.click(prevBtn)
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
  })

  it('respects filter query params', async () => {
    mockSearchParams = new URLSearchParams('filter=overdue')
    render(<AssignmentsPage />)
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
  })

  it('navigates carousel using keyboard ArrowRight and ArrowLeft', async () => {
    render(<AssignmentsPage />)
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(await screen.findByText('Assignment Beta')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
  })

  it('supports jumping to assignment from quick jump strip', async () => {
    render(<AssignmentsPage />)
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
    const stripItem = screen.getByText(/#2 · Assignment Beta/i)
    fireEvent.click(stripItem)
    expect(await screen.findByText('Assignment Beta')).toBeInTheDocument()
  })

  it('filters assignments when filter tab is clicked', async () => {
    render(<AssignmentsPage />)
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
    const overdueTab = screen.getByRole('button', { name: /Overdue/i })
    fireEvent.click(overdueTab)
    expect(mockPush).toHaveBeenCalledWith('/assignments?filter=overdue')
  })

  it('opens dossier drawer when Open Dossier button is clicked', async () => {
    render(<AssignmentsPage />)
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
    const dossierBtn = screen.getByRole('button', { name: /open dossier & submit/i })
    fireEvent.click(dossierBtn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

