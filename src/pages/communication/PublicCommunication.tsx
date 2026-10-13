import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Megaphone, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePaginatedQuery,
  usePageTotal,
  useDebouncedValue,
  filterValue,
} from '../../hooks';
import { announcementService } from '../../services/announcementService';
import { PaginationBar } from '../../components/ui/shared/PaginationBar';
import { CommunicationFilters } from '../../components/ui/communication/CommunicationFilters';
import { CommunicationCard } from '../../components/ui/communication/CommunicationCard';
import { ComposeBroadcastModal } from '../../components/ui/communication/ComposeBroadcastModal';
import type { PublicAnnouncement, CommunicationCategoryFilter, CommunicationSortBy } from '../../types';
import { useToast } from '../../context/ToastContext';
import { containerAnim, itemAnim } from '../../constants';

const PublicCommunication: React.FC = () => {
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CommunicationCategoryFilter>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<CommunicationSortBy>('latest');

  // Server-side list: search, filters and sort are applied by the backend, so
  // the page and its total stay exact however many broadcasts exist.
  const debouncedSearch = useDebouncedValue(searchQuery.trim());
  const listFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category: filterValue(categoryFilter),
      severity: filterValue(severityFilter),
      sort: sortBy,
    }),
    [debouncedSearch, categoryFilter, severityFilter, sortBy]
  );
  const annPage = usePaginatedQuery(
    ['announcements'],
    (args) => announcementService.getAnnouncementsPage(args),
    listFilters,
    10
  );
  const announcements = annPage.items;

  // Header counts: exact totals from the backend (one row fetched each).
  const fetchPage = announcementService.getAnnouncementsPage;
  const { data: totalCount } = usePageTotal(['announcements'], fetchPage, {});
  const { data: activeCount } = usePageTotal(['announcements'], fetchPage, { active: true });
  const { data: evacuationCount } = usePageTotal(['announcements'], fetchPage, { category: 'Evacuation Order' });
  const { data: emergencyCount } = usePageTotal(['announcements'], fetchPage, { category: 'Emergency Alert' });

  const handleToggleActive = (id: string) => {
    const ann = announcements.find((a) => a.id === id);
    if (ann) {
      updateMutation.mutate({ id, updates: { active: !ann.active } });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const toast = useToast();
  // Errors propagate to the modal, which stays open with the officer's text.
  const handlePublish = async (data: Partial<PublicAnnouncement>) => {
    await createMutation.mutateAsync(data);
    setShowComposeModal(false);
    toast.success('Broadcast published', data.title ?? undefined);
  };

  return (
    <motion.div
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

      {/* Top Quick Stats Bar */}
      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Megaphone, label: 'Total Broadcasts', value: totalCount ?? '–', sub: 'Unified registry', color: 'text-slate-700', bg: 'bg-slate-50' },
          { icon: CheckCircle2, label: 'Active Notices', value: activeCount ?? '–', sub: 'Currently live', color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { icon: Shield, label: 'Evacuation Orders', value: evacuationCount ?? '–', sub: 'Mandatory sector moves', color: 'text-orange-700', bg: 'bg-orange-50' },
          { icon: AlertTriangle, label: 'Emergency Alerts', value: emergencyCount ?? '–', sub: 'Red & Amber alerts', color: 'text-red-700', bg: 'bg-red-50' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className={`${bg} border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3`}>
            <Icon size={20} className={color} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="text-[11px] text-slate-500 font-medium">{sub}</p>
            </div>
          </div>
        ))}
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
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalCount={totalCount ?? 0}
          filteredCount={annPage.total}
        />
      </motion.div>

      {/* Unified Public Communication Master List */}
      <motion.div variants={itemAnim} className="space-y-2.5">
        <AnimatePresence>
          {annPage.isLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center text-xs text-slate-400 shadow-xs">
              Loading broadcasts…
            </div>
          ) : annPage.isError ? (
            <div className="bg-white border border-red-200 rounded-xl px-5 py-8 text-center shadow-xs">
              <p className="text-sm font-bold text-red-700">Broadcasts could not be loaded</p>
              <button onClick={() => annPage.refetch()} className="text-xs font-bold text-blue-700 underline mt-1 cursor-pointer">
                Retry
              </button>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center shadow-xs">
              <Megaphone size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">No public communications match your search filters</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting 'All' categories</p>
            </div>
          ) : (
            announcements.map((ann) => (
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
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
        {annPage.total > 0 && (
          <PaginationBar
            pageIndex={annPage.pageIndex}
            pageCount={annPage.pageCount}
            total={annPage.total}
            pageSize={annPage.pageSize}
            onPageChange={annPage.setPageIndex}
            isFetching={annPage.isFetching}
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
    </motion.div>
  );
};

export default PublicCommunication;
