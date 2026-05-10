import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PageShell from './components/layout/PageShell'
import DashboardPage from './pages/index'
import ServiceCatalogPage from './pages/service-catalog'
import CaseStudiesPage from './pages/case-studies'
import ArchitecturePage from './pages/architecture'
import MetricsPage from './pages/metrics'
import RunbooksPage from './pages/runbooks'
import ResumePage from './pages/resume'
import ContactPage from './pages/contact'

export default function App() {
  return (
    <BrowserRouter>
      <PageShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/service-catalog" element={<ServiceCatalogPage />} />
          <Route path="/case-studies" element={<CaseStudiesPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="/runbooks" element={<RunbooksPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageShell>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-slate-500 font-mono text-sm mb-2">404</p>
      <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
      <p className="text-slate-400 mb-6">
        This route doesn't exist in the control plane.
      </p>
      <a href="/" className="btn-outline">
        Return to Dashboard
      </a>
    </div>
  )
}
