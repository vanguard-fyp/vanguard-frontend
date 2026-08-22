import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  X
} from 'lucide-react';

import type { NavChild, SidebarProps } from '../../types';
import { SIDEBAR_THEME as C, NAV_STRUCTURE, SYSTEM_NAV_ITEM } from '../../constants';

interface ExtendedSidebarProps extends SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<ExtendedSidebarProps> = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  const [headerHovered, setHeaderHovered] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Situational Awareness': true,
    'Response Coordination': true,
  });

  const toggle = (label: string) =>
    setOpenSections((p) => ({ ...p, [label]: !p[label] }));

  const isChildActive = (children?: NavChild[]) =>
    children?.some((c) => location.pathname === c.path) ?? false;

  const handleNavClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen z-50 md:z-40 flex flex-col transition-all duration-300 select-none ${mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0'
          } ${collapsed ? 'md:w-[64px]' : 'md:w-[256px]'}`}
        style={{ background: C.bg, borderRight: `1px solid ${C.divider}` }}
      >
        {/* ── Brand & Collapse Header ─────────────────────────── */}
        <div
          className={`relative flex items-center h-[60px] shrink-0 transition-colors ${collapsed ? 'px-2 justify-center' : 'px-3.5 justify-between'
            }`}
          style={{ background: C.bgHeader, borderBottom: `1px solid ${C.divider}` }}
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
        >
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="w-9 h-9 rounded-lg flex items-center justify-center relative transition-all cursor-pointer hidden md:flex"
              style={{ background: '#b5c4dbff' }}
              title="Click to expand sidebar"
            >
              {headerHovered ? (
                <PanelLeftOpen size={18} className="text-white" />
              ) : (
                <img
                  src="/favicon_io/favicon-32x32.png"
                  alt="Brand Logo"
                  className="w-full h-full object-contain"
                />
              )}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#b5c4dbff' }}
                >
                  <img
                    src="/favicon_io/favicon-32x32.png"
                    alt="Brand Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="overflow-hidden leading-tight flex-1">
                  <p className="text-[13px] font-extrabold text-white tracking-wider">VANGUARD</p>
                  <p className="text-[9.5px] font-medium tracking-wide" style={{ color: C.sectionLabel }}>
                    NADMA · EOC System
                  </p>
                </div>
              </div>

              {/* Desktop collapse button */}
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-white/10 shrink-0 cursor-pointer hidden md:block"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={16} />
              </button>

              {/* Mobile close button */}
              <button
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-white/10 shrink-0 cursor-pointer md:hidden"
                title="Close sidebar"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>

        {/* ── Navigation List ─────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 overflow-x-hidden">
          {NAV_STRUCTURE.map((section) => (
            <div key={section.section} className="mb-2">
              {!collapsed && (
                <p
                  className="px-4 pt-2.5 pb-1.5 text-[9.5px] font-bold tracking-[0.14em] uppercase"
                  style={{ color: C.sectionLabel }}
                >
                  {section.section}
                </p>
              )}

              {section.items.map((item) => {
                const hasChildren = Boolean(item.children?.length);
                const isOpen = openSections[item.label] ?? false;
                const activeChild = isChildActive(item.children);

                if (!hasChildren && item.path) {
                  return (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      onClick={handleNavClick}
                    >
                      {({ isActive }) => (
                        <div
                          className={`mx-2 flex items-center gap-3 py-2 transition-all cursor-pointer ${collapsed ? 'justify-center rounded-lg px-0' : 'px-3 rounded-lg'
                            }`}
                          style={{
                            background: isActive ? C.parentActiveBg : 'transparent',
                            color: isActive ? C.parentActiveText : C.parentInactive,
                          }}
                          onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = C.parentHoverBg; }}
                          onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                          <span className="shrink-0 flex items-center justify-center">{item.icon}</span>
                          {!collapsed && (
                            <span className="text-[12.5px] font-medium truncate">{item.label}</span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  );
                }

                return (
                  <div key={item.label} className="mx-2 mb-0.5">
                    <div
                      onClick={() => {
                        if (collapsed) setCollapsed(false);
                        toggle(item.label);
                      }}
                      className={`flex items-center gap-3 py-2 transition-all cursor-pointer ${collapsed ? 'justify-center rounded-lg px-0' : 'px-3 rounded-lg justify-between'
                        }`}
                      style={{
                        background: activeChild ? C.parentActiveBg : 'transparent',
                        color: activeChild ? C.parentActiveText : C.parentInactive,
                      }}
                      onMouseEnter={(e) => { if (!activeChild) (e.currentTarget as HTMLDivElement).style.background = C.parentHoverBg; }}
                      onMouseLeave={(e) => { if (!activeChild) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                      title={collapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 flex items-center justify-center">{item.icon}</span>
                        {!collapsed && (
                          <span className="text-[12.5px] font-medium truncate">{item.label}</span>
                        )}
                      </div>
                      {!collapsed && (
                        <ChevronDown
                          size={14}
                          className="shrink-0 transition-transform duration-200"
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            color: activeChild ? C.parentActiveText : C.parentInactive,
                          }}
                        />
                      )}
                    </div>

                    {!collapsed && (
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-8 pr-1 py-1 space-y-0.5">
                              {item.children?.map((child) => {
                                const childIsActive = location.pathname === child.path;
                                return (
                                  <NavLink key={child.path} to={child.path} onClick={handleNavClick}>
                                    <div
                                      className="flex items-center gap-2 px-2.5 py-[7px] rounded-md mb-0.5 transition-all cursor-pointer"
                                      style={{
                                        background: childIsActive ? C.childActiveBg : 'transparent',
                                        color: childIsActive ? C.childActiveText : C.childInactive,
                                      }}
                                      onMouseEnter={(e) => { if (!childIsActive) (e.currentTarget as HTMLDivElement).style.background = C.childHoverBg; }}
                                      onMouseLeave={(e) => { if (!childIsActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0 transition-all"
                                        style={{
                                          background: childIsActive ? C.childActiveDot : 'rgba(148,163,184,0.4)',
                                        }}
                                      />
                                      <span className="text-[11.5px] font-medium truncate">{child.label}</span>
                                    </div>
                                  </NavLink>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Bottom Profile Area ──────────────────────── */}
        <div
          className="shrink-0 p-2"
          style={{ borderTop: `1px solid ${C.divider}`, background: C.bgFooter }}
        >
          <NavLink to={SYSTEM_NAV_ITEM.path} title={collapsed ? SYSTEM_NAV_ITEM.label : undefined} onClick={handleNavClick}>
            {({ isActive }) => (
              <div
                className={`mb-2 flex items-center gap-3 py-2 transition-all cursor-pointer ${collapsed ? 'justify-center rounded-lg' : 'px-2.5 rounded-lg'
                  }`}
                style={{
                  background: isActive ? C.parentActiveBg : 'transparent',
                  color: isActive ? C.parentActiveText : C.parentInactive,
                }}
              >
                <span className="shrink-0 flex items-center justify-center">{SYSTEM_NAV_ITEM.icon}</span>
                {!collapsed && (
                  <span className="text-[12px] font-medium truncate">{SYSTEM_NAV_ITEM.label}</span>
                )}
              </div>
            )}
          </NavLink>

          <div
            className="rounded-lg overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.divider}` }}
          >
            {collapsed ? (
              <div className="flex items-center justify-center py-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: C.logoBg }}
                >
                  AR
                </div>
              </div>
            ) : (
              <div className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: C.logoBg }}
                  >
                    AR
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: C.profileName }}>Ahmad Rosli</p>
                    <p className="text-[10px] font-medium truncate" style={{ color: C.profileRole }}>NADMA Lead Officer</p>
                  </div>
                  <button className="p-1 rounded transition-colors shrink-0 cursor-pointer text-slate-400 hover:text-red-400">
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
