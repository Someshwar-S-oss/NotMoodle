'use client'

import { useState } from 'react'

const MOODLE_URL = 'https://hselearning.sriher.com'

export function MoodleConnect({ onConnected }: { onConnected: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Step 1: Fetch token directly from Moodle (browser → Moodle, uses user's IP)
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)
      formData.append('service', 'moodle_mobile_app')

      const moodleRes = await fetch(`${MOODLE_URL}/login/token.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      })

      const contentType = moodleRes.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        setError('Could not reach the Moodle server. Are you connected to the university network?')
        setLoading(false)
        return
      }

      const moodleData = await moodleRes.json()

      if (moodleData.error) {
        setError(moodleData.error || 'Invalid credentials. Please try again.')
        setLoading(false)
        return
      }

      if (!moodleData.token) {
        setError('Moodle did not return a token. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Send only the token to our API to store (never send password to our server)
      const res = await fetch('/api/moodle/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: moodleData.token }),
      })

      const data = res.headers.get('content-type')?.includes('application/json')
        ? await res.json()
        : {}

      if (res.ok) {
        onConnected()
      } else {
        setError(data.error || 'Failed to save connection. Please try again.')
      }
    } catch (err) {
      // CORS or network error from Moodle fetch
      setError('Could not reach Moodle. If you are off-campus, try connecting to the university VPN or network.')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 border border-gray-700 rounded-lg bg-gray-800 shadow">
      <h2 className="text-xl font-bold mb-4">Connect Moodle</h2>
      <p className="text-sm text-gray-400 mb-6">Enter your university Moodle credentials to sync your courses. Your password is never sent to our servers.</p>
      
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


