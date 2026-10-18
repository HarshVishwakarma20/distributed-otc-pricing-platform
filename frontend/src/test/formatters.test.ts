import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatBps,
  formatNumber,
  formatDate,
} from '../utils/formatters'

describe('Financial Formatters', () => {
  it('formats currency correctly in full and compact modes', () => {
    expect(formatCurrency(1425000000, 'USD', true)).toBe('$1.43B')
    expect(formatCurrency(48320500, 'USD', true)).toBe('$48.32M')
    expect(formatCurrency(642300, 'USD', true)).toBe('$642.3K')
    expect(formatCurrency(1500.5, 'USD', false)).toBe('$1,500.50')
  })

  it('formats percentages with optional sign', () => {
    expect(formatPercent(1.35)).toBe('+1.35%')
    expect(formatPercent(-2.45)).toBe('-2.45%')
    expect(formatPercent(0.0)).toBe('0.00%')
  })

  it('formats basis points (bps)', () => {
    expect(formatBps(12.5)).toBe('+12.5 bps')
    expect(formatBps(-5.0)).toBe('-5.0 bps')
  })

  it('formats integer counts with thousands separators', () => {
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(84)).toBe('84')
  })

  it('formats date strings', () => {
    const formatted = formatDate('2026-10-14')
    expect(formatted).toContain('2026')
    expect(formatted).toContain('14')
  })
})
