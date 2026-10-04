import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { TeamCard } from '../../../components/ui/coordination/rescue/TeamCard';
import { TeamDetailSlideOver } from '../../../components/ui/coordination/rescue/TeamDetailSlideOver';
import { RegisterTeamSlideOver } from '../../../components/ui/coordination/rescue/RegisterTeamSlideOver';
import { MissionProgressPipeline } from '../../../components/ui/coordination/rescue/MissionProgressPipeline';
import {
  useRescueTeams,
  useMissions,
  useIncidents,
  useCreateMission,
  useDeleteRescueTeam,
  useAssistanceRequests,
  useUpdateAssistanceStatus,
} from '../../../hooks';
import { SkeletonList } from '../../../components/ui/shared/SkeletonLoader';
import { useToast } from '../../../context/ToastContext';

import type { AgencyFilter, SeverityLevel, StatusFilter, TeamSortBy, RescueTeam } from '../../../types';
import { MissionWizard } from './MissionWizard';
import { TeamListFilters } from '../../../components/ui/coordination/rescue/TeamListFilters';
import { containerAnim, itemAnim } from '../../../constants';
import { formatDateTime } from '../../../utils/dateFormatter';

const RescueOperations: React.FC = () => {
  const { data: teams = [], isLoading: isTeamsLoading } = useRescueTeams();
  const { data: missions = [] } = useMissions();
  const { data: incidents = [] } = useIncidents();
  const { data: assistanceRequests = [], isLoading: isAssistanceLoading } = useAssistanceRequests();
  const createMissionMutation = useCreateMission();
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
  const [sosToCancelId, setSosToCancelId] = useState<any | null>(null);
  const [editingTeam, setEditingTeam] = useState<RescueTeam | null>(null);

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

  const availableCount = teams.filter((t) => t.status === 'Available').length;
  const deployedCount = teams.filter((t) => t.status === 'Deployed').length;
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
      result = result.filter((t) => t.agency === filterAgency);
    }

    if (filterStatus !== 'All') {
      result = result.filter((t) => t.status === filterStatus);
    }

    if (sortBy === 'personnel') {
      result.sort((a, b) => b.personnel_count - a.personnel_count);
    } else if (sortBy === 'status') {
      const order: Record<string, number> = { Deployed: 0, 'En Route': 1, Available: 2, 'Off Duty': 3 };
      result.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
    }

    return result;
  }, [teams, searchQuery, filterAgency, filterStatus, sortBy]);

  const handleDispatch = (data: {
    incidentId: string;
    teamId?: string;
    teamIds?: string[];
    objective: string;
    priority: SeverityLevel;
    durationHrs: number;
    notes?: string;
  }) => {
    const matchedIncident = incidents.find((i) => i.id === data.incidentId);
    const assignedIds = data.teamIds || (data.teamId ? [data.teamId] : []);
    const assignedSquads = teams.filter((t) => assignedIds.includes(t.id));
    const primarySquad = assignedSquads[0];

    createMissionMutation.mutate(
      {
        title: `Tactical SAR Operation - ${matchedIncident?.title || 'Emergency Sector'}`,
        incident_id: data.incidentId,
        assigned_team_id: primarySquad?.id,
        team_ids: assignedIds,
        priority: data.priority,
        status: 'In Progress',
        objective: data.notes?.trim()
          ? `${data.objective}\n\nCoordinator notes: ${data.notes.trim()}`
          : data.objective,
        estimated_completion: new Date(Date.now() + (data.durationHrs || 6) * 3600000).toISOString(),
      },
      {
        onSuccess: () => {
          toastSuccess(
            'Mission Dispatched',
            `Tactical mission assigned to ${assignedSquads.length} response squad(s).`
          );
          // If this mission was dispatched from an SOS request, mark it as Dispatched
          if (wizardSourceSos) {
            updateAssistanceMutation.mutate(
              { requestId: wizardSourceSos.id, status: 'Dispatched' },
              { onError: () => {} } // silent — mission creation already succeeded
            );
          }
          setShowWizard(false);
          setWizardIncidentId(null);
          setWizardSourceSos(null);
        },
        onError: () => toastError('Dispatch Failed', 'Could not create mission. Please retry.'),
      }
    );
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
      {activeTab === 'assistance' && (
        <motion.div variants={itemAnim} className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <p className="text-xs text-slate-500 font-medium">
              Live emergency rescue &amp; medical assistance requests filed by citizens on the ground.
            </p>
            <button
              onClick={() => setShowClosedSos(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer shrink-0 bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              {showClosedSos ? <EyeOff size={13} /> : <Eye size={13} />}
              {showClosedSos ? 'Hide Closed' : 'Show Closed'}
            </button>
          </div>

          {isAssistanceLoading ? (
            <SkeletonList count={3} />
          ) : assistanceRequests.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-12 text-center shadow-2xs">
              <LifeBuoy size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Citizen Assistance Requests</p>
              <p className="text-xs text-slate-400 mt-1">All emergency SOS requests have been responded to or resolved.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assistanceRequests
                .filter((sos: any) => {
                  const closed = ['Dispatched', 'Resolved', 'Cancelled'].includes(sos.status);
                  return showClosedSos ? true : !closed;
                })
                .map((sos: any) => {
                const isPending = sos.status === 'Pending';
                const isAcknowledged = sos.status === 'Acknowledged';
                const isDispatched = sos.status === 'Dispatched';
                const isResolved = sos.status === 'Resolved';
                const isCancelled = sos.status === 'Cancelled';
                const isClosed = isDispatched || isResolved || isCancelled;

                return (
                  <div
                    key={sos.id}
                    className={`bg-white border rounded-xl p-4 shadow-2xs transition-all space-y-3 ${isClosed ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
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
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(sos.created_at || sos.createdAt)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-2.5 rounded-lg leading-relaxed">
                      {sos.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span>Reporter: <strong className="text-slate-700">{sos.reporter_name || sos.reporterName || 'Citizen'}</strong></span>
                        {sos.reporter_contact || sos.reporterContact ? (
                          <span className="flex items-center gap-1 text-blue-700 font-mono">
                            <Phone size={11} /> {sos.reporter_contact || sos.reporterContact}
                          </span>
                        ) : null}
                      </div>

                      {!isClosed && (
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleAcknowledgeAssistance(sos)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              >
                                Acknowledge
                              </button>
                              <button
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
              {assistanceRequests.filter((sos: any) => !['Dispatched', 'Resolved', 'Cancelled'].includes(sos.status)).length === 0 && !showClosedSos && (
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-8 text-center shadow-2xs">
                  <LifeBuoy size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Active Requests</p>
                  <p className="text-xs text-slate-400 mt-1">All open requests have been handled. Toggle "Show Closed" to review history.</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

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
                    <strong className="text-slate-900">{teamToDelete.name}</strong> ({teamToDelete.agency})? This will archive the unit and remove it from active field dispatch.
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
    </motion.div>
  );
};

export default RescueOperations;
