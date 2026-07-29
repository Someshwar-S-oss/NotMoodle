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
