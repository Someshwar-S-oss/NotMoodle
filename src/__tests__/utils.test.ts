import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges class names cleanly and handles conditional falsy values', () => {
    expect(cn('px-4', 'py-2', false && 'hidden', 'text-sm')).toBe('px-4 py-2 text-sm')
  })

  it('resolves tailwind conflicts via tailwind-merge', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})
