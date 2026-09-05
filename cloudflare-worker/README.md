# Yahoo Finance CORS proxy (Cloudflare Worker)

Free public CORS proxies (allorigins.win, corsproxy.io, r.jina.ai) turned out
too unreliable for fetching ~15 tickers at once — they die, start requiring
auth, or rate-limit bursts. This is a small proxy we own instead, scoped to
only forward requests to Yahoo Finance's chart API.

## Deploy (about 5 minutes, no credit card)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up / log in (free).
2. In the left sidebar, click **Workers & Pages**.
3. Click **Create** → **Create Worker**.
4. Give it a name (e.g. `yahoo-finance-proxy`) — this becomes part of the URL.
5. Click **Deploy** to create the placeholder worker.
6. Click **Edit code**.
7. Delete the default code and paste in the contents of [`worker.js`](worker.js).
8. Click **Deploy** (or **Save and Deploy**).
9. Copy the worker's URL — shown at the top, looks like
   `https://yahoo-finance-proxy.<your-subdomain>.workers.dev`.

Send that URL back — the app's `src/lib/prices.js` gets updated to call it
instead of the old public proxies.

## Free tier limits

100,000 requests/day, no time limit, no credit card required. This app
fetches at most a few dozen quotes per dashboard load (cached 60s), so this
isn't close to being a concern.
