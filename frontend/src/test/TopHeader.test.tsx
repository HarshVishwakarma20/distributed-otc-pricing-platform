import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { TopHeader } from '../components/layout/TopHeader'
import { renderWithProviders } from './test-utils'

describe('TopHeader', () => {
  it('renders product title, page title, and synthetic demo badge', () => {
    renderWithProviders(<TopHeader isLiveApi={true} snapshotTimestamp="2026-10-14T18:00:00Z" />)

    expect(screen.getByText('Overview Dashboard')).toBeInTheDocument()
    expect(screen.getByText('SYNTHETIC DEMO DATA')).toBeInTheDocument()
    expect(screen.getByText(/FastAPI: Online/i)).toBeInTheDocument()
  })

  it('shows standalone client fallback when backend is offline', () => {
    renderWithProviders(<TopHeader isLiveApi={false} snapshotTimestamp="2026-10-14T18:00:00Z" />)

    expect(screen.getByText(/Standalone Client Fallback/i)).toBeInTheDocument()
  })
})
