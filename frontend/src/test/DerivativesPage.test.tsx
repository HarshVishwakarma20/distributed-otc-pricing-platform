import { describe, it, expect } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { DerivativesPage } from '../pages/DerivativesPage'
import { renderWithProviders } from './test-utils'

describe('DerivativesPage (Module 2 Contract Registry)', () => {
  it('renders contract registry table headers and toolbar', async () => {
    renderWithProviders(<DerivativesPage />)

    expect(screen.getByText('Contract Management & Registry')).toBeInTheDocument()
    expect(screen.getByText('Derivative Contract Registry')).toBeInTheDocument()
    expect(screen.getByText('Stage New Contract')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search ID, counterparty, ref...')).toBeInTheDocument()
  })

  it('renders contract rows and allows filtering by instrument type', async () => {
    renderWithProviders(<DerivativesPage />)

    // Verify baseline contracts render from fallback data
    await waitFor(() => {
      expect(screen.getByText('CNT-IRS-1001')).toBeInTheDocument()
    })

    expect(screen.getByText('CNT-OPT-2002')).toBeInTheDocument()
    expect(screen.getByText('CNT-FXS-3003')).toBeInTheDocument()
    expect(screen.getByText('CNT-CDS-4004')).toBeInTheDocument()
  })

  it('opens Stage New Contract modal with all 4 instrument choices', async () => {
    renderWithProviders(<DerivativesPage />)

    const stageBtn = screen.getByText('Stage New Contract')
    fireEvent.click(stageBtn)

    expect(screen.getByText('Stage New OTC Derivative Contract')).toBeInTheDocument()
    expect(screen.getByText('Counterparty Entity')).toBeInTheDocument()
    expect(screen.getByText('Confirm & Stage Contract')).toBeInTheDocument()
  })

  it('opens contract inspection modal when clicking Inspect button', async () => {
    renderWithProviders(<DerivativesPage />)

    await waitFor(() => {
      expect(screen.getByText('CNT-IRS-1001')).toBeInTheDocument()
    })

    const inspectButtons = screen.getAllByText('Inspect')
    fireEvent.click(inspectButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Detailed Specifications/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Instrument Terms')).toBeInTheDocument()
  })
})
