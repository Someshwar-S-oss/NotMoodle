// src/__tests__/MoodleAllCoursesFetch.test.ts
import { getCurrentCourses } from '../lib/moodle-client'

describe('getCurrentCourses without date filter', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('returns both past expired courses and current courses', async () => {
    const mockMoodleCourses = [
      {
        id: 101,
        fullname: 'Expired Past Course',
        shortname: 'PAST101',
        startdate: 1600000000,
        enddate: 1610000000, // Long expired
        progress: 100,
        lastaccess: 1610000000,
        courseimage: null,
      },
      {
        id: 202,
        fullname: 'Active Current Course',
        shortname: 'CURR202',
        startdate: 1700000000,
        enddate: 0,
        progress: 45,
        lastaccess: 1705000000,
        courseimage: null,
      }
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoodleCourses,
    })

    const courses = await getCurrentCourses('test-token', 42)
    expect(courses).toHaveLength(2)
    expect(courses.map(c => c.id)).toEqual([101, 202])
  })

  it('returns empty array if moodle response is not an array', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    })

    const courses = await getCurrentCourses('test-token', 42)
    expect(courses).toEqual([])
  })
})
