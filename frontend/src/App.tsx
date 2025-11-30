import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import { ActualPage } from './pages/ActualPage'
import { ReportPage } from './pages/ReportPage'
import { PricesPage } from './pages/PricesPage'
import { HistoryPage } from './pages/HistoryPage'
import { TemplatesPage } from './pages/TemplatesPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1분
      retry: 1,
    },
  },
})

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />
      case 'upload':
        return <UploadPage />
      case 'actual':
        return <ActualPage />
      case 'report':
        return <ReportPage />
      case 'prices':
        return <PricesPage />
      case 'history':
        return <HistoryPage />
      case 'templates':
        return <TemplatesPage />
      default:
        return <DashboardPage onNavigate={setCurrentPage} />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
