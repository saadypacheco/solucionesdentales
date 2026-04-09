import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = process.env.API_URL || 'http://72.61.162.46:8001'
  const pathStr = params.path.join('/')
  const queryString = request.nextUrl.search
  const url = `${backendUrl}/${pathStr}${queryString}`

  try {
    console.log('[proxy GET] Fetching from:', url)
    const response = await fetch(url, {
      method: 'GET',
      headers: request.headers,
      redirect: 'manual',
    })

    console.log('[proxy GET] Response status:', response.status, 'Location:', response.headers.get('location'))
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
  const backendUrl = process.env.API_URL || 'http://72.61.162.46:8001'
  const pathStr = params.path.join('/')
  const queryString = request.nextUrl.search
  const url = `${backendUrl}/${pathStr}${queryString}`

  console.log('[proxy POST] API_URL:', process.env.API_URL, '| Full URL:', url)

  try {
    const body = await request.text()
    console.log('[proxy POST] Fetching from:', url)

    const response = await fetch(url, {
      redirect: 'manual',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      body: body || undefined,
    })

    console.log('[proxy POST] Response status:', response.status, 'Location:', response.headers.get('location'))
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
  const backendUrl = process.env.API_URL || 'http://72.61.162.46:8001'
  const pathStr = params.path.join('/')
  const queryString = request.nextUrl.search
  const url = `${backendUrl}/${pathStr}${queryString}`

  console.log('[proxy PATCH] Fetching from:', url)

  try {
    const body = await request.text()
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      body: body || undefined,
      redirect: 'manual',
    })

    console.log('[proxy PATCH] Response status:', response.status, 'Location:', response.headers.get('location'))
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
