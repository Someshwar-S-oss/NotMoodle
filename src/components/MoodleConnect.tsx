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
      setError('Could not reach Moodle. If you are off-campus, try connecting to the university VPN or network.')
    }
    setLoading(false)
  }

  return (
    <div className="p-8 border border-border/20 bg-card flex flex-col gap-6 w-full">
      {error && <p className="text-[#CC0000] bg-[#CC0000]/10 p-3 text-sm font-medium border border-[#CC0000]/20">{error}</p>}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-bold" htmlFor="moodle-username">Moodle Username</label>
          <input id="moodle-username" className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-bold" htmlFor="moodle-password">Moodle Password</label>
          <input id="moodle-password" type="password" className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button disabled={loading} className="bg-foreground text-background disabled:opacity-50 hover:scale-105 transition-transform duration-300 rounded-full px-4 py-3 font-medium uppercase tracking-widest text-sm mt-2">
          {loading ? 'Connecting...' : 'Connect Account'}
        </button>
      </form>
    </div>
  )
}


