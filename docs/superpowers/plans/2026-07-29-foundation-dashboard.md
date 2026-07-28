# Foundation & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Next.js application, set up Supabase for auth/data, implement the Moodle API token exchange flow, and build a unified cross-course timeline dashboard.

**Architecture:** Next.js (App Router), Supabase Auth & PostgreSQL, Vercel Serverless Functions to securely proxy Moodle API requests.

**Tech Stack:** Next.js 14+, React, Tailwind CSS, `@supabase/supabase-js`, `jest` and `@testing-library/react` for testing.

## Global Constraints
- Use Next.js App Router (`app/` directory).
- Moodle credentials must never be sent to the browser or stored unencrypted.
- Write tests using Jest and React Testing Library.
- Components should use Tailwind CSS for styling.

---

### Task 1: Project Scaffolding & Setup

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `jest.config.ts`

**Interfaces:**
- Consumes: N/A
- Produces: Initialized Next.js project with Jest configured.

- [ ] **Step 1: Scaffold Next.js App**
Run: `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --use-npm --no-import-alias`
(Since the directory is not empty due to `docs`, you might need to run this in a temp folder and move it, or just force it depending on npm version. Assuming standard Next.js setup with `src/app`).

- [ ] **Step 2: Install Dependencies**
Run: `npm install @supabase/supabase-js lucide-react`
Run: `npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-node`

- [ ] **Step 3: Configure Jest**
Create `jest.config.ts`:
```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
export default createJestConfig(config);
```
Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Commit**
```bash
git add .
git commit -m "chore: initial next.js setup with jest and supabase"
```

---

### Task 2: Supabase Client Utilities

**Files:**
- Create: `src/utils/supabase/client.ts`
- Create: `src/utils/supabase/server.ts`
- Create: `src/utils/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `.env.local`

**Interfaces:**
- Consumes: Environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces: `createClient` functions for browser and server contexts.

- [ ] **Step 1: Set up Supabase utilities**
Run `npm install @supabase/ssr`

Create `src/utils/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `set` method was called from a Server Component.
          }
        },
      },
    }
  )
}
```

Create `src/utils/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Add basic middleware**
Create `src/middleware.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 3: Commit**
```bash
git add src/utils/supabase/ src/middleware.ts package.json package-lock.json
git commit -m "feat: add supabase ssr clients and middleware"
```

---

### Task 3: Authentication UI (Login/Signup)

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`

**Interfaces:**
- Produces: `/login` route that authenticates a user and redirects to `/`.

- [ ] **Step 1: Write auth actions**
Create `src/app/login/actions.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) { redirect('/login?error=Invalid login credentials') }
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)
  if (error) { redirect('/login?error=Could not authenticate user') }
  revalidatePath('/', 'layout')
  redirect('/')
}
```

- [ ] **Step 2: Write Login Page**
Create `src/app/login/page.tsx`:
```tsx
import { login, signup } from './actions'

export default function LoginPage({ searchParams }: { searchParams: { error: string } }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
      <form className="flex w-full max-w-md flex-col justify-center gap-4 border border-gray-700 p-8 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">Login to Custom Moodle</h1>
        {searchParams?.error && <p className="text-red-500 bg-red-900/50 p-3 rounded">{searchParams.error}</p>}
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <input className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 mb-2" name="email" type="email" placeholder="you@example.com" required />
        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <input className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 mb-4" type="password" name="password" placeholder="••••••••" required />
        <button formAction={login} className="bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-2 font-medium">Log In</button>
        <button formAction={signup} className="border border-gray-600 hover:bg-gray-700 rounded-md px-4 py-2 font-medium mt-2">Sign Up</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add src/app/login/
git commit -m "feat: add login and signup page with actions"
```

---

### Task 4: Moodle API Token Exchange Route

**Files:**
- Create: `src/app/api/moodle/connect/route.ts`

**Interfaces:**
- Consumes: POST body `{ username, password }`
- Produces: Encrypted token stored in Supabase `moodle_connections` table. Returns `200 OK` or error.

