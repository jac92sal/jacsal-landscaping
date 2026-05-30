import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BookingFlow } from './BookingFlow';
import { Admin } from './components/admin/Admin';
import { WidgetView } from './components/WidgetView';

// Note: the admin dashboard is intentionally NOT linked from the public UI.
// It stays reachable by navigating directly to /admin.
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookingFlow />} />
        <Route path="/widget" element={<WidgetView />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
