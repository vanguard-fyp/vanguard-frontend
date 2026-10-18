import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, Menu, X, AlertTriangle, AlertOctagon, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import type { HeaderProps, SystemNotification } from '../../types';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/useNotifications';
import { useIncidents, useInventory, useResourceRequests } from '../../hooks';
import { searchAll, type SearchHit, type SearchKind } from '../../utils/globalSearch';
import { formatDateTime, formatRelativeTime } from '../../utils/dateFormatter';

interface ExtendedHeaderProps extends HeaderProps {
  onMobileMenuToggle?: () => void;
}

/* ── Shared tones: the same hues as the dashboard cards (red, amber, blue, teal,
      slate), shown as the hue on an 8% wash of itself, no outlines. ──────── */
type Tone = 'red' | 'orange' | 'amber' | 'blue' | 'teal' | 'slate';
const TONE: Record<Tone, string> = {
  red: '#dc2626',
  orange: '#ea580c',
  amber: '#d97706',
  blue: '#2563eb',
  teal: '#0d9488',
  slate: '#64748b',
};

/** Status words, coloured by what the operator should do. */
const TAG_TONE: Record<string, Tone> = {
  Critical: 'red', Rejected: 'red', 'Out of Stock': 'red',
  High: 'orange',
  Medium: 'amber', 'Pending Approval': 'amber', 'Low Stock': 'amber',
  Dispatched: 'blue',
  Approved: 'teal', Delivered: 'teal', Fulfilled: 'teal', Sufficient: 'teal',
  Low: 'slate',
};

const Tag: React.FC<{ text: string }> = ({ text }) => {
  const c = TONE[TAG_TONE[text] ?? 'slate'];
  return (
    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ color: c, background: `${c}14` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {text}
    </span>
  );
};

const KIND_LABEL: Record<SearchKind, string> = { incident: 'Incidents', request: 'Resource requests', stock: 'Stock items' };

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-slate-200 bg-white text-[10px] font-medium text-slate-500 font-sans">
    {children}
  </kbd>
);

/* ── Notification look per type ─────────────────────────────────────────── */
const NOTIF: Record<SystemNotification['type'], { tone: Tone; Icon: typeof Info }> = {
  critical: { tone: 'red', Icon: AlertOctagon },
  high: { tone: 'orange', Icon: AlertTriangle },
  warning: { tone: 'amber', Icon: AlertTriangle },
  info: { tone: 'blue', Icon: Info },
  success: { tone: 'teal', Icon: CheckCircle2 },
};

const panelMotion = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const },
};