- [ ] **Step 1: Write API Route**
Create `src/app/api/moodle/connect/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Moodle requires URL encoded form data
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)
  formData.append('service', 'moodle_mobile_app')

  const res = await fetch('https://hselearning.sriher.com/login/token.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  })

  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 400 })
  }

  if (data.token) {
    // For MVP we just store the plaintext token, encryption should be added here
    // using pgp_sym_encrypt or edge crypto.
    const { error: dbError } = await supabase.from('moodle_connections').upsert({
      user_id: user.id,
      encrypted_token: data.token, // TODO: Add actual symmetric encryption
      last_sync: null
    })

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Failed to authenticate with Moodle' }, { status: 500 })
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/moodle/connect/route.ts
git commit -m "feat: add moodle token exchange endpoint"
```

---

### Task 5: Moodle Connection UI

**Files:**
- Create: `src/components/MoodleConnect.tsx`

**Interfaces:**
- Produces: Form component to capture Moodle credentials and send to `/api/moodle/connect`.

- [ ] **Step 1: Write MoodleConnect component**
Create `src/components/MoodleConnect.tsx`:
```tsx
'use client'

import { useState } from 'react'

export function MoodleConnect({ onConnected }: { onConnected: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/moodle/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()

    if (res.ok) {
      onConnected()
    } else {
      setError(data.error || 'Connection failed')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 border border-gray-700 rounded-lg bg-gray-800 shadow">
      <h2 className="text-xl font-bold mb-4">Connect Moodle</h2>
      <p className="text-sm text-gray-400 mb-6">Enter your university Moodle credentials to sync your courses. We don't store your password.</p>
      
      {error && <p className="mb-4 text-red-500 bg-red-900/50 p-3 rounded text-sm">{error}</p>}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="moodle-username">Moodle Username</label>
          <input id="moodle-username" className="w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="moodle-password">Moodle Password</label>
          <input id="moodle-password" type="password" className="w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button disabled={loading} className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md px-4 py-2 font-medium">
          {loading ? 'Connecting...' : 'Connect Account'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/MoodleConnect.tsx
git commit -m "feat: add moodle connection form component"
```

---

### Task 6: Moodle Proxy Route & Dashboard Layout

**Files:**
- Create: `src/app/api/moodle/courses/route.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: Moodle connection from DB.
- Produces: API returning user's courses via `core_enrol_get_users_courses`. Main dashboard logic.

- [ ] **Step 1: Write Proxy Route**
Create `src/app/api/moodle/courses/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conn } = await supabase
    .from('moodle_connections')
    .select('encrypted_token')
    .eq('user_id', user.id)
    .single()

  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  // First we need the moodle user id from core_webservice_get_site_info
  const infoRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`)
  const info = await infoRes.json()
  
  if (info.exception) return NextResponse.json({ error: 'Moodle token invalid' }, { status: 401 })

  // Now fetch courses
  const coursesRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=${info.userid}`)
  const courses = await coursesRes.json()

  return NextResponse.json({ courses })
}
```

- [ ] **Step 2: Build Dashboard Home**
Modify `src/app/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { MoodleConnect } from '@/components/MoodleConnect'
import { createClient } from '@/utils/supabase/client'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [courses, setCourses] = useState<any[]>([])

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('moodle_connections')
      .select('created_at')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setIsConnected(true)
      fetchCourses()
    } else {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    setLoading(true)
    const res = await fetch('/api/moodle/courses')
    if (res.ok) {
      const data = await res.json()
      setCourses(data.courses || [])
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-2">Your cross-course timeline and updates.</p>
        </header>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-800 rounded-lg"></div>
            <div className="h-24 bg-gray-800 rounded-lg"></div>
            <div className="h-24 bg-gray-800 rounded-lg"></div>
          </div>
        ) : !isConnected ? (
          <MoodleConnect onConnected={checkConnection} />
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Your Courses</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course: any) => (
                <div key={course.id} className="p-4 border border-gray-700 bg-gray-800 rounded-lg">
                  <h3 className="font-bold text-lg">{course.fullname}</h3>
                  <p className="text-sm text-gray-400">{course.shortname}</p>
                </div>
              ))}
              {courses.length === 0 && <p className="text-gray-500">No courses found.</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add src/app/api/moodle/courses/ src/app/page.tsx
git commit -m "feat: add dashboard courses feed and proxy route"
```
