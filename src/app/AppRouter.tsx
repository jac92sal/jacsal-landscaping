import { BrowserRouter, HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookingFlow } from './BookingFlow';
import { Admin } from './components/admin/Admin';
import { WidgetView } from './components/WidgetView';
import { Settings } from 'lucide-react';

function AdminFab() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/widget')) return null;
  return (
    <Link
      to="/admin"
      className="fixed bottom-6 right-6 p-3 bg-muted/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:bg-muted transition-all z-50 group"
      title="Admin Dashboard"
    >
      <Settings className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:rotate-90 transition-all" />
    </Link>
  );
}

export function AppRouter() {
  // Served standalone at a root domain (Cloudflare Pages) → BrowserRouter with
  // clean paths. Bundled into jacsal-web under /intake/ (Workers static assets,
  // whose SPA fallback only knows the site root) → HashRouter, so every in-app
  // route lives after the # and never needs a server-side rewrite.
  const embedded = import.meta.env.BASE_URL !== '/';
  const Router = embedded ? HashRouter : BrowserRouter;
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BookingFlow />} />
        <Route path="/widget" element={<WidgetView />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
      <AdminFab />
    </Router>
  );
}
