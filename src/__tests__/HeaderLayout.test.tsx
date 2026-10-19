import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import fs from 'fs'
import path from 'path'

describe('Root Layout Header', () => {
  it('does not contain a pulsing green dot in layout.tsx', () => {
    const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf8')
    expect(content).not.toContain('bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse')
  })
})
