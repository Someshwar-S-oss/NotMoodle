import { login, signup } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error: string; message: string }> }) {
  const params = await searchParams;
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
      <form className="flex w-full max-w-md flex-col justify-center gap-4 border border-gray-700 p-8 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">Login to Custom Moodle</h1>
        {params?.error && <p className="text-red-500 bg-red-900/50 p-3 rounded">{params.error}</p>}
        {params?.message && <p className="text-green-400 bg-green-900/40 p-3 rounded">{params.message}</p>}
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
