import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  Sparkles, MapPin, Users, Target, Flag, Clock, FileText, Send, Shield, Check
} from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import type { AITeamRecommendation, Incident, RescueTeam, SeverityLevel } from '../../../types';
import { steps } from '../../../constants';

export interface ExtendedMissionWizardProps {
  incidents: Incident[];
  teams: RescueTeam[];
  onClose: () => void;
  onDispatch: (data: {
    incidentId: string;
    teamId?: string;
    teamIds?: string[];
    objective: string;
    priority: SeverityLevel;
    durationHrs: number;
  }) => void;
  defaultIncidentId?: string | null;
}

function getAIRecommendation(incident: Incident | null, teams: RescueTeam[]): AITeamRecommendation | null {
  if (!incident) return null;
  const available = teams.find((t) => t.status === 'Available');
  const candidate = available || teams[0];
  if (!candidate) return null;
  return {
    teamId: candidate.id,
    confidence: available ? 92 : 68,
    rationale: available
      ? `${candidate.name} (${candidate.agency}) is fully ready with ${candidate.personnel_count} personnel. Located at ${candidate.current_location}, enabling rapid deployment.`
      : `Squads are partially engaged. ${candidate.name} has the highest capacity to reinforce this incident.`,
    eta: available ? '~20 mins' : '~45 mins',
  };
}

