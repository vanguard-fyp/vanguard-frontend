import { useAuth } from '../../../context/AuthContext';
import { DataRegion } from '../../../components/common/DataRegion';
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Plus,
  ShieldCheck,
  Users,
  Navigation,
  UserPlus,
  LifeBuoy,
  Phone,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
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
import { ConfirmModal } from '../../../components/ui/shared/Modal';
import { useToast } from '../../../context/ToastContext';

import type { AgencyFilter, StatusFilter, TeamSortBy, RescueTeam } from '../../../types';
import type { MissionDispatchRequest } from '../../../services/missionService';
import { MissionWizard } from './MissionWizard';
import { TeamListFilters } from '../../../components/ui/coordination/rescue/TeamListFilters';
import { containerAnim, itemAnim } from '../../../constants';
import { formatDateTime } from '../../../utils/dateFormatter';
import { Tag, type Tone } from '../../../components/ui/shared/Tag';
import { relativeTime } from '../../../utils/display';
import { sortSosQueue } from '../../../utils/sosQueue';
import { activeResponses, type ActiveResponse } from '../../../utils/sosResponses';

/** Reasons an officer can close an SOS, and the status each one ends in. */
const SOS_CLOSE_REASONS: { reason: string; status: 'Resolved' | 'Cancelled' }[] = [
  { reason: 'Already rescued', status: 'Resolved' },
  { reason: 'Citizen safe', status: 'Resolved' },
  { reason: 'Handled by another agency', status: 'Resolved' },
  { reason: 'Duplicate report', status: 'Cancelled' },
  { reason: 'False report', status: 'Cancelled' },
  { reason: 'Other', status: 'Cancelled' },
];
const SOS_HINT_KM = 5;

/* One size and shape for every SOS action; filled blue only for the next step. */
const SOS_BTN = 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600';
const SOS_BTN_PRIMARY = 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700';
const SOS_BTN_RESOLVE = 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600 hover:border-teal-700';
const SOS_BTN_LINK = 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-transparent';
const SOS_BTN_CLOSE = 'bg-red-50 hover:bg-red-100 text-red-700 border-transparent';
const SOS_BTN_WARN = 'bg-white hover:bg-amber-50 text-amber-800 border-amber-300';

const SOS_TONE: Record<string, Tone> = { Pending: 'amber', Acknowledged: 'blue', Dispatched: 'cyan', Resolved: 'teal', Cancelled: 'slate' };
/** A labelled block in an SOS request's details. */
const SosDetail: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold text-slate-500 mb-1">{label}</p>
    {children}
  </div>
);

/** Queue columns, shared by the header and every row so they stay aligned. */
const SOS_COLS = 'md:grid-cols-[88px_minmax(0,1fr)_56px_112px_132px_20px]';

