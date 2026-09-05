// Live quotes via Yahoo Finance's public chart endpoint, routed through a
// small Cloudflare Worker we own (see ../../cloudflare-worker/) that adds
// CORS headers and forwards only to Yahoo's chart API. Public CORS proxies
// (allorigins.win, corsproxy.io, r.jina.ai) all turned out too unreliable —
// dead, paywalled, or rate-limited under the ~15-ticker bursts this app
// sends — so this replaced all of them rather than being another one to
// chase when it inevitably breaks too.
const PROXY_URL = 'https://yahoo-finance-proxy.abbycha23.workers.dev/'
const PROXY_TIMEOUT_MS = 6_000

const cache = new Map() // ticker -> { price, changePercent, fetchedAt }
const CACHE_TTL_MS = 60_000

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function getQuote(ticker) {
  const cached = cache.get(ticker)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached
  }

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`
  const res = await fetchWithTimeout(`${PROXY_URL}?url=${encodeURIComponent(yahooUrl)}`, PROXY_TIMEOUT_MS)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${ticker}`)

  const price = result.meta.regularMarketPrice
  const prevClose = result.meta.chartPreviousClose ?? result.meta.previousClose
  const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0

  const quote = { ticker, price, changePercent, fetchedAt: Date.now() }
  cache.set(ticker, quote)
  return quote
}

export async function getQuotes(tickers) {
  const uniqueTickers = [...new Set(tickers)]
  const results = await Promise.allSettled(uniqueTickers.map(getQuote))

  const quotes = {}
  results.forEach((r, i) => {
    const ticker = uniqueTickers[i]
    quotes[ticker] = r.status === 'fulfilled' ? r.value : { ticker, price: null, changePercent: null, error: true }
  })
  return quotes
}
