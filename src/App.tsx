import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';

// Operational pages load when first opened, so signing in does not download
// every map, chart and 3D view at once.
const EOCCommandCenter = lazy(() => import('./pages/dashboard/EOCCommandCenter'));
const IncidentManagement = lazy(() => import('./pages/situational/incident-management/IncidentManagement'));
const IncidentDetailPage = lazy(() => import('./pages/situational/incident-management/IncidentDetailPage'));
const DisasterIntelligence = lazy(() => import('./pages/situational/disaster-intelligence/DisasterIntelligence'));
const RescueOperations = lazy(() => import('./pages/coordination/rescue-operations/RescueOperations'));
const ResourceManagement = lazy(() => import('./pages/coordination/resource-management/ResourceManagement'));
const PublicCommunication = lazy(() => import('./pages/communication/PublicCommunication'));
const ReportsAnalytics = lazy(() => import('./pages/analytics/ReportsAnalytics'));
const SystemAdministration = lazy(() => import('./pages/system/SystemAdministration'));

/** Shown for the moment a page's code is loading. */
const PageFallback: React.FC = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading page">
    <div className="dash-bone h-7 w-56 rounded-lg" />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => <div key={i} className="dash-bone h-28 rounded-2xl" />)}
    </div>
    <div className="dash-bone h-72 rounded-2xl" />
  </div>
);

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
          <Suspense fallback={<PageFallback />}>
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
          </Suspense>
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
