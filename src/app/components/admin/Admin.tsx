import { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminLayout } from './AdminLayout';
import { AdminOverview } from './AdminOverview';
import { BookingsView } from './BookingsView';
import { ServicesManager } from './ServicesManager';
import { QuestionsManager } from './QuestionsManager';
import { BrandingManager } from './BrandingManager';
import { EmbedCode } from './EmbedCode';
import { SecretsVault } from './SecretsVault';
import { Settings } from './Settings';
import { supabase } from '../../../lib/supabase';

export function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check if already logged in
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    // Simple authentication - in production, use proper auth
    // Default credentials: admin@example.com / admin123
    if (email === 'admin@example.com' && password === 'admin123') {
      localStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
      return true;
    }

    // Check against database (optional - requires proper password hashing)
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .single();

      if (data && !error) {
        // In production, verify password hash here
        localStorage.setItem('admin_authenticated', 'true');
        setIsAuthenticated(true);
        return true;
      }
    } catch (error) {
      console.error('Auth error:', error);
    }

    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
    setActiveTab('overview');
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
      {activeTab === 'overview' && <AdminOverview />}
      {activeTab === 'bookings' && <BookingsView />}
      {activeTab === 'services' && <ServicesManager />}
      {activeTab === 'questions' && <QuestionsManager />}
      {activeTab === 'branding' && <BrandingManager />}
      {activeTab === 'embed' && <EmbedCode />}
      {activeTab === 'secrets' && <SecretsVault />}
      {activeTab === 'settings' && <Settings />}
    </AdminLayout>
  );
}
