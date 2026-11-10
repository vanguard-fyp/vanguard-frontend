import { DataRegion } from '../../components/common/DataRegion';
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Megaphone, AlertTriangle, Shield, CheckCircle2, Bell, EyeOff } from 'lucide-react';
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from '../../hooks';
import { PaginationBar } from '../../components/ui/shared/PaginationBar';
import { CommunicationFilters } from '../../components/ui/communication/CommunicationFilters';
import { CommunicationCard } from '../../components/ui/communication/CommunicationCard';
import { ComposeBroadcastModal } from '../../components/ui/communication/ComposeBroadcastModal';
import type { PublicAnnouncement, CommunicationCategoryFilter, CommunicationSortBy, CommunicationStatusFilter } from '../../types';
import { useToast } from '../../context/ToastContext';
import { containerAnim, itemAnim, KPI_ACCENT_MAP } from '../../constants';

const parseTime = (dateStr?: string | null): number => {
  if (!dateStr) return 0;
  const cleaned = String(dateStr).trim().replace(' ', 'T');
  const t = new Date(cleaned).getTime();
  return isNaN(t) ? 0 : t;
};

const isActiveAnnouncement = (val: any): boolean => {
  return val === true || val === 1 || val === 'true' || val === 'True';
};

const PublicCommunication: React.FC = () => {
  const announcementsQuery = useAnnouncements();
  const { data: allAnnouncements = [], isLoading, isError, refetch } = announcementsQuery;
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<{ id: string; title: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CommunicationCategoryFilter>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<CommunicationStatusFilter>('All');
  // Newest first; the status filter replaced the sort buttons.
  const [sortBy] = useState<CommunicationSortBy>('latest');
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  const totalCount = allAnnouncements.length;
  const activeCount = useMemo(() => allAnnouncements.filter((a) => isActiveAnnouncement(a.active)).length, [allAnnouncements]);
  const evacuationCount = useMemo(() => allAnnouncements.filter((a) => a.category === 'Evacuation Order').length, [allAnnouncements]);
  const emergencyCount = useMemo(() => allAnnouncements.filter((a) => a.category === 'Emergency Alert').length, [allAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    let list = [...allAnnouncements];
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      list = list.filter((a) => {
        const titleMatch = a.title?.toLowerCase().includes(q);
        const contentMatch = a.content?.toLowerCase().includes(q);
        const stateMatch = a.target_state?.toLowerCase().includes(q);
        const districtMatch = a.target_districts?.some((d) => d.toLowerCase().includes(q));
        const idMatch = a.display_id?.toLowerCase().includes(q) || a.id?.toLowerCase().includes(q);
        const authorMatch = a.issued_by?.toLowerCase().includes(q);
        return titleMatch || contentMatch || stateMatch || districtMatch || idMatch || authorMatch;
      });
    }

    if (categoryFilter !== 'All') {
      list = list.filter((a) => a.category === categoryFilter);
    }

    if (severityFilter !== 'All') {
      list = list.filter((a) => a.severity === severityFilter);
    }

    if (statusFilter === 'Active') {
      list = list.filter((a) => isActiveAnnouncement(a.active));
    } else if (statusFilter === 'Retracted') {
      list = list.filter((a) => !isActiveAnnouncement(a.active));
    }

    if (sortBy === 'active') {
      list.sort((a, b) => {
        const aActive = isActiveAnnouncement(a.active);
        const bActive = isActiveAnnouncement(b.active);
        if (aActive !== bActive) return aActive ? -1 : 1;
        return parseTime(b.issued_at) - parseTime(a.issued_at);
      });
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => parseTime(a.issued_at) - parseTime(b.issued_at));
    } else {
      list.sort((a, b) => parseTime(b.issued_at) - parseTime(a.issued_at));
    }

    return list;
  }, [allAnnouncements, searchQuery, categoryFilter, severityFilter, statusFilter, sortBy]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, categoryFilter, severityFilter, statusFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredAnnouncements.length / PAGE_SIZE));
  const pagedAnnouncements = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return filteredAnnouncements.slice(start, start + PAGE_SIZE);
  }, [filteredAnnouncements, pageIndex]);

  const handleToggleActive = (id: string) => {
    const ann = allAnnouncements.find((a) => a.id === id);
    if (ann) {
      updateMutation.mutate({ id, updates: { active: !ann.active } });
    }
  };

  const pushNote = (ann: PublicAnnouncement) => {
    if (!ann.push_job) return 'No push was queued (no valid target area).';
    return ann.push_job.mode === 'off'
      ? 'Push queued. It is sent once the push worker is connected.'
      : "Push handed to the worker for citizens' phones in the target area.";
  };

  const handleResend = (id: string) => {
    updateMutation.mutate(
      { id, updates: { notify_citizens: true } },
      {
        onSuccess: (ann) => toast.success('Update queued for phones', pushNote(ann)),
        onError: (err) =>
          toast.error('Resend failed', err instanceof Error ? err.message : 'Please try again.'),
      },
    );
  };

  const handleDelete = (id: string) => {
    const ann = allAnnouncements.find((a) => a.id === id);
    setAnnouncementToDelete({ id, title: ann?.title ?? 'this announcement' });
  };

  const confirmDelete = () => {
    if (announcementToDelete) {
      deleteMutation.mutate(announcementToDelete.id, {
        onSuccess: () => {
          toast.warning('Announcement Retracted', `"${announcementToDelete.title}" has been deactivated and hidden from public view.`);
          setAnnouncementToDelete(null);
        },
        onError: () => {
          toast.error('Delete Failed', 'Could not retract the announcement. Please try again.');
          setAnnouncementToDelete(null);
        },
      });
    }
  };

  const toast = useToast();
  const handlePublish = async (data: Partial<PublicAnnouncement>) => {
    const created = await createMutation.mutateAsync(data);
    setShowComposeModal(false);
    toast.success('Broadcast published', data.notify_citizens ? pushNote(created) : data.title ?? undefined);
  };

  return (
    <DataRegion queries={[announcementsQuery]} label="Page data"><motion.div
      variants={containerAnim}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Page Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Public Communication</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Emergency Alerting · Unified public announcement registry, multi-channel broadcast management, and target sector advisories
          </p>
        </div>

        <button
          onClick={() => setShowComposeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          Publish New Broadcast
        </button>
      </motion.div>

      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Megaphone, label: 'Total Broadcasts', value: totalCount, sub: 'Unified registry', accent: 'blue' as const },
          { icon: CheckCircle2, label: 'Active Notices', value: activeCount, sub: 'Currently live', accent: 'green' as const },
          { icon: Shield, label: 'Evacuation Orders', value: evacuationCount, sub: 'Mandatory sector moves', accent: 'orange' as const },
          { icon: AlertTriangle, label: 'Emergency Alerts', value: emergencyCount, sub: 'Red & Amber alerts', accent: 'red' as const },
        ].map(({ icon: Icon, label, value, sub, accent }) => {
          const a = KPI_ACCENT_MAP[accent];
          return (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border shadow-2xs"
                style={{ background: a.iconBg, borderColor: a.iconBorder }}
              >
                <Icon size={18} style={{ color: a.iconColor }} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold" style={{ color: a.valueColor }}>{value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{label}</p>
                <p className="text-[11px] text-slate-500 font-medium truncate">{sub}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Search, Filter & Sort Controls */}
      <motion.div variants={itemAnim}>
        <CommunicationFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          totalCount={totalCount}
          filteredCount={filteredAnnouncements.length}
        />
      </motion.div>

      {/* Public Communication Master List */}
      <motion.div variants={itemAnim} className="space-y-2.5">
        <AnimatePresence>
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center text-xs text-slate-400 shadow-xs">
             <Bell size={18} className="text-slate-300 mx-auto mb-2" />
             <p className="text-sm font-bold text-slate-500">Loading broadcasts…</p>
            </div>
          ) : isError && announcementsQuery.data === undefined ? (
            <div className="bg-white border border-red-200 rounded-xl px-5 py-8 text-center shadow-xs">
              <p className="text-sm font-bold text-red-700">Broadcasts could not be loaded</p>
              <button onClick={() => refetch()} className="text-xs font-bold text-blue-700 underline mt-1 cursor-pointer">
                Retry
              </button>
            </div>
          ) : pagedAnnouncements.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center shadow-xs">
              <Megaphone size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">No public communications match your search filters</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting 'All' categories</p>
            </div>
          ) : (
            pagedAnnouncements.map((ann) => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <CommunicationCard
                  announcement={ann}
                  isExpanded={expandedId === ann.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === ann.id ? null : ann.id)
                  }
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                  onResend={handleResend}
                  isResending={updateMutation.isPending && updateMutation.variables?.id === ann.id}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
        {filteredAnnouncements.length > 0 && (
          <PaginationBar
            pageIndex={pageIndex}
            pageCount={pageCount}
            total={filteredAnnouncements.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPageIndex}
            isFetching={isLoading}
            label="broadcasts"
          />
        )}
      </motion.div>

      {/* Compose Broadcast Modal */}
      <AnimatePresence>
        {showComposeModal && (
          <ComposeBroadcastModal
            onClose={() => setShowComposeModal(false)}
            onPublish={handlePublish}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {announcementToDelete && (
          <motion.div
            key="delete-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setAnnouncementToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <EyeOff size={18} className="text-slate-200" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Retract Announcement</h3>
                  <p className="text-[11px] text-slate-300">This can be reversed by reactivating the announcement later</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex gap-2.5">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-slate-400" />
                  <p>The announcement will be <strong className="text-slate-800">deactivated and hidden from public view</strong>. The record is preserved for auditing and can be reactivated at any time.</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Announcement</p>
                  <p className="text-sm font-bold text-slate-900 leading-snug">{announcementToDelete.title}</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAnnouncementToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <EyeOff size={13} />
                  {deleteMutation.isPending ? 'Retracting…' : 'Yes, Retract'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div></DataRegion>
  );
};

export default PublicCommunication;
