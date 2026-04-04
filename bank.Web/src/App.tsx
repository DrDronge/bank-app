import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import RecurringPage from './pages/Recurring'
import UploadPage from './pages/Upload'
import BudgetAccountPage from './pages/BudgetAccount'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 min-h-screen">
            <div className="max-w-6xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/recurring" element={<RecurringPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/budget-account" element={<BudgetAccountPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}
