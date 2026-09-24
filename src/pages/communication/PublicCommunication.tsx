import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Megaphone, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '../../hooks';
import { CommunicationFilters } from '../../components/ui/communication/CommunicationFilters';
import { CommunicationCard } from '../../components/ui/communication/CommunicationCard';
import { ComposeBroadcastModal } from '../../components/ui/communication/ComposeBroadcastModal';
import type { PublicAnnouncement, CommunicationCategoryFilter, CommunicationChannelFilter, CommunicationSortBy } from '../../types';
import { containerAnim, itemAnim } from '../../constants';

const PublicCommunication: React.FC = () => {
  const { data: announcements = [] } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CommunicationCategoryFilter>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [channelFilter, setChannelFilter] = useState<CommunicationChannelFilter>('All');
  const [sortBy, setSortBy] = useState<CommunicationSortBy>('latest');

  // Stats calculation
  const totalCount = announcements.length;
  const activeCount = announcements.filter((a) => a.active).length;
  const evacuationCount = announcements.filter((a) => a.category === 'Evacuation Order').length;
  const emergencyCount = announcements.filter((a) => a.category === 'Emergency Alert').length;

  // Filter & Sort Logic
  const filteredAnnouncements = useMemo(() => {
    let result = [...announcements];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.targetState.toLowerCase().includes(q) ||
          a.targetDistricts.some((d) => d.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter !== 'All') {
      result = result.filter((a) => a.category === categoryFilter);
    }

    // Severity filter
    if (severityFilter !== 'All') {
      result = result.filter((a) => a.severity === severityFilter);
    }

    // Channel filter
    if (channelFilter !== 'All') {
      result = result.filter((a) =>
        a.channels.includes(channelFilter as PublicAnnouncement['channels'][number])
      );
    }

    // Sort
    if (sortBy === 'severity') {
      const severityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      result.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));
    } else if (sortBy === 'active') {
      result.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
    }

    return result;
  }, [announcements, searchQuery, categoryFilter, severityFilter, channelFilter, sortBy]);

  const handleToggleActive = (id: string) => {
    const ann = announcements.find((a) => a.id === id);
    if (ann) {
      updateMutation.mutate({ id, updates: { active: !ann.active } });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handlePublish = (data: Partial<PublicAnnouncement>) => {
    createMutation.mutate(data);
    setShowComposeModal(false);
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
          { icon: Megaphone, label: 'Total Broadcasts', value: totalCount, sub: 'Unified registry', color: 'text-slate-700', bg: 'bg-slate-50' },
          { icon: CheckCircle2, label: 'Active Notices', value: activeCount, sub: 'Currently live', color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { icon: Shield, label: 'Evacuation Orders', value: evacuationCount, sub: 'Mandatory sector moves', color: 'text-orange-700', bg: 'bg-orange-50' },
          { icon: AlertTriangle, label: 'Emergency Alerts', value: emergencyCount, sub: 'Red & Amber alerts', color: 'text-red-700', bg: 'bg-red-50' },
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
          channelFilter={channelFilter}
          onChannelChange={setChannelFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalCount={announcements.length}
          filteredCount={filteredAnnouncements.length}
        />
      </motion.div>

      {/* Unified Public Communication Master List */}
      <motion.div variants={itemAnim} className="space-y-2.5">
        <AnimatePresence>
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center shadow-xs">
              <Megaphone size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">No public communications match your search filters</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting 'All' categories</p>
            </div>
          ) : (
            filteredAnnouncements.map((ann) => (
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
