import { describe, it, expect } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { PricingWorkbenchPage } from '../pages/PricingWorkbenchPage'
import { renderWithProviders } from './test-utils'

describe('PricingWorkbenchPage (Module 3 Financial Pricing Engine)', () => {
  it('renders Module 3 status header and mode switcher', () => {
    renderWithProviders(<PricingWorkbenchPage />)

    expect(screen.getByText('Module 3: Financial Pricing Engine')).toBeInTheDocument()
    expect(screen.getByText('Operational')).toBeInTheDocument()
    expect(screen.getByText('Booked Contract')).toBeInTheDocument()
    expect(screen.getByText('Ad-Hoc / What-If')).toBeInTheDocument()
    expect(screen.getByText('Authoritative Contract Valuation')).toBeInTheDocument()
  })

  it('renders contract terms and allows switching to Ad-Hoc mode', async () => {
    renderWithProviders(<PricingWorkbenchPage />)

    // Wait for fallback contract list to load
    await waitFor(() => {
      expect(screen.getByText(/Target OTC Contract/i)).toBeInTheDocument()
    })

    // Click Ad-Hoc / What-If mode
    const adhocBtn = screen.getByText('Ad-Hoc / What-If')
    fireEvent.click(adhocBtn)

    expect(screen.getByText('Ad-Hoc Quantitative Structure Pricing')).toBeInTheDocument()
    expect(screen.getByText('Run Quantitative Pricing')).toBeInTheDocument()
  })

  it('renders valuation output placeholder and execute button', () => {
    renderWithProviders(<PricingWorkbenchPage />)

    expect(screen.getByText('Valuation Output')).toBeInTheDocument()
    expect(screen.getByText('No calculation run yet')).toBeInTheDocument()
    expect(screen.getByText('Execute Valuation')).toBeInTheDocument()
  })
})
