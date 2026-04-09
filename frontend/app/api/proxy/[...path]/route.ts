import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = process.env.API_URL || 'http://localhost:8001'
  const pathStr = params.path.join('/')
  const queryString = request.nextUrl.search
  const url = `${backendUrl}/${pathStr}${queryString}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: request.headers,
    })

    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    })
  } catch (error) {
    console.error('[proxy] GET error:', url, error)
    return NextResponse.json(
      { error: 'Proxy error' },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = process.env.API_URL || 'http://localhost:8001'
  const pathStr = params.path.join('/')
  const queryString = request.nextUrl.search
  const url = `${backendUrl}/${pathStr}${queryString}`

  console.log('[proxy POST] API_URL:', process.env.API_URL, '| Full URL:', url)

  try {
    const body = await request.text()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      body: body || undefined,
    })

    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    })
  } catch (error) {
    console.error('[proxy] POST error:', url, error)
    return NextResponse.json(
      { error: 'Proxy error' },
      { status: 502 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = process.env.API_URL || 'http://localhost:8001'
  const pathStr = params.path.join('/')
  const queryString = request.nextUrl.search
  const url = `${backendUrl}/${pathStr}${queryString}`

  try {
    const body = await request.text()

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      body: body || undefined,
    })

    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    })
  } catch (error) {
    console.error('[proxy] PATCH error:', url, error)
    return NextResponse.json(
      { error: 'Proxy error' },
      { status: 502 }
    )
  }
}
