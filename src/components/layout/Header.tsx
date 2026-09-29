import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Clock, Search, Menu, X, CheckCheck, AlertTriangle, Info, CheckCircle, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import type { HeaderProps, SystemNotification } from '../../types';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/useNotifications';
import { useIncidents } from '../../hooks';
import { formatDateTime } from '../../utils/dateFormatter';

interface ExtendedHeaderProps extends HeaderProps {
  onMobileMenuToggle?: () => void;
}

// ── Notification type icon/colour map ────────────────────────────────────────
const NOTIF_STYLE: Record<string, { icon: React.ReactNode; dot: string; label: string }> = {
  critical: { icon: <AlertTriangle size={13} className="text-red-600" />, dot: 'bg-red-500', label: 'Critical' },
  high:     { icon: <AlertTriangle size={13} className="text-orange-500" />, dot: 'bg-orange-500', label: 'High' },
  warning:  { icon: <AlertTriangle size={13} className="text-amber-500" />, dot: 'bg-amber-400', label: 'Warning' },
  info:     { icon: <Info size={13} className="text-blue-500" />, dot: 'bg-blue-400', label: 'Info' },
  success:  { icon: <CheckCircle size={13} className="text-emerald-500" />, dot: 'bg-emerald-400', label: 'OK' },
};

const Header: React.FC<ExtendedHeaderProps> = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'unread' | 'all'>('unread');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Clocks ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formattedDate = now.toLocaleDateString('en-MY', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  // ── Close notification panel on outside click ─────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Ctrl+K shortcut ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Notification data ─────────────────────────────────────────────────────
  const { data: allNotifs = [] } = useNotifications(false);
  const unreadNotifs = allNotifs.filter((n) => !n.is_read);
  const displayedNotifs = notifTab === 'unread' ? unreadNotifs : allNotifs;
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // ── Incident search data ──────────────────────────────────────────────────
  const { data: incidents = [] } = useIncidents();
  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected');

  // Top trending = highest AI priority active incidents
  const trendingIncidents = [...activeIncidents]
    .sort((a, b) => b.ai_priority_score - a.ai_priority_score)
    .slice(0, 5);

  // Search filter
  const q = searchQuery.trim().toLowerCase();
  const searchResults = q.length >= 2
    ? activeIncidents.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.district || '').toLowerCase().includes(q) ||
          (i.state || '').toLowerCase().includes(q) ||
          (i.display_id || '').toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  const showDropdown = searchFocused && (searchQuery.length >= 2 ? searchResults.length > 0 : trendingIncidents.length > 0);

  const handleNotifClick = useCallback((n: SystemNotification) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
    setNotifOpen(false);
  }, [markRead, navigate]);

  return (
    <header
      className="h-16 flex items-center justify-between px-3 sm:px-6 shrink-0 sticky top-0 z-30 bg-white border-b border-slate-200"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Left: Mobile Menu + Global Search */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors md:hidden cursor-pointer shrink-0"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        {/* Enhanced Search */}
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search incidents, districts… (Ctrl+K)"
            className="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs transition-all text-slate-800 bg-slate-100 border border-slate-200 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}

          {/* Search Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
                  {q.length >= 2
                    ? <><Search size={11} className="text-slate-400" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{searchResults.length} Results for "{searchQuery}"</span></>
                    : <><TrendingUp size={11} className="text-blue-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trending Active Incidents</span></>
                  }
                </div>

                {/* Results */}
                <div className="max-h-72 overflow-y-auto">
                  {(q.length >= 2 ? searchResults : trendingIncidents).map((inc, idx) => (
                    <button
                      key={inc.id}
                      onMouseDown={() => navigate(`/situational/incidents`)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-3 cursor-pointer"
                    >
                      {q.length < 2 && (
                        <span className="text-[10px] font-mono font-bold text-slate-300 mt-0.5 w-4 shrink-0">{idx + 1}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono font-bold text-blue-600">{inc.display_id || inc.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${inc.severity === 'Critical' ? 'bg-red-100 text-red-700' : inc.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                            {inc.severity}
                          </span>
                          {q.length < 2 && <Zap size={10} className="text-amber-500 ml-auto" />}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 truncate">{inc.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{inc.district}, {inc.state}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onMouseDown={() => navigate('/situational/incidents')}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    View All Incidents →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Controls */}
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
        <div className="relative" ref={notifRef}>
          <button
            id="notification-bell-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg transition-all text-slate-600 hover:bg-slate-100 cursor-pointer"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-[9px] font-extrabold text-white flex items-center justify-center">
                {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 sm:w-96 rounded-xl overflow-hidden z-50 bg-white border border-slate-200 shadow-xl"
              >
                {/* Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Notifications</h3>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      <CheckCheck size={12} /> Mark All Read
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                  {(['unread', 'all'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setNotifTab(tab)}
                      className={`flex-1 py-2 text-xs font-bold transition-colors cursor-pointer ${notifTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {tab === 'unread' ? `Unread (${unreadNotifs.length})` : `All (${allNotifs.length})`}
                    </button>
                  ))}
                </div>

                {/* Notification List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {displayedNotifs.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">
                        {notifTab === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications yet.'}
                      </p>
                    </div>
                  ) : (
                    displayedNotifs.map((n) => {
                      const style = NOTIF_STYLE[n.type] ?? NOTIF_STYLE.info;
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 flex items-start gap-3 ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                        >
                          <div className="shrink-0 mt-0.5">{style.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                              {!n.is_read && <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">{n.message}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">{formatDateTime(n.created_at)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
