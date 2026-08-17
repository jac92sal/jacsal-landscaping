import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { IntakeFlow } from './intake/IntakeFlow'
import { AdminApp } from './admin/AdminApp'

/**
 * Plain BrowserRouter with clean paths — the app owns its own subdomain now, and
 * the Worker's static-asset config serves index.html for any unmatched route
 * (`not_found_handling: "single-page-application"`), so no hash fallback is
 * needed. The old HashRouter existed only because this used to be bundled under
 * jacsalservices.com/intake/.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Bare domain resolves to the default tenant. */}
        <Route path="/" element={<IntakeFlow />} />
        <Route path="/t/:slug" element={<IntakeFlow />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  )
}
