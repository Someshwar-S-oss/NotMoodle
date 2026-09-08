import { getSiteInfo, getCurrentCourses, getAssignments, MoodleAssignment } from './moodle-client'

export interface SyncAssignmentsResult {
  success: boolean
  count: number
  error?: string
}

/**
 * Safely fetches assignments from Moodle in the browser (bypassing server IP blocks)
 * and synchronizes the cached assignments with the server via /api/moodle/sync.
 */
export async function syncUserAssignments(token: string): Promise<SyncAssignmentsResult> {
  try {
    // 1. Fetch site info to get the user id
    const siteInfo = await getSiteInfo(token)
    if (!siteInfo?.userid) {
      throw new Error('Could not retrieve user details from Moodle')
    }

    // 2. Fetch current enrolled courses
    const courses = await getCurrentCourses(token, siteInfo.userid)
    const courseIds = courses.map((c) => c.id)

    // 3. Fetch assignments across enrolled courses
    let assignments: MoodleAssignment[] = []
    if (courseIds.length > 0) {
      assignments = await getAssignments(token, courseIds)
    }

    // 4. Push cached assignments to /api/moodle/sync
    const res = await fetch('/api/moodle/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assignments }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `Server sync failed with HTTP ${res.status}`)
    }

    // 5. Update localStorage last sync timestamp
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('moodle_last_sync_timestamp', Date.now().toString())
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem('moodle_last_sync_timestamp', Date.now().toString())
    }

    return {
      success: true,
      count: assignments.length,
    }
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: err?.message || 'Unknown sync failure',
    }
  }
}
