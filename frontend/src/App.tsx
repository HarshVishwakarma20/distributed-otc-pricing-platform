import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './components/layout/AppLayout'

// Page Components
import { OverviewPage } from './pages/OverviewPage'
import { DerivativesPage } from './pages/DerivativesPage'
import { PricingWorkbenchPage } from './pages/PricingWorkbenchPage'
import { RiskAnalyticsPage } from './pages/RiskAnalyticsPage'
import { MonteCarloLabPage } from './pages/MonteCarloLabPage'
import { PortfoliosPage } from './pages/PortfoliosPage'
import { MarketDataPage } from './pages/MarketDataPage'
import { ValuationHistoryPage } from './pages/ValuationHistoryPage'
import { ReportsPage } from './pages/ReportsPage'
import { SystemHealthPage } from './pages/SystemHealthPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="derivatives" element={<DerivativesPage />} />
            <Route path="pricing" element={<PricingWorkbenchPage />} />
            <Route path="risk" element={<RiskAnalyticsPage />} />
            <Route path="monte-carlo" element={<MonteCarloLabPage />} />
            <Route path="portfolios" element={<PortfoliosPage />} />
            <Route path="market-data" element={<MarketDataPage />} />
            <Route path="valuation-history" element={<ValuationHistoryPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="system-health" element={<SystemHealthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
