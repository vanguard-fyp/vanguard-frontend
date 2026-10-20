import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ShieldCheck,
  Users,
  Navigation,
  UserPlus,
  LifeBuoy,
  Phone,
  MapPin,
  ArrowRight,
  XCircle,
  Eye,
  EyeOff,
  Camera,
  Play,
  X,
  Search,
} from 'lucide-react';
import { TeamCard } from '../../../components/ui/coordination/rescue/TeamCard';
import { TeamDetailSlideOver } from '../../../components/ui/coordination/rescue/TeamDetailSlideOver';
import { RegisterTeamSlideOver } from '../../../components/ui/coordination/rescue/RegisterTeamSlideOver';
import {
  useRescueTeams,
  useMissions,
  useIncidents,
  useDispatchMission,
  useDeleteRescueTeam,
  useAssistanceRequests,
  useUpdateAssistanceStatus,
} from '../../../hooks';
import { SkeletonList } from '../../../components/ui/shared/SkeletonLoader';
import { useToast } from '../../../context/ToastContext';

import type { AgencyFilter, StatusFilter, TeamSortBy, RescueTeam } from '../../../types';
import type { MissionDispatchRequest } from '../../../services/missionService';
import { MissionWizard } from './MissionWizard';
import { TeamListFilters } from '../../../components/ui/coordination/rescue/TeamListFilters';
import { containerAnim, itemAnim } from '../../../constants';
import { formatDateTime } from '../../../utils/dateFormatter';

