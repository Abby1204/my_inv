// Cloudflare Worker: CORS proxy scoped to Yahoo Finance's public chart API.
// Deploy via the Cloudflare dashboard (Workers & Pages → Create → paste
// this in as the code → Deploy). See ../README.md for the full walkthrough.
//
// Locked to query1/query2.finance.yahoo.com on purpose — an unrestricted
// open proxy on a public URL invites abuse and could get the worker
// suspended or blow through the free-tier request quota on someone else's
// traffic, not just this app's.

const ALLOWED_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const requestUrl = new URL(request.url)
    const target = requestUrl.searchParams.get('url')

    if (!target) {
      return new Response('Missing "url" query param', { status: 400, headers: CORS_HEADERS })
    }

    let targetUrl
    try {
      targetUrl = new URL(target)
    } catch {
      return new Response('Invalid "url" query param', { status: 400, headers: CORS_HEADERS })
    }

    if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
      return new Response('Host not allowed', { status: 403, headers: CORS_HEADERS })
    }

    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    })

    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      },
    })
  },
}