const Header: React.FC<ExtendedHeaderProps> = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'unread' | 'all'>('unread');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Close notification panel on outside click or Escape ──────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
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
  // Reads are applied locally at once, so the list updates on click instead of
  // waiting for the server round trip.
  const { data: serverNotifs = [] } = useNotifications(false);
  const [readLocally, setReadLocally] = useState<Set<string>>(new Set());
  const allNotifs = serverNotifs.map((n) => (readLocally.has(n.id) ? { ...n, is_read: true } : n));
  const unreadNotifs = allNotifs.filter((n) => !n.is_read);
  const displayedNotifs = notifTab === 'unread' ? unreadNotifs : allNotifs;
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // ── Search data: incidents, resource requests, stock items ────────────────
  // Search data loads the first time the search box is used, not on every page.
  const [searchUsed, setSearchUsed] = useState(false);
  useEffect(() => { if (searchFocused || searchQuery) setSearchUsed(true); }, [searchFocused, searchQuery]);
  const { data: incidents = [] } = useIncidents(undefined, { enabled: searchUsed });
  const { data: requests = [] } = useResourceRequests({ enabled: searchUsed });
  const { data: stock = [] } = useInventory({ enabled: searchUsed });
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
    if (!n.is_read) {
      setReadLocally((s) => new Set(s).add(n.id));
      markRead.mutate(n.id);
    }
    if (n.link) {
      // Let the panel finish closing before the page changes.
      setNotifOpen(false);
      window.setTimeout(() => navigate(n.link!), 140);
    }
  }, [markRead, navigate]);

  const handleMarkAll = () => {
    setReadLocally(new Set(serverNotifs.map((n) => n.id)));
    markAllRead.mutate();
  };

  return (
    <header className="h-16 flex items-center justify-between px-3 sm:px-6 shrink-0 sticky top-0 z-30 bg-white border-b border-slate-200">
      {/* Left: Mobile Menu + Global Search */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors md:hidden cursor-pointer shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

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
            placeholder="Search incidents, requests, stock"
            className="w-full pl-9 pr-14 py-2 rounded-lg text-xs transition-all text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-blue-600/10 focus:outline-none"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 pointer-events-none">
              <Kbd>Ctrl</Kbd><Kbd>K</Kbd>
            </span>
          )}

          {/* Search Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div {...panelMotion}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_-12px_rgba(15,23,42,.25)] z-50 overflow-hidden origin-top"
              >
                <p className="px-3.5 pt-3 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {searching ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Top priority incidents'}
                </p>

                <div id="global-search-results" role="listbox" className="max-h-80 overflow-y-auto px-1.5 pb-1.5">
                  {searching && results.length === 0 && (
                    <p className="px-2 py-4 text-[13px] text-slate-500">No matches. Try an ID such as INC-2026-001.</p>
                  )}
                  {results.map((hit, idx) => {
                    const first = idx === 0 || results[idx - 1].kind !== hit.kind;
                    return (
                      <React.Fragment key={`${hit.kind}-${hit.id}`}>
                        {searching && first && (
                          <p className="px-2 pt-2.5 pb-1 text-[11px] font-semibold text-slate-400">{KIND_LABEL[hit.kind]}</p>
                        )}
                        <button
                          role="option"
                          aria-selected={idx === activeIdx}
                          onMouseDown={() => openHit(hit)}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className={`w-full text-left px-2.5 py-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${idx === activeIdx ? 'bg-slate-100' : ''}`}
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-semibold md:text-slate-900 text-slate-500 truncate leading-snug">{hit.title}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 md:text-[11px] text-[10px] text-slate-400 truncate">
                              <span className="font-semibold text-slate-500 tabular-nums">{hit.code}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{hit.subtitle}</span>
                            </span>
                          </span>
                          {hit.tag && <Tag text={hit.tag} />}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> Move</span>
                    <span className="flex items-center gap-1"><Kbd>↵</Kbd> Open</span>
                    <span className="hidden sm:flex items-center gap-1"><Kbd>Esc</Kbd> Close</span>
                  </span>
                  <button onMouseDown={() => navigate('/situational/incidents')} className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
                    All incidents
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center shrink-0 ml-2 sm:ml-4">
        <div className="relative" ref={notifRef}>
          <button
            id="notification-bell-btn"
            onClick={() => {
              // Open on "All" when nothing is unread, so read notifications are still visible.
              if (!notifOpen) setNotifTab(unreadNotifs.length > 0 ? 'unread' : 'all');
              setNotifOpen((o) => !o);
            }}
            aria-expanded={notifOpen}
            aria-label={`Notifications${unreadNotifs.length ? `, ${unreadNotifs.length} unread` : ''}`}
            className={`relative p-2 rounded-lg transition-colors cursor-pointer ${notifOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bell size={18} />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div {...panelMotion}
                className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] max-w-[380px] rounded-xl overflow-hidden z-50 bg-white border border-slate-200 shadow-[0_16px_40px_-16px_rgba(15,23,42,.3)] origin-top-right"
              >
                {/* Head */}
                <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  {unreadNotifs.length > 0 && (
                    <button onClick={handleMarkAll} className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="px-4 pb-3">
                  <div role="tablist" className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    {(['unread', 'all'] as const).map((tab) => {
                      const on = notifTab === tab;
                      const count = tab === 'unread' ? unreadNotifs.length : allNotifs.length;
                      return (
                        <button key={tab} role="tab" aria-selected={on} onClick={() => setNotifTab(tab)}
                          className={`relative flex-1 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          {on && <motion.span layoutId="notif-tab" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_2px_rgba(15,23,42,.08)]" transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} />}
                          <span className="relative">{tab === 'unread' ? 'Unread' : 'All'} <span className="text-slate-400 tabular-nums">{count}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* List */}
                <div className="max-h-[360px] overflow-y-auto border-t border-slate-100">
                  {displayedNotifs.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <p className="text-sm font-semibold text-slate-700">You're all caught up</p>
                      <p className="text-xs text-slate-400 mt-0.5">{notifTab === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
                    </div>
                  ) : (
                    <ul>
                      <AnimatePresence initial={false}>
                        {displayedNotifs.map((n) => {
                          const { tone, Icon } = NOTIF[n.type] ?? NOTIF.info;
                          const c = TONE[tone];
                          return (
                            <motion.li key={n.id} layout
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <button type="button" onClick={() => handleNotifClick(n)}
                                className="group w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 border-b border-slate-100"
                              >
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c}14`, color: c }}>
                                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="flex items-start justify-between gap-2">
                                    <span className={`text-[13px] leading-snug ${n.is_read ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'}`}>{n.title}</span>
                                    <span className="shrink-0 flex items-center gap-1.5 pt-0.5">
                                      <span className="text-[11px] text-slate-400 whitespace-nowrap" title={formatDateTime(n.created_at)}>{formatRelativeTime(n.created_at)}</span>
                                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600" aria-label="Unread" />}
                                    </span>
                                  </span>
                                  <span className="mt-0.5 block text-xs text-slate-500 leading-relaxed line-clamp-2">{n.message}</span>
                                </span>
                                {n.link && <ChevronRight size={15} className="shrink-0 self-center text-slate-300 group-hover:text-slate-500 transition-colors" aria-hidden="true" />}
                              </button>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
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
