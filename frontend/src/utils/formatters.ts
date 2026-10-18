export function formatCurrency(
  value: number,
  currency: string = 'USD',
  compact: boolean = false
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00'
  }

  if (compact && Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }

  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }

  if (compact && Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, includeSign: boolean = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%'
  }
  const sign = includeSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatBps(value: number, includeSign: boolean = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0 bps'
  }
  const sign = includeSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} bps`
}

export function formatNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(d) + ' UTC'
  } catch {
    return isoString
  }
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(d)
  } catch {
    return dateString
  }
}