const RescueOperations: React.FC = () => {
  const teamsQuery = useRescueTeams();
  const { data: teams = [], isLoading: isTeamsLoading } = teamsQuery;
  const missionsQuery = useMissions();
  const { data: missions = [] } = missionsQuery;
  const incidentsQuery = useIncidents();
  const { data: incidents = [] } = incidentsQuery;
  const sosQuery = useAssistanceRequests();
  const { data: assistanceRequests = [], isLoading: isAssistanceLoading } = sosQuery;
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
  const { user } = useAuth();
  const syncKey = `vanguard:sos-sync:${user?.id ?? ''}`;
  const [pendingSosSync, setPendingSosSync] = useState<Record<string, string>>(() => {
    try { return JSON.parse(sessionStorage.getItem(syncKey) || '{}'); } catch { return {}; }
  });
  useEffect(() => { sessionStorage.setItem(syncKey, JSON.stringify(pendingSosSync)); }, [syncKey, pendingSosSync]);
  const retrySosSync = async (requestId: string) => {
    try {
      await updateAssistanceMutation.mutateAsync({ requestId, status: 'Dispatched' });
      setPendingSosSync((previous) => { const next = { ...previous }; delete next[requestId]; return next; });
      toastSuccess('SOS updated', 'The existing mission is now reflected in the SOS status.');
    } catch (error) {
      toastError('SOS status not updated', (error as Error).message || 'Retry the status update; do not dispatch another mission.');
    }
  };

  const [showRegisterSlideOver, setShowRegisterSlideOver] = useState(false);
  const [showClosedSos, setShowClosedSos] = useState(false);
  const [sosSearch, setSosSearch] = useState('');
  const [sosStatusFilter, setSosStatusFilter] = useState<'All' | 'Pending' | 'Acknowledged' | 'Dispatched' | 'Resolved'>('All');
  const [sosToCancelId, setSosToCancelId] = useState<any | null>(null);
  const [sosToResolve, setSosToResolve] = useState<any | null>(null);
  const [openSosId, setOpenSosId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const [sosCloseReason, setSosCloseReason] = useState('');
  const [sosCloseAttempted, setSosCloseAttempted] = useState(false);
  const [sosToLink, setSosToLink] = useState<any | null>(null);
  const [sosLinkIncidentId, setSosLinkIncidentId] = useState('');
  const [editingTeam, setEditingTeam] = useState<RescueTeam | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgency, setFilterAgency] = useState<AgencyFilter>('All');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [sortBy, setSortBy] = useState<TeamSortBy>('default');

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
      try {
        await updateAssistanceMutation.mutateAsync({ requestId: wizardSourceSos.id, status: 'Dispatched' });
      } catch {
        setPendingSosSync((previous) => ({ ...previous, [wizardSourceSos.id]: mission.display_id || mission.id }));
        toastError('Mission dispatched; SOS update failed', 'Use Retry SOS update to repair the status. The mission must not be dispatched again.');
      }
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
        onError: (error) => toastError('SOS not acknowledged', error.message),
      }
    );
  };

  const handleCancelAssistance = (sos: any) => {
    setSosCloseReason('');
    setSosCloseAttempted(false);
    setSosToCancelId(sos);
  };

  const handleConfirmCloseSos = () => {
    if (!sosToCancelId) return;
    const choice = SOS_CLOSE_REASONS.find((r) => r.reason === sosCloseReason);
    if (!choice) {
      setSosCloseAttempted(true);
      return;
    }
    updateAssistanceMutation.mutate(
      { requestId: sosToCancelId.id, status: choice.status, closureReason: choice.reason },
      {
        onSuccess: () => {
          toastSuccess('SOS closed', `${sosToCancelId.display_id || sosToCancelId.id}: ${choice.reason}.`);
          setSosToCancelId(null);
        },
        onError: (error) => toastError('SOS not closed', error.message),
      }
    );
  };

  const responsesFor = (sos: any): ActiveResponse[] =>
    activeResponses(sos.coordinates ?? null, missions, incidents);

  const handleOpenLink = (sos: any, incidentId?: string) => {
    setSosLinkIncidentId(incidentId ?? responsesFor(sos)[0]?.incidentId ?? '');
    setSosToLink(sos);
  };

  const handleConfirmLinkSos = () => {
    if (!sosToLink || !sosLinkIncidentId) return;
    updateAssistanceMutation.mutate(
      { requestId: sosToLink.id, status: 'Dispatched', linkedIncidentId: sosLinkIncidentId },
      {
        onSuccess: () => {
          toastSuccess('SOS linked', `${sosToLink.display_id || sosToLink.id} joined the existing response.`);
          setSosToLink(null);
        },
        onError: (error) => toastError('SOS not linked', error.message),
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
    <DataRegion queries={[missionsQuery, incidentsQuery]} label="Mission and incident details" keepContent><motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-5">
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

      {/* Analytics Strip */}
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'teams'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
        >
          <ShieldCheck size={14} />
          <span>Rescue Squads Fleet ({teams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assistance')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'assistance'
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
        <DataRegion queries={[teamsQuery]} label="Rescue teams"><div className="space-y-4">
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
        </div></DataRegion>
      )}

      {/* TAB 2: Citizen SOS Assistance Requests Feed */}
      {activeTab === 'assistance' && (<DataRegion queries={[sosQuery]} label="SOS requests">{(() => {
        const filteredAssistance = sortSosQueue(assistanceRequests.filter((sos: any) => {
          const closed = ['Resolved', 'Cancelled'].includes(sos.status);
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
        }) as any[]);

        const statusCounts: Record<string, number> = {
          All: assistanceRequests.length,
          Pending: assistanceRequests.filter((s: any) => s.status === 'Pending').length,
          Acknowledged: assistanceRequests.filter((s: any) => s.status === 'Acknowledged').length,
          Dispatched: assistanceRequests.filter((s: any) => s.status === 'Dispatched').length,
          Resolved: assistanceRequests.filter((s: any) => s.status === 'Resolved').length,
        };

        return (
          <motion.div variants={itemAnim} className="space-y-4">
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
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${active
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      <span>{st}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${active ? 'bg-blue-700/60 text-white' : 'bg-slate-200 text-slate-600'
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
              <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                <div className={`hidden md:grid ${SOS_COLS} gap-x-4 px-4 py-2 bg-slate-50/70 text-[11px] font-medium text-slate-500`}>
                  <span>Received</span>
                  <span>Request</span>
                  <span>People</span>
                  <span>Status</span>
                  <span className="sr-only">Next step</span>
                  <span />
                </div>
                <ul className="divide-y divide-slate-100">
                {filteredAssistance.map((sos: any) => {
                  const isPending = sos.status === 'Pending';
                  const isAcknowledged = sos.status === 'Acknowledged';
                  const isDispatched = sos.status === 'Dispatched';
                  const isClosed = sos.status === 'Resolved' || sos.status === 'Cancelled';
                  const open = openSosId === sos.id;
                  const toggle = () => setOpenSosId(open ? null : sos.id);
                  const mediaList: string[] = sos.media_urls || sos.mediaUrls || [];
                  const received = relativeTime(sos.created_at || sos.createdAt) ?? 'Unknown';
                  const people = sos.people_affected || sos.peopleAffected || 1;
                  const type = sos.request_type || sos.requestType || 'Rescue';
                  const contact = sos.reporter_contact || sos.reporterContact;
                  const status = <Tag tone={SOS_TONE[sos.status] ?? 'slate'}>{sos.status}</Tag>;
                  const stop = (run: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); run(); };
                  const nextStep = isClosed ? null : isPending ? (
                    <button type="button" onClick={stop(() => handleAcknowledgeAssistance(sos))} className={`${SOS_BTN} ${SOS_BTN_PRIMARY}`}>Acknowledge</button>
                  ) : isDispatched ? (
                    <button type="button" disabled={updateAssistanceMutation.isPending} onClick={stop(() => setSosToResolve(sos))} className={`${SOS_BTN} ${SOS_BTN_RESOLVE}`}><CheckCircle2 size={13} aria-hidden="true" />Mark Resolved</button>
                  ) : isAcknowledged && pendingSosSync[sos.id] ? (
                    <button type="button" disabled={updateAssistanceMutation.isPending} onClick={stop(() => void retrySosSync(sos.id))} className={`${SOS_BTN} ${SOS_BTN_WARN}`}>Retry update</button>
                  ) : isAcknowledged ? (
                    <button type="button" onClick={stop(() => handleDeploySosSquad(sos))} className={`${SOS_BTN} ${SOS_BTN_PRIMARY}`}>Deploy squad<ArrowRight size={13} aria-hidden="true" /></button>
                  ) : null;

                  return (
                    <li key={sos.id} className={isClosed ? 'text-slate-500' : ''}>
                      <div onClick={toggle} className={`grid grid-cols-[minmax(0,1fr)_auto] ${SOS_COLS} gap-x-4 gap-y-1 items-center px-4 py-2.5 cursor-pointer transition-colors ${open ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}>
                        <span className="hidden md:block text-xs text-slate-600 tabular-nums whitespace-nowrap" title={formatDateTime(sos.created_at || sos.createdAt)}>{received}</span>
                        <p className="min-w-0 text-[13px] text-slate-900 truncate">
                          <span className="font-semibold">{type}</span>
                          <span className="text-slate-500"> · </span>
                          {sos.location}
                          {mediaList.length > 0 && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[11px] text-slate-500 tabular-nums align-baseline">
                              <Camera size={11} aria-hidden="true" />{mediaList.length}<span className="sr-only"> attachments</span>
                            </span>
                          )}
                        </p>
                        <span className="hidden md:block text-xs text-slate-700 tabular-nums">{people}</span>
                        <span className="hidden md:block">{status}</span>
                        <span className="row-start-2 md:row-start-auto col-start-2 md:col-start-auto justify-self-end md:justify-self-start">{nextStep}</span>
                        <button type="button" aria-expanded={open} aria-label={open ? 'Hide details' : 'Show details'} onClick={stop(toggle)}
                          className="row-start-1 col-start-2 md:row-start-auto md:col-start-auto justify-self-end text-slate-400 hover:text-slate-700 rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600">
                          <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                        <span className="md:hidden row-start-2 col-start-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">{status}<span className="tabular-nums">{received} · {people} {people === 1 ? 'person' : 'people'}</span></span>
                      </div>

                      <AnimatePresence initial={false}>
                      {open && (
                        <motion.div key="details" className="overflow-hidden"
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}>
                        <div className="bg-blue-50/70 px-4 pb-4">
                          <div className="bg-white rounded-xl overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px]">
                              <div className="p-4 space-y-3.5 min-w-0">
                                <SosDetail label="What the citizen reported">
                                  <p className="text-[13px] text-slate-900 leading-relaxed bg-slate-50 rounded-lg px-3 py-2">{sos.description || 'No description given.'}</p>
                                </SosDetail>
                                {mediaList.length > 0 && (
                                  <SosDetail label={`Photos and videos · ${mediaList.length}`}>
                                    <div className="flex flex-wrap gap-1.5">
                              {mediaList.map((url: string, idx: number) => {
                                const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('video');
                                const title = `Citizen SOS Attachment #${idx + 1}`;
                                return (
                                  <button key={idx} type="button" aria-label={`Open attachment ${idx + 1}`} onClick={() => setSelectedMediaModal({ url, type: isVideo ? 'video' : 'image', title })}
                                    className="rounded-md overflow-hidden border border-slate-200 bg-slate-100 w-16 h-12 cursor-pointer hover:border-slate-400 transition-colors">
                                    {isVideo ? (
                                      <span className="w-full h-full flex items-center justify-center bg-slate-800 text-white"><Play size={14} aria-hidden="true" /></span>
                                    ) : (
                                      <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                                  </SosDetail>
                                )}
                                {isAcknowledged && !pendingSosSync[sos.id] && (() => {
                                  const near = responsesFor(sos)[0];
                                  return near && near.km != null && near.km <= SOS_HINT_KM && (
                                    <p className="text-xs text-blue-900 bg-blue-50 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                                      <span className="min-w-0"><strong className="font-semibold">{near.teams[0]}</strong> is already on {near.displayId}, {near.km.toFixed(1)} km away</span>
                                      <button type="button" onClick={() => handleOpenLink(sos, near.incidentId)} className={`${SOS_BTN} ${SOS_BTN_LINK} shrink-0`}>Link</button>
                                    </p>
                                  );
                                })()}
                                {isClosed && sos.closure_reason && (
                                  <SosDetail label="Why it was closed"><p className="text-xs text-slate-800">{sos.closure_reason}</p></SosDetail>
                                )}
                              </div>
                              <dl className="p-4 space-y-2.5 bg-slate-50/60 text-xs">
                                <div><dt className="text-[11px] font-semibold text-slate-500">Reporter</dt><dd className="font-semibold text-slate-900 mt-0.5">{sos.reporter_name || sos.reporterName || 'Citizen'}</dd></div>
                                <div><dt className="text-[11px] font-semibold text-slate-500">Phone</dt><dd className="mt-0.5">{contact
                                  ? <a href={`tel:${String(contact).replace(/\s/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline tabular-nums"><Phone size={12} aria-hidden="true" />{contact}</a>
                                  : <span className="text-slate-400">Not given</span>}</dd></div>
                                <div><dt className="text-[11px] font-semibold text-slate-500">Received</dt><dd className="text-slate-800 mt-0.5 tabular-nums">{formatDateTime(sos.created_at || sos.createdAt)}</dd></div>
                                <div><dt className="text-[11px] font-semibold text-slate-500">SOS ID</dt><dd className="text-slate-800 mt-0.5 tabular-nums">{sos.display_id || sos.displayId || 'Not assigned'}</dd></div>
                              </dl>
                            </div>
                            {!isClosed && (
                              <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-2.5">
                                {isAcknowledged && !pendingSosSync[sos.id] && responsesFor(sos).length > 0 && (
                                  <button type="button" onClick={() => handleOpenLink(sos)} className={`${SOS_BTN} ${SOS_BTN_LINK}`}>Link to Response</button>
                                )}
                                <button type="button" onClick={() => handleCancelAssistance(sos)} className={`${SOS_BTN} ${SOS_BTN_CLOSE}`}><XCircle size={13} aria-hidden="true" />Close SOS</button>
                              </div>
                            )}
                          </div>
                        </div>
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </li>
                  );
                })}
                </ul>
              </div>
            )}
          </motion.div>
        );
      })()}</DataRegion>)}

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

      {/* Resolve SOS Request Confirmation Modal */}
      <ConfirmModal
        open={!!sosToResolve}
        onClose={() => setSosToResolve(null)}
        onConfirm={() => updateAssistanceMutation.mutate({ requestId: sosToResolve.id, status: 'Resolved' }, {
          onSuccess: () => {
            setSosToResolve(null);
            toastSuccess('SOS resolved', 'The request is closed. Any shared mission remains unchanged.');
          },
          onError: (error) => toastError('SOS not resolved', error.message),
        })}
        title="Mark this SOS resolved?"
        icon={CheckCircle2}
        confirmLabel="Mark Resolved"
        pending={updateAssistanceMutation.isPending}
      >
        {sosToResolve?.display_id || sosToResolve?.displayId || 'This request'} no longer needs assistance. This does not close its mission.
      </ConfirmModal>

      {/* Close SOS (a reason is required) */}
      <ConfirmModal
        open={!!sosToCancelId}
        onClose={() => setSosToCancelId(null)}
        onConfirm={handleConfirmCloseSos}
        title="Close this SOS?"
        icon={XCircle}
        confirmLabel="Close SOS"
        danger
        pending={updateAssistanceMutation.isPending}
      >
        <p>{sosToCancelId?.display_id || sosToCancelId?.displayId} · {sosToCancelId?.location}</p>
        <select
          aria-label="Reason for closing"
          value={sosCloseReason}
          onChange={(e) => setSosCloseReason(e.target.value)}
          className={`mt-3 w-full px-3 py-2 text-xs text-slate-800 bg-white border rounded-lg focus:outline-none ${sosCloseAttempted && !sosCloseReason ? 'border-rose-400' : 'border-slate-200 focus:border-blue-600'}`}
        >
          <option value="">Choose a reason</option>
          {SOS_CLOSE_REASONS.map((r) => <option key={r.reason} value={r.reason}>{r.reason}</option>)}
        </select>
        {sosCloseAttempted && !sosCloseReason && (
          <span className="block mt-1 text-[10px] text-rose-500 font-medium">Please choose a reason</span>
        )}
      </ConfirmModal>

      {/* Link an SOS to a response that already has a team */}
      <ConfirmModal
        open={!!sosToLink}
        onClose={() => setSosToLink(null)}
        onConfirm={handleConfirmLinkSos}
        title="Link to existing response?"
        icon={ArrowRight}
        confirmLabel="Link SOS"
        pending={updateAssistanceMutation.isPending}
      >
        <p>No new mission is created. The citizen is told help is on the way.</p>
        <div className="mt-3 space-y-1.5">
          {sosToLink && responsesFor(sosToLink).map((r) => (
            <label key={r.incidentId} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${sosLinkIncidentId === r.incidentId ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200'}`}>
              <input type="radio" name="sos-link" className="mt-0.5" checked={sosLinkIncidentId === r.incidentId} onChange={() => setSosLinkIncidentId(r.incidentId)} />
              <span className="min-w-0 text-[11px] leading-snug">
                <span className="block font-semibold text-slate-900 truncate">{r.displayId} · {r.title}</span>
                <span className="block text-slate-500 truncate">{r.teams.join(', ')}{r.km != null ? ` · ${r.km.toFixed(1)} km` : ''}</span>
              </span>
            </label>
          ))}
        </div>
      </ConfirmModal>

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
    </motion.div></DataRegion>
  );
};

export default RescueOperations;
