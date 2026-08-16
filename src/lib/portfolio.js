// Aggregates a flat list of buy/sell transactions into per-ticker holdings
// using weighted-average cost (not FIFO) — simplest method that stays
// correct across partial sells without tracking individual lots.
//
// Returns EVERY ticker ever traded, including ones fully sold out (shares
// ~0) — realizedGain is only meaningful if those survive. Callers that want
// "what do I currently hold" should filter `.shares > 1e-9` themselves.
export function computeHoldings(transactions) {
  const byTicker = new Map()

  for (const tx of transactions) {
    const key = tx.ticker
    if (!byTicker.has(key)) {
      byTicker.set(key, { ticker: tx.ticker, category: tx.category, shares: 0, costBasis: 0, realizedGain: 0 })
    }
    const h = byTicker.get(key)
    h.category = tx.category // latest category wins if it was ever changed

    if (tx.action === 'buy') {
      h.shares += tx.shares
      h.costBasis += tx.shares * tx.price
    } else {
      const avgCost = h.shares > 0 ? h.costBasis / h.shares : 0
      const soldCost = tx.shares * avgCost
      h.realizedGain += tx.shares * tx.price - soldCost
      h.shares -= tx.shares
      h.costBasis -= soldCost
    }
  }

  return [...byTicker.values()].map((h) => ({
    ...h,
    avgCost: h.shares > 1e-9 ? h.costBasis / h.shares : 0,
  }))
}

export function computeCategoryRollup(holdings, quotes) {
  const withValue = holdings.map((h) => {
    const quote = quotes[h.ticker]
    const price = quote?.price ?? null
    const currentValue = price != null ? price * h.shares : null
    const unrealizedGain = currentValue != null ? currentValue - h.costBasis : null
    const unrealizedGainPercent = currentValue != null && h.costBasis > 0
      ? (unrealizedGain / h.costBasis) * 100
      : null
    return {
      ...h,
      price,
      currentValue,
      changePercent: quote?.changePercent ?? null,
      unrealizedGain,
      unrealizedGainPercent,
    }
  })

  const totalValue = withValue.reduce((sum, h) => sum + (h.currentValue ?? 0), 0)
  const totalCostBasis = withValue.reduce((sum, h) => sum + h.costBasis, 0)
  const totalUnrealizedGain = totalValue - totalCostBasis
  const totalUnrealizedGainPercent = totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : null

  // Weighted by each holding's share of total value, so a big position's
  // daily move dominates the headline number the way it should.
  const dayChangePercent = totalValue > 0
    ? withValue.reduce((sum, h) => {
        if (h.currentValue == null || h.changePercent == null) return sum
        return sum + h.changePercent * (h.currentValue / totalValue)
      }, 0)
    : null

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

  return {
    rollup,
    totalValue,
    totalCostBasis,
    totalUnrealizedGain,
    totalUnrealizedGainPercent,
    dayChangePercent,
    holdings: withValue,
  }
}
