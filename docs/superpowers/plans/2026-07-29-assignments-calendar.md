# Assignments & Deadlines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement unified assignment deadlines, Google Calendar one-way sync, and a seamless slide-over file submission system via Supabase Storage.

**Architecture:** Next.js frontend, Supabase Storage for staging uploads, Vercel API routes to proxy Moodle's `upload.php` and `mod_assign_save_submission`.

**Tech Stack:** Next.js 14, Supabase JS Client, Tailwind CSS.

## Global Constraints
- Use Next.js App Router (`app/` directory).
- Moodle credentials and encrypted tokens must not be exposed to the client.
- The Supabase bucket for uploads must be named `submissions`.
- Temporary files in Supabase must be aggressively deleted immediately after transfer.
- Components should use Tailwind CSS for styling.

---

### Task 1: Reusable Drawer Component

**Files:**
- Create: `src/components/Drawer.tsx`

**Interfaces:**
- Produces: `Drawer` component accepting `isOpen`, `onClose`, `title`, and `children`.

- [ ] **Step 1: Write Drawer component**
Create `src/components/Drawer.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Drawer({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-gray-900 shadow-2xl h-full flex flex-col border-l border-gray-700 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white truncate">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/Drawer.tsx
git commit -m "feat: add reusable drawer component"
```

---

### Task 3: Assignments Proxy API

**Files:**
- Create: `src/app/api/moodle/assignments/route.ts`

**Interfaces:**
- Consumes: Moodle encrypted token from DB.
- Produces: API returning user's assignments via `mod_assign_get_assignments`.

- [ ] **Step 1: Write API Route**
Create `src/app/api/moodle/assignments/route.ts`:
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

  // 1. Get info to find userid
  const infoRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`)
  const info = await infoRes.json()
  if (info.exception) return NextResponse.json({ error: 'Moodle token invalid' }, { status: 401 })

  // 2. Get enrolled courses
  const coursesRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=${info.userid}`)
  const courses = await coursesRes.json()
  
  if (!courses.length) return NextResponse.json({ assignments: [] })

  // 3. Get assignments for all courses
  const courseIds = courses.map((c: any) => `courseids[]=${c.id}`).join('&')
  const assignRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json&${courseIds}`)
  const assignData = await assignRes.json()

  // Flatten assignments
  const assignments = []
  for (const course of (assignData.courses || [])) {
    for (const assignment of course.assignments) {
      assignments.push({ ...assignment, coursename: course.fullname })
    }
  }

  // Sort by due date (ascending)
  assignments.sort((a, b) => a.duedate - b.duedate)

  return NextResponse.json({ assignments })
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/moodle/assignments/route.ts
git commit -m "feat: add assignments proxy api route"
```

---

### Task 4: File Transfer & Submission API

**Files:**
- Create: `src/app/api/moodle/submit/route.ts`

**Interfaces:**
- Consumes: `POST` with `assignmentId` and `supabaseFilePath`.
- Produces: Downloads from Supabase, pushes to Moodle `upload.php`, saves submission, deletes from Supabase.

- [ ] **Step 1: Write Submission API**
Create `src/app/api/moodle/submit/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assignmentId, supabaseFilePath, filename } = await request.json()
  if (!assignmentId || !supabaseFilePath || !filename) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // 1. Get Moodle Token
  const { data: conn } = await supabase.from('moodle_connections').select('encrypted_token').eq('user_id', user.id).single()
  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  let success = false
  let errorMessage = ''

  try {
    // 2. Download from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage.from('submissions').download(supabaseFilePath)
    if (downloadError || !fileData) throw new Error('Failed to retrieve file from staging')

    // 3. Upload to Moodle upload.php
    const formData = new FormData()
    formData.append('file', fileData as Blob, filename)

    const uploadRes = await fetch(`https://hselearning.sriher.com/webservice/upload.php?token=${conn.encrypted_token}`, {
      method: 'POST',
      body: formData
    })
    
    // Moodle upload.php returns an array of file records
    const uploadJson = await uploadRes.json()
    if (uploadJson.error) throw new Error(uploadJson.error)
    if (!Array.isArray(uploadJson) || !uploadJson[0]?.itemid) throw new Error('Upload to Moodle failed - no itemid returned')
    
    const itemid = uploadJson[0].itemid

    // 4. Save Submission
    const submitForm = new URLSearchParams()
    submitForm.append('assignmentid', assignmentId.toString())
    submitForm.append('plugindata[files_filemanager]', itemid.toString())

    const saveRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=mod_assign_save_submission&moodlewsrestformat=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: submitForm.toString()
    })
    
    const saveJson = await saveRes.json()
    if (saveJson && saveJson.exception) throw new Error(saveJson.message || 'Save submission failed')

    success = true
  } catch (error: any) {
    errorMessage = error.message || 'An unknown error occurred'
  } finally {
    // 5. AGGRESSIVE CLEANUP: Always delete from Supabase staging
    await supabase.storage.from('submissions').remove([supabaseFilePath])
  }

  if (success) {
    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/moodle/submit/route.ts
git commit -m "feat: add moodle file transfer and submission api"
```

---

### Task 5: Assignment Details & Submission UI

**Files:**
- Create: `src/components/AssignmentDetails.tsx`

**Interfaces:**
- Consumes: The `Drawer` component, Supabase storage upload.
- Produces: The view inside the Drawer to show assignment info and handle staging file uploads.

- [ ] **Step 1: Write AssignmentDetails component**
Create `src/components/AssignmentDetails.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UploadCloud, CheckCircle } from 'lucide-react'

