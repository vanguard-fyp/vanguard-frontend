import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ShieldCheck, Users, Target, Navigation, UserPlus } from 'lucide-react';
import { TeamCard } from '../../../components/ui/coordination/rescue/TeamCard';
import { TeamDetailSlideOver } from '../../../components/ui/coordination/rescue/TeamDetailSlideOver';
import { RegisterTeamSlideOver } from '../../../components/ui/coordination/rescue/RegisterTeamSlideOver';
import { useRescueTeams, useMissions, useIncidents, useCreateMission } from '../../../hooks';
import { SkeletonList } from '../../../components/ui/shared/SkeletonLoader';
import { useToast } from '../../../context/ToastContext';

import type { AgencyFilter, SeverityLevel, StatusFilter, TeamSortBy, RescueTeam } from '../../../types';
import { MissionWizard } from './MissionWizard';
import { TeamListFilters } from '../../../components/ui/coordination/rescue/TeamListFilters';
import { containerAnim, itemAnim } from '../../../constants';

const RescueOperations: React.FC = () => {
  const { data: teams = [], isLoading: isTeamsLoading } = useRescueTeams();
  const { data: missions = [] } = useMissions();
  const { data: incidents = [] } = useIncidents();
  const createMissionMutation = useCreateMission();
  const { success: toastSuccess, error: toastError } = useToast();
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [selectedTeamForSlideOver, setSelectedTeamForSlideOver] = useState<RescueTeam | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showRegisterSlideOver, setShowRegisterSlideOver] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgency, setFilterAgency] = useState<AgencyFilter>('All');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [sortBy, setSortBy] = useState<TeamSortBy>('default');

  const availableCount = teams.filter((t) => t.status === 'Available').length;
  const deployedCount = teams.filter((t) => t.status === 'Deployed').length;
  const activeMissions = missions.filter((m) => m.status === 'In Progress').length;

  const filteredTeams = useMemo(() => {
    let result = [...teams];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.commander.toLowerCase().includes(q) ||
          t.agency.toLowerCase().includes(q)
      );
    }

    // Agency filter
    if (filterAgency !== 'All') {
      result = result.filter((t) => t.agency === filterAgency);
    }

    // Status filter
    if (filterStatus !== 'All') {
      result = result.filter((t) => t.status === filterStatus);
    }

    // Sort
    if (sortBy === 'personnel') {
      result.sort((a, b) => b.personnelCount - a.personnelCount);
    } else if (sortBy === 'status') {
      const order: Record<string, number> = { Deployed: 0, 'En Route': 1, Available: 2, 'Off Duty': 3 };
      result.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
    }

    return result;
  }, [teams, searchQuery, filterAgency, filterStatus, sortBy]);

  const handleDispatch = (data: {
    incidentId: string;
    teamId: string;
    objective: string;
    priority: SeverityLevel;
    durationHrs: number;
    notes: string;
  }) => {
    const matchedTeam = teams.find((t) => t.id === data.teamId);
    const matchedIncident = incidents.find((i) => i.id === data.incidentId);

    createMissionMutation.mutate(
      {
        title: `Tactical SAR Operation - ${matchedIncident?.title || 'Emergency Sector'}`,
        incidentId: data.incidentId,
        incidentLocation: matchedIncident?.location || 'Sector 01',
        assignedTeamId: data.teamId,
        teamName: matchedTeam?.name || 'SAR Squad',
        agency: matchedTeam?.agency || 'SMART',
        priority: data.priority,
        status: 'In Progress',
        objective: data.objective,
        assignedTime: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + (data.durationHrs || 6) * 3600000).toISOString(),
      },
      {
        onSuccess: () =>
          toastSuccess('Mission Dispatched', `SAR team assigned to ${matchedIncident?.title || 'incident'}`),
        onError: () => toastError('Dispatch Failed', 'Could not create mission. Please retry.'),
      }
    );
    setShowWizard(false);
  };

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-5">
      {/* Page Header */}
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rescue Operations</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Response Coordination · Rescue team assignments, mission tracking, and agency mobilization
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowRegisterSlideOver(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <UserPlus size={14} className="text-blue-600" />
            <span>Register Rescue Unit</span>
          </button>

          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus size={14} />
            <span>Assign Mission</span>
          </button>
        </div>
      </motion.div>

      {/* Compact Analytics Strip */}
      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Total Teams', value: teams.length, sub: '5 federal agencies', color: 'text-slate-700', bg: 'bg-slate-50' },
          { icon: ShieldCheck, label: 'Available', value: availableCount, sub: 'Ready for dispatch', color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { icon: Navigation, label: 'Deployed', value: deployedCount, sub: 'Active field ops', color: 'text-orange-700', bg: 'bg-orange-50' },
          { icon: Target, label: 'Active Missions', value: activeMissions, sub: 'In progress', color: 'text-blue-700', bg: 'bg-blue-50' },
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

      {/* Search / Filter / Sort */}
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

      {/* Team Master List */}
      <motion.div variants={itemAnim} className="space-y-2">
        {isTeamsLoading ? (
          <SkeletonList count={4} />
        ) : (
          <AnimatePresence>
            {filteredTeams.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl px-5 py-10 text-center shadow-xs">
                <Users size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">No teams match your filters</p>
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
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Team Detail Slide-Over (Operations & Backend AI Advisory) */}
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

      {/* Register Team Slide-Over Drawer */}
      <RegisterTeamSlideOver
        isOpen={showRegisterSlideOver}
        onClose={() => setShowRegisterSlideOver(false)}
      />

      {/* Mission Wizard Overlay */}
      <AnimatePresence>
        {showWizard && (
          <MissionWizard
            incidents={incidents}
            teams={teams}
            onClose={() => setShowWizard(false)}
            onDispatch={handleDispatch}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RescueOperations;