export const MissionWizard: React.FC<ExtendedMissionWizardProps> = ({
  incidents,
  teams,
  onClose,
  onDispatch,
  defaultIncidentId,
}) => {
  const [step, setStep] = useState(0);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(defaultIncidentId || null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [objective, setObjective] = useState('');
  const [priority, setPriority] = useState<SeverityLevel>('High');
  const [durationHrs, setDurationHrs] = useState(6);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;
  const aiRec = getAIRecommendation(selectedIncident, teams);

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Pre-fill objective when incident is selected
  React.useEffect(() => {
    if (selectedIncident && !objective) {
      setObjective(`Conduct immediate Search and Rescue and evacuation operations for ${selectedIncident.title} at ${selectedIncident.location}.`);
      setPriority(selectedIncident.severity || 'High');
    }
  }, [selectedIncident, objective]);

  const canProceed = (): boolean => {
    if (step === 0) return !!selectedIncidentId;
    if (step === 1) return selectedTeamIds.length > 0;
    if (step === 2) return objective.trim().length > 3;
    return true;
  };

  const handleNext = () => {
    if (step === 0 && selectedIncidentId && aiRec && selectedTeamIds.length === 0) {
      setSelectedTeamIds([aiRec.teamId]);
    }
    if (step < steps.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleDispatch = () => {
    if (!selectedIncidentId || selectedTeamIds.length === 0) return;
    onDispatch({
      incidentId: selectedIncidentId,
      teamId: selectedTeamIds[0],
      teamIds: selectedTeamIds,
      objective: objective || 'Emergency search and rescue operation',
      priority,
      durationHrs,
    });
    onClose();
  };

  const selectedTeamsList = teams.filter((t) => selectedTeamIds.includes(t.id));
  const totalPersonnel = selectedTeamsList.reduce((acc, t) => acc + (t.personnel_count || 0), 0);

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Wizard Header */}
        <div className="px-6 py-4 bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Dispatch Rescue Mission</h2>
            <p className="text-[11px] text-slate-300 font-medium mt-0.5">
              Step {step + 1} of {steps.length} — {steps[step]}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                      i < step
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : i === step
                        ? 'bg-white border-blue-600 text-blue-700'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-[9px] font-bold text-center leading-tight w-16 ${
                      i <= step ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    {s}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-3.5 mx-1 ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 0: Select Incident */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Choose a Verified Incident Awaiting Mission Dispatch
                </p>
                {(() => {
                  const assignableIncidents = incidents.filter(
                    (i) => i.status === 'Verified' || i.status === 'Responding'
                  );
                  if (assignableIncidents.length === 0) {
                    return (
                      <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-slate-200">
                        <CheckCircle2 size={32} className="text-blue-600 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800">No Verified Incidents Available</p>
                        <p className="text-xs text-slate-500 mt-1">
                          All incidents currently have missions or are unverified.
                        </p>
                      </div>
                    );
                  }
                  return assignableIncidents.map((inc) => (
                    <button
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
                        selectedIncidentId === inc.id
                          ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {inc.display_id || inc.id}
                        </span>
                        <DisasterBadge type="severity" value={inc.severity} />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border ml-auto bg-blue-50 text-blue-700 border-blue-200">
                          {inc.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{inc.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {inc.location}, {inc.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {inc.affected_population.toLocaleString()} affected
                        </span>
                      </div>
                    </button>
                  ));
                })()}
              </motion.div>
            )}

            {/* Step 1: Assign Response Teams (Multi-Select & AI Rec) */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Assign Response Squads (Select 1 or more)
                  </p>
                  <span className="text-xs font-bold text-blue-700">
                    {selectedTeamIds.length} team(s) selected ({totalPersonnel} personnel)
                  </span>
                </div>

                {/* AI Card */}
                {aiRec && (
                  <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                          <Sparkles size={14} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">AI Priority Recommendation</p>
                          <p className="text-[10px] text-blue-700 font-medium">
                            {aiRec.confidence}% match · {aiRec.eta}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!selectedTeamIds.includes(aiRec.teamId)) {
                            setSelectedTeamIds((prev) => [...prev, aiRec.teamId]);
                          }
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + Add Recommended Team
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-blue-100 leading-relaxed">
                      {aiRec.rationale}
                    </p>
                  </div>
                )}

                {/* Team Multi-Selection Grid */}
                <div className="space-y-2">
                  {teams.map((team) => {
                    const isSelected = selectedTeamIds.includes(team.id);
                    return (
                      <div
                        key={team.id}
                        onClick={() => toggleTeamSelection(team.id)}
                        className={`w-full text-left rounded-xl border px-4 py-3 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/60 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900">{team.name}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {team.agency} · {team.personnel_count} personnel · {team.current_location}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            team.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {team.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Mission Brief */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Define Mission Parameters
                </p>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                    <FileText size={11} /> Mission Objective <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    rows={3}
                    placeholder="Describe the mission objective in detail..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                      <Flag size={11} /> Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as SeverityLevel)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {(['Critical', 'High', 'Medium', 'Low'] as SeverityLevel[]).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                      <Clock size={11} /> Est. Duration (hrs)
                    </label>
                    <input
                      type="number"
                      value={durationHrs}
                      min={1}
                      max={72}
                      onChange={(e) => setDurationHrs(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>


              </motion.div>
            )}

            {/* Step 3: Confirm & Dispatch */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Review &amp; Confirm Mission Dispatch
                </p>

                {/* Summary Card */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-800">Operational Mission Summary</p>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="px-4 py-3 flex items-start gap-3">
                      <Target size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Incident Target</p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                          {selectedIncident?.display_id || selectedIncident?.id} — {selectedIncident?.title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {selectedIncident?.location}, {selectedIncident?.state}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-3 flex items-start gap-3">
                      <Shield size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Assigned Units ({selectedTeamsList.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedTeamsList.map((t) => (
                            <span
                              key={t.id}
                              className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-md"
                            >
                              {t.name} ({t.agency}) · {t.personnel_count} pax
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 flex items-start gap-3">
                      <FileText size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Objective</p>
                        <p className="text-xs text-slate-800 mt-0.5">{objective}</p>
                      </div>
                    </div>

                    <div className="px-4 py-3 flex items-start gap-3">
                      <Flag size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Priority &amp; Est. Duration</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {priority} Priority · {durationHrs} hours
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-slate-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Dispatching this operation will mobilize {selectedTeamsList.length} squad(s) and update incident status to Responding.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleDispatch}
                className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Send size={13} /> Dispatch Mission
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