const RescueOperations: React.FC = () => {
  const { data: teams = [], isLoading: isTeamsLoading } = useRescueTeams();
  const { data: missions = [] } = useMissions();
  const { data: incidents = [] } = useIncidents();
  const { data: assistanceRequests = [], isLoading: isAssistanceLoading } = useAssistanceRequests();
  const dispatchMutation = useDispatchMission();
  const deleteTeamMutation = useDeleteRescueTeam();
  const updateAssistanceMutation = useUpdateAssistanceStatus();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'teams' | 'missions' | 'assistance'>('teams');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [selectedTeamForSlideOver, setSelectedTeamForSlideOver] = useState<RescueTeam | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardIncidentId, setWizardIncidentId] = useState<string | null>(null);
  const [wizardSourceSos, setWizardSourceSos] = useState<any | null>(null);
  const [showRegisterSlideOver, setShowRegisterSlideOver] = useState(false);
  const [showClosedSos, setShowClosedSos] = useState(false);
  const [sosSearch, setSosSearch] = useState('');
  const [sosStatusFilter, setSosStatusFilter] = useState<'All' | 'Pending' | 'Acknowledged' | 'Dispatched' | 'Resolved'>('All');
  const [sosToCancelId, setSosToCancelId] = useState<any | null>(null);
  const [editingTeam, setEditingTeam] = useState<RescueTeam | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link from Disaster Intelligence: /response/rescue?incidentId=… opens the wizard preselected.
  useEffect(() => {
    const linked = searchParams.get('incidentId');
    if (!linked) return;
    setWizardIncidentId(linked);
    setShowWizard(true);
    const next = new URLSearchParams(searchParams);
    next.delete('incidentId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [selectedMediaModal, setSelectedMediaModal] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);

  const handleOpenRegister = () => {
    setEditingTeam(null);
    setShowRegisterSlideOver(true);
  };

  const handleOpenEdit = (team: RescueTeam) => {
    setEditingTeam(team);
    setShowRegisterSlideOver(true);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgency, setFilterAgency] = useState<AgencyFilter>('All');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [sortBy, setSortBy] = useState<TeamSortBy>('default');

  // Same capacity rule as the dashboard (backend capacity_service).
  const availableCount = teams.filter((t) => t.eligible !== false && (t.available_personnel ?? (t.status?.toLowerCase() === 'available' ? 1 : 0)) > 0).length;
  const deployedCount = teams.filter((t) => (t.active_assignment_count ?? 0) > 0 || ['deployed', 'en route'].includes(t.status?.toLowerCase() || '')).length;
  const pendingSosCount = assistanceRequests.filter((a: any) => a.status === 'Pending' || a.status === 'Acknowledged').length;

  const filteredTeams = useMemo(() => {
    let result = [...teams];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.commander.toLowerCase().includes(q) ||
          t.agency.toLowerCase().includes(q)
      );
    }

    if (filterAgency !== 'All') {
      result = result.filter((t) => t.agency?.toUpperCase() === filterAgency.toUpperCase());
    }

    if (filterStatus !== 'All') {
      result = result.filter((t) => t.status?.trim().toLowerCase() === filterStatus.trim().toLowerCase());
    }

    if (sortBy === 'personnel') {
      result.sort((a, b) => b.personnel_count - a.personnel_count);
    } else if (sortBy === 'status') {
      const order: Record<string, number> = { deployed: 0, 'en route': 1, available: 2, 'off duty': 3 };
      result.sort((a, b) => (order[a.status?.toLowerCase() || ''] ?? 9) - (order[b.status?.toLowerCase() || ''] ?? 9));
    }

    return result;
  }, [teams, searchQuery, filterAgency, filterStatus, sortBy]);

  /** Approved dispatch. Throws on failure so the wizard stays open and shows the reason. */
  const handleDispatch = async (req: MissionDispatchRequest): Promise<void> => {
    const mission = await dispatchMutation.mutateAsync(req);
    toastSuccess(
      'Mission dispatched',
      `${mission.display_id ?? 'Mission'} approved with ${req.teams.length} team(s), ${req.teams.reduce((a, t) => a + t.personnel, 0)} personnel.`
    );
    if (wizardSourceSos) {
      updateAssistanceMutation.mutate(
        { requestId: wizardSourceSos.id, status: 'Dispatched' },
        { onError: () => toastError('SOS status not updated', 'The mission was dispatched, but the SOS request status could not be updated.') }
      );
    }
    setWizardIncidentId(null);
    setWizardSourceSos(null);
  };

  const [teamToDelete, setTeamToDelete] = useState<RescueTeam | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteTeam = (team: RescueTeam) => {
    setTeamToDelete(team);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!teamToDelete) return;
    deleteTeamMutation.mutate(teamToDelete.id, {
      onSuccess: () => {
        toastSuccess('Rescue Unit Decommissioned', `Team "${teamToDelete.name}" has been removed from active registry.`);
        if (expandedTeamId === teamToDelete.id) setExpandedTeamId(null);
        setShowDeleteModal(false);
        setTeamToDelete(null);
      },
      onError: (err: any) => {
        toastError('Decommission Failed', err.message || 'Could not remove rescue team.');
      },
    });
  };

  const handleAcknowledgeAssistance = (sos: any) => {
    updateAssistanceMutation.mutate(
      { requestId: sos.id, status: 'Acknowledged' },
      {
        onSuccess: () => toastSuccess('SOS Acknowledged', `Request ${sos.display_id || sos.id} acknowledged by EOC.`),
      }
    );
  };

  const handleCancelAssistance = (sos: any) => {
    setSosToCancelId(sos);
  };

  const handleConfirmCancelSos = () => {
    if (!sosToCancelId) return;
    updateAssistanceMutation.mutate(
      { requestId: sosToCancelId.id, status: 'Cancelled' },
      {
        onSuccess: () => {
          toastSuccess('SOS Cancelled', `Request ${sosToCancelId.display_id || sosToCancelId.id} has been cancelled after validation.`);
          setSosToCancelId(null);
        },
        onError: () => {
          toastError('Cancel Failed', 'Could not cancel the request. Please retry.');
          setSosToCancelId(null);
        },
      }
    );
  };

  const handleDeploySosSquad = (sos: any) => {
    if (sos.linked_incident_id) {
      setWizardIncidentId(sos.linked_incident_id);
    }
    setWizardSourceSos(sos);
    setShowWizard(true);
  };

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-5">
      {/* Page Header */}
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rescue Operations</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Response Coordination · Rescue team assignments, citizen SOS intake, and multi-agency mobilization
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenRegister}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <UserPlus size={14} className="text-blue-600" />
            <span>Register Rescue Unit</span>
          </button>

          <button
            onClick={() => {
              setWizardIncidentId(null);
              setShowWizard(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-slate-900/20 cursor-pointer"
          >
            <Plus size={14} />
            <span>Assign Mission</span>
          </button>
        </div>
      </motion.div>

      {/* Analytics Strip (Blue / Slate Palette) */}
      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Registered Squads', value: teams.length, sub: 'SMART / BOMBA / APM / PDRM', color: 'text-slate-800', bg: 'bg-white' },
          { icon: ShieldCheck, label: 'Available Squads', value: availableCount, sub: 'Ready for dispatch', color: 'text-blue-700', bg: 'bg-white' },
          { icon: Navigation, label: 'Deployed Squads', value: deployedCount, sub: 'Active field ops', color: 'text-slate-800', bg: 'bg-white' },
          { icon: LifeBuoy, label: 'Pending Citizen SOS', value: pendingSosCount, sub: 'Assistance requests', color: 'text-blue-700', bg: 'bg-white' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className={`${bg} border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center gap-3`}>
            <Icon size={20} className={color} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="text-[11px] text-slate-500 font-medium">{sub}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* View Switcher Tabs */}
      <motion.div variants={itemAnim} className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Rescue Squads Fleet ({teams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assistance')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'assistance'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <LifeBuoy size={14} />
          <span>Citizen SOS Assistance ({assistanceRequests.length})</span>
          {pendingSosCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-white font-mono">
              {pendingSosCount}
            </span>
          )}
        </button>
      </motion.div>

      {/* TAB 1: Rescue Squads Fleet */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <motion.div variants={itemAnim}>
            <TeamListFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterAgency={filterAgency}
              onAgencyChange={setFilterAgency}
              filterStatus={filterStatus}
              onStatusChange={setFilterStatus}
              sortBy={sortBy}
              onSortChange={setSortBy}
              totalCount={teams.length}
              filteredCount={filteredTeams.length}
            />
          </motion.div>

          <motion.div variants={itemAnim} className="space-y-2">
            {isTeamsLoading ? (
              <SkeletonList count={4} />
            ) : (
              <AnimatePresence>
                {filteredTeams.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center shadow-2xs">
                    <Users size={28} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No teams match your filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting the agency or status filter</p>
                  </div>
                ) : (
                  filteredTeams.map((team) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <TeamCard
                        team={team}
                        missions={missions}
                        incidents={incidents}
                        isExpanded={expandedTeamId === team.id}
                        onToggle={() =>
                          setExpandedTeamId(expandedTeamId === team.id ? null : team.id)
                        }
                        onViewOperations={(t) => setSelectedTeamForSlideOver(t)}
                        onEdit={handleOpenEdit}
                        onDelete={handleDeleteTeam}
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      )}

      {/* TAB 2: Citizen SOS Assistance Requests Feed */}
      {activeTab === 'assistance' && (() => {
        const filteredAssistance = assistanceRequests.filter((sos: any) => {
          const closed = ['Dispatched', 'Resolved', 'Cancelled'].includes(sos.status);
          if (!showClosedSos && closed && sosStatusFilter === 'All') return false;
          if (sosStatusFilter !== 'All' && sos.status !== sosStatusFilter) return false;
          if (sosSearch.trim()) {
            const q = sosSearch.trim().toLowerCase();
            const match =
              (sos.location || '').toLowerCase().includes(q) ||
              (sos.description || '').toLowerCase().includes(q) ||
              (sos.display_id || sos.displayId || '').toLowerCase().includes(q) ||
              (sos.reporter_name || sos.reporterName || '').toLowerCase().includes(q) ||
              (sos.request_type || sos.requestType || '').toLowerCase().includes(q);
            if (!match) return false;
          }
          return true;
        });

        const statusCounts: Record<string, number> = {
          All: assistanceRequests.length,
          Pending: assistanceRequests.filter((s: any) => s.status === 'Pending').length,
          Acknowledged: assistanceRequests.filter((s: any) => s.status === 'Acknowledged').length,
          Dispatched: assistanceRequests.filter((s: any) => s.status === 'Dispatched').length,
          Resolved: assistanceRequests.filter((s: any) => s.status === 'Resolved').length,
        };

        return (
          <motion.div variants={itemAnim} className="space-y-4">
            {/* Search and Filters Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sosSearch}
                    onChange={(e) => setSosSearch(e.target.value)}
                    placeholder="Search SOS by location, description, or reporter..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowClosedSos((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                >
                  {showClosedSos ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showClosedSos ? 'Hide Closed' : 'Show Closed'}</span>
                </button>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">Status:</span>
                {(['All', 'Pending', 'Acknowledged', 'Dispatched'] as const).map((st) => {
                  const active = sosStatusFilter === st;
                  const count = statusCounts[st] ?? 0;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSosStatusFilter(st)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        active
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{st}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        active ? 'bg-blue-700/60 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isAssistanceLoading ? (
              <SkeletonList count={3} />
            ) : filteredAssistance.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl px-5 py-12 text-center shadow-2xs">
                <LifeBuoy size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No Citizen Assistance Requests Found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {sosSearch.trim() || sosStatusFilter !== 'All'
                    ? 'No requests match your search query or selected status.'
                    : 'All emergency SOS requests have been responded to or resolved.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAssistance.map((sos: any) => {
                  const isPending = sos.status === 'Pending';
                  const isAcknowledged = sos.status === 'Acknowledged';
                  const isDispatched = sos.status === 'Dispatched';
                  const isResolved = sos.status === 'Resolved';
                  const isCancelled = sos.status === 'Cancelled';
                  const isClosed = isDispatched || isResolved || isCancelled;

                  return (
                    <div
                      key={sos.id}
                      className={`bg-white border rounded-xl p-4 shadow-2xs transition-all space-y-3 ${
                        isClosed ? 'opacity-65 border-slate-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {sos.display_id || sos.displayId || 'SOS-2026'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                              {sos.request_type || sos.requestType || 'Rescue'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isPending
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : isAcknowledged
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : isDispatched
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : isCancelled
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {sos.status}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-900 mt-1.5 flex items-center gap-1.5">
                            <MapPin size={13} className="text-blue-600 shrink-0" />
                            <span>{sos.location}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold text-slate-900 block">
                            {sos.people_affected || sos.peopleAffected || 1} pax affected
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatDateTime(sos.created_at || sos.createdAt)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-2.5 rounded-lg leading-relaxed">
                        {sos.description}
                      </p>

                      {/* Citizen Submitted Photos / Videos Gallery */}
                      {(() => {
                        const mediaList: string[] = sos.media_urls || sos.mediaUrls || [];
                        if (mediaList.length === 0) return null;

                        return (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Camera size={12} className="text-blue-600" />
                              Citizen Attached Ground Evidence ({mediaList.length})
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {mediaList.map((url: string, idx: number) => {
                                const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('video');
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => setSelectedMediaModal({ url, type: isVideo ? 'video' : 'image', title: `Citizen SOS Attachment #${idx + 1}` })}
                                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 w-20 h-16 cursor-pointer hover:border-blue-500 shadow-2xs transition-all"
                                  >
                                    {isVideo ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                                        <Play size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-bold mt-0.5">Video</span>
                                      </div>
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Citizen attachment ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                                      <Eye size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                          <span>Reporter: <strong className="text-slate-700">{sos.reporter_name || sos.reporterName || 'Citizen'}</strong></span>
                          {sos.reporter_contact || sos.reporterContact ? (
                            <span className="flex items-center gap-1 text-blue-700 font-semibold">
                              <Phone size={11} /> {sos.reporter_contact || sos.reporterContact}
                            </span>
                          ) : null}
                        </div>

                        {!isClosed && (
                          <div className="flex items-center gap-2">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAcknowledgeAssistance(sos)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                >
                                  Acknowledge
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelAssistance(sos)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-lg border border-red-200 transition-colors cursor-pointer"
                                >
                                  <XCircle size={12} />
                                  Cancel
                                </button>
                              </>
                            )}
                            {isAcknowledged && (
                              <button
                                type="button"
                                onClick={() => handleDeploySosSquad(sos)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <span>Deploy Tactical Squad</span>
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Team Detail Slide-Over */}
      <AnimatePresence>
        {selectedTeamForSlideOver && (
          <TeamDetailSlideOver
            team={selectedTeamForSlideOver}
            missions={missions}
            incidents={incidents}
            onClose={() => setSelectedTeamForSlideOver(null)}
          />
        )}
      </AnimatePresence>

      {/* Register / Edit Team Slide-Over Drawer */}
      <RegisterTeamSlideOver
        isOpen={showRegisterSlideOver}
        teamToEdit={editingTeam}
        onClose={() => {
          setShowRegisterSlideOver(false);
          setEditingTeam(null);
        }}
      />

      {/* Decommission Team Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && teamToDelete && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Decommission Rescue Unit</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Are you sure you want to decommission and remove{' '}
                    <strong className="text-slate-900">{teamToDelete.name}</strong> ({teamToDelete.agency})? 
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteTeamMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {deleteTeamMutation.isPending ? 'Decommissioning...' : 'Confirm Decommission'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mission Wizard Overlay */}
      <AnimatePresence>
        {showWizard && (
          <MissionWizard
            incidents={incidents}
            teams={teams}
            defaultIncidentId={wizardIncidentId}
            onClose={() => {
              setShowWizard(false);
              setWizardIncidentId(null);
              setWizardSourceSos(null);
            }}
            onDispatch={handleDispatch}
          />
        )}
      </AnimatePresence>

      {/* Cancel SOS Request Confirmation Modal */}
      <AnimatePresence>
        {sosToCancelId && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSosToCancelId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle size={22} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cancel SOS Request</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Are you sure you want to cancel request{' '}
                    <strong className="text-slate-900">{sosToCancelId.display_id || sosToCancelId.displayId || sosToCancelId.id}</strong>?
                  </p>
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin size={11} className="text-blue-600" />
                      {sosToCancelId.location}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {sosToCancelId.description}
                    </p>
                  </div>
                  <p className="text-[11px] text-red-600 font-medium mt-2">
                    This will mark the request as Cancelled. This action cannot be undone.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSosToCancelId(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Keep Open
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancelSos}
                    disabled={updateAssistanceMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    {updateAssistanceMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Citizen Attachment Lightbox Modal */}
      <AnimatePresence>
        {selectedMediaModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedMediaModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl w-full"
            >
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-blue-400" />
                  <span className="text-xs font-bold text-white">{selectedMediaModal.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMediaModal(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[300px]">
                {selectedMediaModal.type === 'video' ? (
                  <video
                    src={selectedMediaModal.url}
                    controls
                    autoPlay
                    className="max-h-[60vh] max-w-full rounded-lg"
                  />
                ) : (
                  <img
                    src={selectedMediaModal.url}
                    alt={selectedMediaModal.title}
                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RescueOperations;
