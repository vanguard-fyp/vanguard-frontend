import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Clock, Search, Menu, X, CheckCheck, AlertTriangle, Info, CheckCircle, Zap, TrendingUp, Package, Warehouse } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import type { HeaderProps, SystemNotification } from '../../types';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/useNotifications';
import { useIncidents, useInventory, useResourceRequests } from '../../hooks';
import { searchAll, type SearchHit, type SearchKind } from '../../utils/globalSearch';
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

const KIND_LABEL: Record<SearchKind, string> = { incident: 'Incidents', request: 'Resource requests', stock: 'Stock items' };
const KIND_ICON: Record<SearchKind, React.ReactNode> = {
  incident: <AlertTriangle size={13} className="text-rose-500" />,
  request: <Package size={13} className="text-blue-500" />,
  stock: <Warehouse size={13} className="text-amber-600" />,
};
const TAG_STYLE: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-emerald-100 text-emerald-700',
  'Pending Approval': 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Dispatched: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  'Low Stock': 'bg-amber-100 text-amber-700',
  Sufficient: 'bg-emerald-100 text-emerald-700',
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

  // ── Search data: incidents, resource requests, stock items ────────────────
  const { data: incidents = [] } = useIncidents();
  const { data: requests = [] } = useResourceRequests();
  const { data: stock = [] } = useInventory();
  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Rejected');

  // Shown before typing: highest AI priority active incidents.
  const trending: SearchHit[] = [...activeIncidents]
    .sort((a, b) => (b.ai_priority_score ?? -1) - (a.ai_priority_score ?? -1))
    .slice(0, 5)
    .map((i) => ({
      kind: 'incident' as const,
      id: i.id,
      code: i.display_id ?? i.id.slice(0, 8).toUpperCase(),
      title: i.title,
      subtitle: `${i.district}, ${i.state}`,
      tag: i.severity,
      href: `/situational/incidents/${i.id}`,
    }));

  const q = searchQuery.trim().toLowerCase();
  const searching = q.length >= 2;
  const results = searching ? searchAll(searchQuery, { incidents, requests, stock }) : trending;
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => setActiveIdx(0), [searchQuery]);

  const showDropdown = searchFocused && (searching || trending.length > 0);

  const openHit = (hit: SearchHit) => {
    navigate(hit.href);
    setSearchQuery('');
    setSearchFocused(false);
    searchRef.current?.blur();
  };
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      openHit(results[Math.min(activeIdx, results.length - 1)]);
    } else if (e.key === 'Escape') {
      searchRef.current?.blur();
    }
  };

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
            onKeyDown={onSearchKey}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="global-search-results"
            placeholder="Search incidents, requests, stock… (Ctrl+K)"
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
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
                  {searching ? (
                    <>
                      <Search size={11} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {results.length} result{results.length === 1 ? '' : 's'} for "{searchQuery.trim()}"
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp size={11} className="text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Highest-priority active incidents</span>
                    </>
                  )}
                </div>

                <div id="global-search-results" role="listbox" className="max-h-80 overflow-y-auto">
                  {searching && results.length === 0 && (
                    <p className="px-3 py-4 text-xs text-slate-500">No incident, request or stock item matches. Try an ID such as INC-2026-001 or REQ-2026-001.</p>
                  )}
                  {results.map((hit, idx) => {
                    const first = idx === 0 || results[idx - 1].kind !== hit.kind;
                    return (
                      <React.Fragment key={`${hit.kind}-${hit.id}`}>
                        {searching && first && (
                          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400">{KIND_LABEL[hit.kind]}</p>
                        )}
                        <button
                          role="option"
                          aria-selected={idx === activeIdx}
                          onMouseDown={() => openHit(hit)}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className={`w-full text-left px-3 py-2 flex items-start gap-3 cursor-pointer transition-colors ${idx === activeIdx ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        >
                          <span className="mt-0.5 shrink-0">{KIND_ICON[hit.kind]}</span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-mono font-bold text-blue-600">{hit.code}</span>
                              {hit.tag && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TAG_STYLE[hit.tag] ?? 'bg-slate-100 text-slate-600'}`}>{hit.tag}</span>}
                              {!searching && <Zap size={10} className="text-amber-500 ml-auto" />}
                            </span>
                            <span className="block text-xs font-semibold text-slate-800 truncate">{hit.title}</span>
                            <span className="block text-[10px] text-slate-500 font-medium truncate">{hit.subtitle}</span>
                          </span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>↑↓ to move · Enter to open · Esc to close</span>
                  <button onMouseDown={() => navigate('/situational/incidents')} className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
                    All incidents
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
