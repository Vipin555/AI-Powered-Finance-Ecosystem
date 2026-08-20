import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'
import App from './App.jsx'
import FinancialAdvisor from './FinancialAdvisor.jsx'
import TaxPlanner from './TaxPlanner.jsx'
import GoalSimulator from './GoalSimulator.jsx'
import PortfolioDashboard from './PortfolioDashboard.jsx'
import IrregularIncomeDashboard from './IrregularIncomeDashboard.jsx'
import Login from './Login.jsx'
import Signup from './Signup.jsx'
import AdminPanel from './AdminPanel.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/advisor" element={<FinancialAdvisor />} />
          <Route path="/tax" element={<TaxPlanner />} />
          <Route path="/simulator" element={<GoalSimulator />} />
          <Route path="/portfolio" element={<PortfolioDashboard />} />
          <Route path="/irregular-income" element={<IrregularIncomeDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
