/**
 * Client-side Moodle API utility.
 * ALL calls go: browser → hselearning.sriher.com directly.
 * Vercel's server IPs are blocked by the university — this bypasses that.
 *
 * Usage pattern:
 *   const { token } = await fetch('/api/moodle/token').then(r => r.json())
 *   const info = await getSiteInfo(token)
 */

const MOODLE_BASE = 'https://hselearning.sriher.com'
const REST = `${MOODLE_BASE}/webservice/rest/server.php`

// ─── Core helper ────────────────────────────────────────────────────────────

async function moodleGet(token: string, wsfunction: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: 'json',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  })
  const res = await fetch(`${REST}?${qs}`)
  if (!res.ok) throw new Error(`Moodle returned HTTP ${res.status} for ${wsfunction}`)
  const data = await res.json()
  if (data?.exception) throw new Error(data.message || `Moodle exception: ${wsfunction}`)
  return data
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MoodleSiteInfo {
  userid: number
  username: string
  fullname: string
  sitename: string
  userpictureurl: string
}

export interface MoodleCourse {
  id: number
  fullname: string
  shortname: string
  progress: number | null
  lastaccess: number | null
  startdate: number
  enddate: number
  courseimage: string | null
}

export interface MoodleAssignment {
  id: number
  cmid: number
  course: number
  coursename: string
  name: string
  duedate: number
  cutoffdate: number
  allowsubmissionsfromdate: number
  intro: string
  grade: number
  configs?: any[]
}

export interface MoodleSubmissionStatus {
  submitted: boolean
  status: 'submitted' | 'draft' | 'new'
  timemodified: number | null
  files: { filename: string; filesize: number; fileurl: string }[]
  gradingstatus: string
  graded: boolean
}

