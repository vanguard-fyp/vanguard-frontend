import React, { useState, useEffect } from 'react';
import { Bell, Clock, Search, ChevronDown, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type { HeaderProps } from '../../types';
import { USER_ROLES } from '../../types';


interface ExtendedHeaderProps extends HeaderProps {
  onMobileMenuToggle?: () => void;
}

const Header: React.FC<ExtendedHeaderProps> = ({ currentRole, onRoleChange, onMobileMenuToggle }) => {
  const [now, setNow] = useState(new Date());
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = now.toLocaleTimeString('en-MY', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  const formattedDate = now.toLocaleDateString('en-MY', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

  // TODO: MAKE REAL ALERT
  const alerts = [
    { id: 1, text: 'CRITICAL: Sungai Kelantan exceeded danger level (11.20m)', time: '2 min ago', type: 'critical' as const },
    { id: 2, text: 'Landslide debris 40% cleared at Batu 14 Hulu Langat', time: '8 min ago', type: 'high' as const },
    { id: 3, text: 'REQ-901: 1,500 food packs awaiting approval for Kota Bharu', time: '15 min ago', type: 'medium' as const },
  ];

  return (
    <header
      className="h-16 flex items-center justify-between px-3 sm:px-6 shrink-0 sticky top-0 z-30 bg-white border-b border-slate-200"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Left: Mobile Menu Hamburger Button + Global Search Bar */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors md:hidden cursor-pointer shrink-0"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Global search..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs transition-all text-slate-800 bg-slate-100 border border-slate-200 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Right Controls: Clock + Notifications + Role Switcher */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2 sm:ml-4">
        {/* Date & Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200">
          <Clock size={15} className="text-slate-500 shrink-0" />
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold text-slate-800">{formattedTime}</span>
            <span className="text-slate-300">|</span>
            <span className="font-medium text-slate-600 text-[11px]">{formattedDate}</span>
          </div>
        </div>

        <div className="hidden lg:block w-px h-6 bg-slate-200" />

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setRoleDropdownOpen(false); }}
            className="relative p-2 rounded-lg transition-all text-slate-600 hover:bg-slate-100 cursor-pointer"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600" />
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-72 sm:w-96 rounded-xl overflow-hidden z-50 bg-white border border-slate-200 shadow-xl"
              >
                <div className="px-4 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Alert Notifications</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-100 text-red-700">
                    3 New
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1 w-2 h-2 rounded-full shrink-0"
                          style={{
                            background:
                              alert.type === 'critical' ? '#dc2626' :
                              alert.type === 'high' ? '#ea580c' : '#d97706'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-snug">{alert.text}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">{alert.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Role Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setRoleDropdownOpen(!roleDropdownOpen); setNotifOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 hover:bg-slate-200/70 transition-all cursor-pointer text-slate-700 max-w-[140px] sm:max-w-none truncate"
          >
            <span className="truncate">{currentRole}</span>
            <ChevronDown size={14} className="shrink-0 text-slate-500" />
          </button>

          <AnimatePresence>
            {roleDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-56 rounded-xl overflow-hidden z-50 bg-white border border-slate-200 shadow-xl py-1"
              >
                <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Persona
                </div>
                {USER_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      onRoleChange(role);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                      currentRole === role ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{role}</span>
                    {currentRole === role && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
