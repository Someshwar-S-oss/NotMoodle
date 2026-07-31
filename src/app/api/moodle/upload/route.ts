import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const formData = await req.formData()
    
    const moodleRes = await fetch(`https://hselearning.sriher.com/webservice/upload.php?token=${token}`, {
      method: 'POST',
      body: formData,
      // By omitting Origin and Referer, we act like Postman
      headers: {
        'User-Agent': 'PostmanRuntime/7.32.3',
        'Accept': '*/*, application/json'
      }
    })

    const text = await moodleRes.text()
    
    if (!moodleRes.ok) {
      return NextResponse.json({ error: `Moodle returned ${moodleRes.status}`, details: text }, { status: moodleRes.status })
    }

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON from Moodle', details: text }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Edge Proxy Upload Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
