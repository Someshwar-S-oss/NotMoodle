import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AppleActivityCard } from '@/components/kokonutui/apple-activity-card'
import { Loader } from '@/components/kokonutui/loader'
import { TypewriterTitle } from '@/components/kokonutui/type-writer'
import { Toolbar } from '@/components/kokonutui/toolbar'
import { ActionSearchBar } from '@/components/kokonutui/action-search-bar'

// JSDOM Observer mocks
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any

  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
})

describe('Kokonut UI Components', () => {
  it('renders AppleActivityCard with title and rings', () => {
    render(<AppleActivityCard title="daily goals" />)
    expect(screen.getByText('daily goals')).toBeInTheDocument()
  })

  it('renders AppleActivityCard with custom activity data and labels', () => {
    const mockActivities = [
      { label: 'pending deadlines', color: '#f59e0b', colorEnd: '#ef4444', size: 170, current: 2, target: 5, unit: 'tasks' },
      { label: 'completed submissions', color: '#10b981', colorEnd: '#34d399', size: 135, current: 8, target: 10, unit: 'done' },
      { label: 'active modules', color: '#6366f1', colorEnd: '#818cf8', size: 100, current: 4, target: 6, unit: 'courses' },
    ]
    render(<AppleActivityCard title="daily activity" activities={mockActivities} />)
    expect(screen.getByText('daily activity')).toBeInTheDocument()
    expect(screen.getByText('pending deadlines')).toBeInTheDocument()
    expect(screen.getByText('completed submissions')).toBeInTheDocument()
    expect(screen.getByText('active modules')).toBeInTheDocument()
  })

  it('renders Loader with custom title and subtitle in lowercase', () => {
    render(<Loader title="syncing coursework" subtitle="please wait" />)
    expect(screen.getByText('syncing coursework')).toBeInTheDocument()
    expect(screen.getByText('please wait')).toBeInTheDocument()
  })

  it('renders TypewriterTitle component', () => {
    render(<TypewriterTitle sequences={[{ text: 'welcome to notmoodle' }]} />)
    expect(screen.getAllByText('welcome to notmoodle').length).toBeGreaterThan(0)
  })

  it('renders Toolbar component', () => {
    render(<Toolbar ariaLabel="quick tools" />)
    expect(screen.getByLabelText('quick tools')).toBeInTheDocument()
  })

  it('renders ActionSearchBar input', () => {
    render(<ActionSearchBar placeholder="search anything..." />)
    expect(screen.getByPlaceholderText('search anything...')).toBeInTheDocument()
  })
})
