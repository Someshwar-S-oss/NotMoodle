import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AssignmentDetails } from '@/components/AssignmentDetails'

// Mock moodle-client
jest.mock('../lib/moodle-client', () => ({
  getSubmissionStatus: jest.fn().mockResolvedValue({ submitted: false, status: 'new', files: [] }),
  uploadFileToDraft: jest.fn(),
  saveSubmission: jest.fn(),
}))

describe('AssignmentDetails', () => {
  const mockAssignment = {
    id: 101,
    name: 'Research Paper Submission',
    coursename: 'CS101 Intro to AI',
    duedate: Math.floor(Date.now() / 1000) + 86400,
    intro: '<p>Please write a 2-page summary.</p>',
    grade: 100,
    introattachments: [
      {
        filename: 'guidelines.pdf',
        filesize: 102400,
        fileurl: 'https://example.com/guidelines.pdf',
      },
    ],
  }

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'mock-token' }),
    } as any)
  })

  it('renders assignment title, course, due date, attachments, and actions', async () => {
    render(<AssignmentDetails assignment={mockAssignment} />)
    expect(await screen.findByText('Research Paper Submission')).toBeInTheDocument()
    expect(screen.getByText('CS101 Intro to AI')).toBeInTheDocument()
    expect(screen.getByText(/open in moodle/i)).toBeInTheDocument()
    expect(screen.getByText('guidelines.pdf')).toBeInTheDocument()
  })
})
