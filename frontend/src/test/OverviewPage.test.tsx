import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { OverviewPage } from '../pages/OverviewPage'
import { renderWithProviders } from './test-utils'

// Mock ResizeObserver for Recharts
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('OverviewPage', () => {
  it('renders all 6 top-level KPI cards', async () => {
    renderWithProviders(<OverviewPage />)

    expect(screen.getByText('Total Notional')).toBeInTheDocument()
    expect(screen.getByText('Market Value (MTM)')).toBeInTheDocument()
    expect(screen.getByText('Active Contracts')).toBeInTheDocument()
    expect(screen.getByText('Daily P&L')).toBeInTheDocument()
    expect(screen.getByText('VaR 95% (1-Day)')).toBeInTheDocument()
    expect(screen.getByText('Simulation Jobs')).toBeInTheDocument()
  })

  it('renders recent valuations table and activity audit feed', async () => {
    renderWithProviders(<OverviewPage />)

    expect(screen.getByText('Recent Contract Valuations')).toBeInTheDocument()
    expect(screen.getByText('Audit & Activity Log')).toBeInTheDocument()
    expect(screen.getByText('Simulation Engine (Module 6 & 7)')).toBeInTheDocument()
  })
})