export function AssignmentDetails({ assignment }: { assignment: any }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setSuccess(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('Not authenticated')
      setUploading(false)
      return
    }

    const ext = file.name.split('.').pop()
    const filePath = `${user.id}/${assignment.id}-${Date.now()}.${ext}`

    // 1. Stage in Supabase
    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filePath, file)

    if (uploadError) {
      setError('Failed to stage file: ' + uploadError.message)
      setUploading(false)
      return
    }

    // 2. Trigger Backend Transfer
    const res = await fetch('/api/moodle/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        assignmentId: assignment.id, 
        supabaseFilePath: filePath,
        filename: file.name
      })
    })

    const data = await res.json()
    if (res.ok) {
      setSuccess(true)
      setFile(null)
    } else {
      setError(data.error || 'Submission transfer failed')
    }
    
    setUploading(false)
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h3 className="text-xl font-bold">{assignment.name}</h3>
        <p className="text-gray-400 text-sm mt-1">{assignment.coursename}</p>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h4 className="font-semibold mb-2">Instructions</h4>
        <div className="text-sm prose prose-invert" dangerouslySetInnerHTML={{ __html: assignment.intro }} />
      </div>

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h4 className="font-semibold mb-4">Submit Assignment</h4>
        
        {success ? (
          <div className="flex items-center text-green-400 bg-green-900/30 p-3 rounded">
            <CheckCircle className="mr-2 h-5 w-5" />
            Submission recorded in Moodle!
          </div>
        ) : (
          <div className="space-y-4">
            <input 
              type="file" 
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button 
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex w-full justify-center items-center py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
            >
              {uploading ? 'Submitting...' : <><UploadCloud className="mr-2 h-5 w-5" /> Submit File</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/AssignmentDetails.tsx
git commit -m "feat: add assignment details and submission ui"
```

---

### Task 6: Add Assignments to Dashboard

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `/api/moodle/assignments`, `Drawer`, `AssignmentDetails`.

- [ ] **Step 1: Update page.tsx to fetch assignments and use the Drawer**
Modify `src/app/page.tsx` (replace entire file):
```tsx
'use client'

import { useEffect, useState } from 'react'
import { MoodleConnect } from '@/components/MoodleConnect'
import { Drawer } from '@/components/Drawer'
import { AssignmentDetails } from '@/components/AssignmentDetails'
import { createClient } from '@/utils/supabase/client'
import { Calendar } from 'lucide-react'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)

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
      fetchAssignments()
    } else {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    setLoading(true)
    const res = await fetch('/api/moodle/assignments')
    if (res.ok) {
      const data = await res.json()
      setAssignments(data.assignments || [])
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-2">Your cross-course timeline and upcoming deadlines.</p>
        </header>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-800 rounded-lg"></div>
            <div className="h-16 bg-gray-800 rounded-lg"></div>
          </div>
        ) : !isConnected ? (
          <MoodleConnect onConnected={checkConnection} />
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center">
              <Calendar className="mr-2 h-5 w-5" /> Upcoming Deadlines
            </h2>
            <div className="flex flex-col gap-3">
              {assignments.map((assignment: any) => (
                <button 
                  key={assignment.id} 
                  onClick={() => setSelectedAssignment(assignment)}
                  className="p-4 border border-gray-700 bg-gray-800 rounded-lg text-left hover:bg-gray-750 transition-colors hover:border-gray-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{assignment.name}</h3>
                      <p className="text-sm text-gray-400">{assignment.coursename}</p>
                    </div>
                    <span className="text-sm font-medium text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full">
                      {new Date(assignment.duedate * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
              {assignments.length === 0 && <p className="text-gray-500">No upcoming assignments found.</p>}
            </div>
          </div>
        )}
      </div>

      <Drawer 
        isOpen={!!selectedAssignment} 
        onClose={() => setSelectedAssignment(null)} 
        title="Assignment Details"
      >
        {selectedAssignment && <AssignmentDetails assignment={selectedAssignment} />}
      </Drawer>
    </main>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/page.tsx
git commit -m "feat: integrate assignments list and drawer into dashboard"
```