export interface MoodleSearchItem {
  id: string
  type: string
  title: string
  course: string
  url: string
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/** Fetch site info + userid from Moodle */
export async function getSiteInfo(token: string): Promise<MoodleSiteInfo> {
  return moodleGet(token, 'core_webservice_get_site_info')
}

// ─── Courses ─────────────────────────────────────────────────────────────────

/** All enrolled courses, filtered to currently active (now between startdate and enddate) */
export async function getCurrentCourses(token: string, userid: number): Promise<MoodleCourse[]> {
  const all: any[] = await moodleGet(token, 'core_enrol_get_users_courses', { userid })
  const nowSec = Math.floor(Date.now() / 1000)
  return all
    .filter(c => {
      const started = c.startdate === 0 || nowSec >= c.startdate
      const notEnded = c.enddate === 0 || nowSec <= c.enddate
      return started && notEnded
    })
    .map(c => ({
      id: c.id,
      fullname: c.fullname,
      shortname: c.shortname,
      progress: c.progress ?? null,
      lastaccess: c.lastaccess ?? null,
      startdate: c.startdate,
      enddate: c.enddate,
      courseimage: c.courseimage ?? null,
    }))
}

/** Course contents (sections + modules) for a single course */
export async function getCourseContents(token: string, courseid: number) {
  return moodleGet(token, 'core_course_get_contents', { courseid })
}

// ─── Assignments ─────────────────────────────────────────────────────────────

/** Assignments across given course IDs, sorted by due date, excluding past cutoff */
export async function getAssignments(token: string, courseIds: number[]): Promise<MoodleAssignment[]> {
  if (!courseIds.length) return []

  const qs = courseIds.map((id, i) => `courseids[${i}]=${id}`).join('&')
  const res = await fetch(`${REST}?wstoken=${token}&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json&${qs}`)
  if (!res.ok) throw new Error(`Moodle returned HTTP ${res.status}`)
  const data = await res.json()
  if (data?.exception) throw new Error(data.message || 'Moodle exception: mod_assign_get_assignments')

  const assignments: MoodleAssignment[] = []
  for (const course of data.courses || []) {
    for (const a of course.assignments) {
      if (a.duedate > 0) {
        assignments.push({ ...a, coursename: course.fullname })
      }
    }
  }

  const nowSec = Math.floor(Date.now() / 1000)
  return assignments
    .filter(a => a.cutoffdate === 0 || a.cutoffdate >= nowSec)
    .sort((a, b) => a.duedate - b.duedate)
}

/** Submission status for a single assignment */
export async function getSubmissionStatus(token: string, assignid: number): Promise<MoodleSubmissionStatus> {
  const data = await moodleGet(token, 'mod_assign_get_submission_status', { assignid })
  const submission = data?.lastattempt?.submission

  if (!submission) {
    return { submitted: false, status: 'new', timemodified: null, files: [], gradingstatus: 'notgraded', graded: false }
  }

  const filePlugin = submission.plugins?.find((p: any) => p.type === 'file')
  const files = filePlugin?.fileareas?.[0]?.files?.map((f: any) => ({
    filename: f.filename,
    filesize: f.filesize,
    fileurl: f.fileurl,
  })) ?? []

  return {
    submitted: submission.status === 'submitted',
    status: submission.status,
    timemodified: submission.timemodified,
    files,
    gradingstatus: data.lastattempt?.gradingstatus ?? 'notgraded',
    graded: data.lastattempt?.graded ?? false,
  }
}

// ─── File Upload + Submission ─────────────────────────────────────────────────

/**
 * Upload a file to Moodle's draft area.
 * Returns the itemid needed for mod_assign_save_submission.
 * NOTE: This is a direct browser → Moodle upload, no server involved.
 */
export async function uploadFileToDraft(token: string, file: File): Promise<number> {
  const formData = new FormData()
  formData.append('file', file, file.name)

  const res = await fetch(`${MOODLE_BASE}/webservice/upload.php?token=${token}`, {
    method: 'POST',
    body: formData,
  })

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Moodle upload.php returned HTTP ${res.status} — check file size or token`)
  }

  const data = await res.json()
  if (data?.error) throw new Error(data.error)
  if (!Array.isArray(data) || !data[0]?.itemid) throw new Error('Upload failed: no itemid returned')

  return data[0].itemid
}

/**
 * Save a file submission for an assignment using a draft itemid.
 * Call uploadFileToDraft() first to get the itemid.
 */
export async function saveSubmission(token: string, assignmentid: number, itemid: number): Promise<void> {
  const body = new URLSearchParams({
    assignmentid: String(assignmentid),
    'plugindata[files_filemanager]': String(itemid),
  })

  const res = await fetch(
    `${REST}?wstoken=${token}&wsfunction=mod_assign_save_submission&moodlewsrestformat=json`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }
  )

  const text = await res.text()
  // save_submission returns empty body on success, JSON exception on failure
  if (text && text.trim().startsWith('{')) {
    const json = JSON.parse(text)
    if (json?.exception) throw new Error(json.message || 'Save submission failed')
  }
}

// ─── Search index ─────────────────────────────────────────────────────────────

/**
 * Build a flat search index of courses + all their modules.
 * Calls course contents for each course — can be slow for many courses.
 */
export async function buildSearchIndex(token: string, courses: MoodleCourse[]): Promise<MoodleSearchItem[]> {
  const items: MoodleSearchItem[] = []

  await Promise.all(courses.map(async course => {
    items.push({
      id: `course_${course.id}`,
      type: 'course',
      title: course.fullname,
      course: course.fullname,
      url: `/course/${course.id}`,
    })

    try {
      const contents = await getCourseContents(token, course.id)
      if (Array.isArray(contents)) {
        for (const section of contents) {
          for (const mod of section.modules || []) {
            items.push({
              id: `mod_${mod.id}`,
              type: mod.modname,
              title: mod.name,
              course: course.fullname,
              url: `/course/${course.id}?mod=${mod.id}`,
            })
          }
        }
      }
    } catch {
      // Non-fatal: skip contents for this course if it fails
    }
  }))

  return items
}
