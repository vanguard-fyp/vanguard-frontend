import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';

// Operational Dashboard Pages
import EOCCommandCenter from './pages/dashboard/EOCCommandCenter';
import IncidentManagement from './pages/situational/incident-management/IncidentManagement';
import IncidentDetailPage from './pages/situational/incident-management/IncidentDetailPage';
import DisasterIntelligence from './pages/situational/disaster-intelligence/DisasterIntelligence';
import RescueOperations from './pages/coordination/rescue-operations/RescueOperations';
import ResourceManagement from './pages/coordination/resource-management/ResourceManagement';
import PublicCommunication from './pages/communication/PublicCommunication';
import ReportsAnalytics from './pages/analytics/ReportsAnalytics';
import SystemAdministration from './pages/system/SystemAdministration';

// AI Copilot Sentinel Chatbot
import EocCopilotChatbot from './components/copilot/EocCopilotChatbot';

// Providers
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

const MainAppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex" style={{ background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 ${
          sidebarCollapsed ? 'md:ml-[64px]' : 'md:ml-[256px]'
        }`}
      >
        <Header
          currentRole={user?.role || 'NADMA Lead Officer'}
          onRoleChange={() => {}}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto" style={{ background: '#f8fafc' }}>
          <Routes>
            <Route path="/dashboard" element={<EOCCommandCenter />} />
            <Route path="/situational/incidents" element={<IncidentManagement />} />
            <Route path="/situational/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="/situational/intelligence" element={<DisasterIntelligence />} />
            <Route path="/response/rescue" element={<RescueOperations />} />
            <Route path="/response/resources" element={<ResourceManagement />} />
            <Route path="/communication" element={<PublicCommunication />} />
            <Route path="/analytics" element={<ReportsAnalytics />} />
            <Route path="/system" element={<SystemAdministration />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* ── Intelligent EOC Copilot / AI Sentinel Assistant ── */}
      <EocCopilotChatbot />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={<MainAppLayout />} />
            </Routes>
          </Router>
        </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
