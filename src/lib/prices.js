// Live quotes via Yahoo Finance's public chart endpoint, routed through a
// CORS proxy since Yahoo does not send Access-Control-Allow-Origin headers.
// This has no API key and no guaranteed uptime SLA — fine for a personal
// dashboard, but treat failures as "price temporarily unavailable", not fatal.

const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
]

const cache = new Map() // ticker -> { price, changePercent, fetchedAt }
const CACHE_TTL_MS = 60_000

async function fetchViaProxies(yahooUrl) {
  let lastError
  for (const buildProxyUrl of PROXIES) {
    try {
      const res = await fetch(buildProxyUrl(yahooUrl))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

export async function getQuote(ticker) {
  const cached = cache.get(ticker)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached
  }

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`
  const data = await fetchViaProxies(yahooUrl)
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
