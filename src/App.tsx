import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layout
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Pages
import EOCCommandCenter from './pages/dashboard/EOCCommandCenter';
import IncidentManagement from './pages/situational/incident-management/IncidentManagement';
import IncidentDetailPage from './pages/situational/incident-management/IncidentDetailPage';
import DisasterIntelligence from './pages/situational/disaster-intelligence/DisasterIntelligence';
import RescueOperations from './pages/coordination/rescue-operations/RescueOperations';
import ResourceManagement from './pages/coordination/resource-management/ResourceManagement';
import PublicCommunication from './pages/communication/PublicCommunication';
import ReportsAnalytics from './pages/analytics/ReportsAnalytics';
import SystemAdministration from './pages/system/SystemAdministration';


import type { UserRole } from './types';

const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('Disaster Management Officer');

  return (
    <Router>
      <div className="min-h-screen flex" style={{ background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Left — calm dark slate sidebar with responsive mobile drawer */}
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />

        {/* Right — page workspace */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 ${sidebarCollapsed ? 'md:ml-[64px]' : 'md:ml-[256px]'
            }`}
        >
          {/* Sticky top header with hamburger for mobile */}
          <Header
            currentRole={currentRole}
            onRoleChange={setCurrentRole}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />

          {/* Page content on calm slate canvas */}
          <main className="flex-1 p-3 sm:p-6 overflow-y-auto" style={{ background: '#f8fafc' }}>
            <Routes>
              <Route path="/" element={<EOCCommandCenter />} />
              <Route path="/situational/incidents" element={<IncidentManagement />} />
              <Route path="/situational/incidents/:id" element={<IncidentDetailPage />} />
              <Route path="/situational/intelligence" element={<DisasterIntelligence />} />
              <Route path="/response/rescue" element={<RescueOperations />} />
              <Route path="/response/resources" element={<ResourceManagement />} />
              <Route path="/communication" element={<PublicCommunication />} />
              <Route path="/analytics" element={<ReportsAnalytics />} />
              <Route path="/system" element={<SystemAdministration />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
