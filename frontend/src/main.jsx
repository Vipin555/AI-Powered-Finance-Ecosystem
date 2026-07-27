import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import FinancialAdvisor from './FinancialAdvisor.jsx'
import TaxPlanner from './TaxPlanner.jsx'
import GoalSimulator from './GoalSimulator.jsx'
import PortfolioDashboard from './PortfolioDashboard.jsx'
import IrregularIncomeDashboard from './IrregularIncomeDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/advisor" element={<FinancialAdvisor />} />
        <Route path="/tax" element={<TaxPlanner />} />
        <Route path="/simulator" element={<GoalSimulator />} />
        <Route path="/portfolio" element={<PortfolioDashboard />} />
        <Route path="/irregular-income" element={<IrregularIncomeDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

