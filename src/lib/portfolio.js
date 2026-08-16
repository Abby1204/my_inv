// Aggregates a flat list of buy/sell transactions into per-ticker holdings
// using weighted-average cost (not FIFO) — simplest method that stays
// correct across partial sells without tracking individual lots.
export function computeHoldings(transactions) {
  const byTicker = new Map()

  for (const tx of transactions) {
    const key = tx.ticker
    if (!byTicker.has(key)) {
      byTicker.set(key, { ticker: tx.ticker, category: tx.category, shares: 0, costBasis: 0 })
    }
    const h = byTicker.get(key)
    h.category = tx.category // latest category wins if it was ever changed

    if (tx.action === 'buy') {
      h.shares += tx.shares
      h.costBasis += tx.shares * tx.price
    } else {
      const avgCost = h.shares > 0 ? h.costBasis / h.shares : 0
      h.shares -= tx.shares
      h.costBasis -= tx.shares * avgCost
    }
  }

  return [...byTicker.values()]
    .filter((h) => h.shares > 1e-9)
    .map((h) => ({
      ...h,
      avgCost: h.costBasis / h.shares,
    }))
}

export function computeCategoryRollup(holdings, quotes) {
  const withValue = holdings.map((h) => {
    const quote = quotes[h.ticker]
    const price = quote?.price ?? null
    const currentValue = price != null ? price * h.shares : null
    return { ...h, price, currentValue }
  })

  const totalValue = withValue.reduce((sum, h) => sum + (h.currentValue ?? 0), 0)

  const byCategory = new Map()
  for (const h of withValue) {
    if (!byCategory.has(h.category)) {
      byCategory.set(h.category, { category: h.category, holdings: [], currentValue: 0 })
    }
    const c = byCategory.get(h.category)
    c.holdings.push(h)
    c.currentValue += h.currentValue ?? 0
  }

  const rollup = [...byCategory.values()]
    .map((c) => ({
      ...c,
      weightPercent: totalValue > 0 ? (c.currentValue / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.weightPercent - a.weightPercent)

  return { rollup, totalValue, holdings: withValue }
}
