import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Sparkles, MapPin, Users, Target, Flag,
  Clock, FileText, Send, Shield, Loader2, UserPlus, Trash2, BrainCircuit,
} from 'lucide-react';
import { Tag, StatusTag, SEVERITY_TONE } from '../../../components/ui/shared/Tag';
import type { Incident, RescueTeam, SeverityLevel } from '../../../types';
import { steps } from '../../../constants';
import { useRescueRecommendation } from '../../../hooks';
import type { MissionDispatchRequest } from '../../../services/missionService';
import { ApiError } from '../../../services/apiClient';
import {
  addTeam, availabilityOf, availableOf, removeTeam, setPersonnel, toDispatchTeams, validateSelection,
  type TeamSelectionItem,
} from '../../../utils/teamSelection';
import { newIdempotencyKey, relativeTime } from '../../../utils/display';

export interface ExtendedMissionWizardProps {
  incidents: Incident[];
  teams: RescueTeam[];
  onClose: () => void;
  /** Resolves on success; rejects with ApiError (wizard stays open and shows it). */
  onDispatch: (req: MissionDispatchRequest) => Promise<void>;
  defaultIncidentId?: string | null;
}

const AVAIL_STYLE: Record<string, { label: string; cls: string }> = {
  available: { label: 'Available', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  partial: { label: 'Partly committed', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  committed: { label: 'Fully committed', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  ineligible: { label: 'Off duty / inactive', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  unknown: { label: 'Capacity unknown', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const SourceBadge: React.FC<{ source: 'ai' | 'officer' }> = ({ source }) =>
  source === 'ai' ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200">
      <Sparkles size={10} /> AI-recommended
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200">
      <UserPlus size={10} /> Officer-selected
    </span>
  );

export const MissionWizard: React.FC<ExtendedMissionWizardProps> = ({
  incidents,
  teams,
  onClose,
  onDispatch,
  defaultIncidentId,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(defaultIncidentId || null);
  const [selection, setSelection] = useState<TeamSelectionItem[]>([]);
  const [objective, setObjective] = useState('');
  const [priority, setPriority] = useState<SeverityLevel>('High');
  const [durationHrs, setDurationHrs] = useState(6);
  const [teamFilter, setTeamFilter] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dispatchKey] = useState(() => newIdempotencyKey('dispatch'));

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;
  const rec = useRescueRecommendation(selectedIncidentId);
  const aiTeamIds = useMemo(() => new Set((rec.data?.suggested_teams ?? []).map((t) => t.team_id)), [rec.data]);
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const validation = validateSelection(selection, teams);
  const required = rec.data?.required_personnel ?? null;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  React.useEffect(() => {
    if (selectedIncident && !objective) {
      setObjective(
        rec.data?.mission_objective ||
        `Conduct search, rescue and evacuation operations for ${selectedIncident.title} at ${selectedIncident.location}.`
      );
      setPriority(selectedIncident.severity || 'High');
    }
  }, [selectedIncident, objective, rec.data]);

  const canProceed = (): boolean => {
    if (step === 0) return !!selectedIncidentId;
    if (step === 1) return validation.ok;
    if (step === 2) return objective.trim().length > 3;
    return validation.ok && !submitting;
  };

  const handleNext = () => step < steps.length - 1 && setStep((s) => s + 1);
  const handleBack = () => step > 0 && !submitting && setStep((s) => s - 1);

  const handleDispatch = async () => {
    if (!selectedIncident || !validation.ok) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onDispatch({
        title: `Rescue operation — ${selectedIncident.title}`.slice(0, 200),
        incident_id: selectedIncident.id,
        priority,
        objective: objective.trim(),
        duration_hours: Math.max(1, Math.min(168, durationHrs || 6)),
        teams: toDispatchTeams(selection),
        approval: { confirmed: true, note: approvalNote.trim() || undefined },
        idempotency_key: dispatchKey,
        recommended_personnel: required ?? null,
      });
      onClose();
    } catch (err) {
      const detail = err instanceof ApiError ? (err.data?.detail as { code?: string; available?: number } | string | undefined) : undefined;
      if (detail && typeof detail === 'object' && detail.code === 'DISPATCH_INSUFFICIENT_CAPACITY') {
        setSubmitError(
          `A team no longer has enough available personnel (${detail.available ?? 0} left). Team availability has been refreshed — adjust the counts and approve again.`
        );
        setStep(1);
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Dispatch failed. No changes were made.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTeams = teams.filter((t) => {
    if (t.status === 'Deleted') return false;
    const q = teamFilter.trim().toLowerCase();
    return !q || t.name.toLowerCase().includes(q) || t.agency.toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={() => !submitting && onClose()}
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${i < step
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : i === step
                        ? 'bg-white border-blue-600 text-blue-700'
                        : 'bg-white border-slate-300 text-slate-400'
                      }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-[9px] font-bold text-center leading-tight w-16 ${i <= step ? 'text-blue-700' : 'text-slate-400'
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
                      onClick={() => { setSelectedIncidentId(inc.id); setSelection([]); setObjective(''); }}
                      className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${selectedIncidentId === inc.id
                        ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600">
                            {inc.display_id || inc.id}
                          </span>
                          <Tag tone={SEVERITY_TONE[inc.severity] ?? 'slate'}>
                            {inc.severity}
                          </Tag>
                        </div>
                        <div className="flex items-center gap-1.5">

                          <StatusTag status={inc.status} />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{inc.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {inc.location}, {inc.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {inc.field_verification?.affected_population === 'unknown' ? 'Affected: not reported' : `${inc.affected_population.toLocaleString()} reported affected`}
                        </span>
                      </div>
                    </button>
                  ));
                })()}
              </motion.div>
            )}

            {/* Step 1: Team selection */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                {submitError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {submitError}
                  </div>
                )}

                {/* A. AI recommendation */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1.5">
                      <BrainCircuit size={13} /> AI-recommended teams
                    </p>
                    {rec.data?.generated_at && (
                      <span className="text-[10px] text-slate-500">
                        Assessment v{rec.data.assessment_version} · {relativeTime(rec.data.generated_at) ?? ''}
                        {rec.data.is_stale ? ' · stale' : ''}
                      </span>
                    )}
                  </div>
                  {rec.isLoading ? (
                    <p className="text-xs text-slate-500 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Loading recommendation…</p>
                  ) : rec.isError ? (
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">AI recommendation is unavailable. You can still select teams manually.</p>
                  ) : !rec.data || rec.data.status === 'unavailable' || (rec.data.suggested_teams ?? []).length === 0 ? (
                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                      <p>{rec.data?.message || 'No AI team suggestion is available for this incident yet.'}</p>
                      {rec.data?.analysis_status && <p className="text-slate-500">Analysis status: {rec.data.analysis_status}</p>}
                      <button type="button" onClick={() => navigate(`/situational/intelligence?incidentId=${selectedIncidentId}`)} className="text-blue-700 font-semibold hover:underline cursor-pointer">
                        Open Disaster Intelligence →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {required != null && (
                        <p className="text-[11px] text-slate-600">
                          {rec.data.shortfall_personnel ? ` · shortfall ${rec.data.shortfall_personnel} after suggested teams` : ''}

                        </p>
                      )}
                      {rec.data.suggested_teams.map((s, idx) => {
                        const team = teamsById.get(s.team_id);
                        const selected = selection.some((x) => x.teamId === s.team_id);
                        const feasible = s.still_feasible !== false && !!team;
                        return (
                          <div key={s.team_id} className="rounded-xl border border-violet-200 bg-white shadow-2xs hover:border-violet-300 transition-all p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-5 h-5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-black flex items-center justify-center font-mono">
                                    #{idx + 1}
                                  </span>
                                  <p className="text-sm font-extrabold text-slate-900 tracking-tight">
                                    {s.name ?? team?.name ?? s.team_id}
                                  </p>
                                  {s.agency && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                      {s.agency}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={selected || !feasible}
                                onClick={() => team && setSelection((sel) => addTeam(sel, team, 'ai', Math.min(s.recommended_personnel, s.available_now ?? s.recommended_personnel)))}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${selected
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                  : 'bg-violet-600 hover:bg-violet-700 text-white shadow-xs'
                                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                              >
                                {selected ? '✓ Added' : '+ Add Team'}
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-slate-50/80 rounded-lg p-2 border border-slate-100 text-center">
                              <div>
                                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Suggested Force</span>
                                <span className="text-xs font-black text-violet-700">{s.recommended_personnel} Pax</span>
                              </div>
                              <div>
                                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Readiness</span>
                                <span className="text-xs font-bold text-emerald-600">{s.available_now ?? s.available_personnel} Available</span>
                              </div>
                              <div>
                                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Proximity</span>
                                <span className="text-xs font-bold text-slate-700">
                                  {s.road_distance_km != null ? `${s.road_distance_km} km` : 'Station'}
                                </span>
                              </div>
                            </div>

                            {s.rationale && (
                              <div className="text-[11px] text-slate-600 bg-violet-50/40 rounded-lg p-2 border border-violet-100/60 leading-relaxed">
                                <span className="text-[9px] uppercase font-bold text-violet-700 tracking-wider block mb-0.5">
                                  Matching Rationale
                                </span>
                                {s.rationale}

                                <span className="text-[9px] pt-2 uppercase font-bold text-violet-700 tracking-wider block mb-0.5">
                                  Required Personnel Basis
                                </span>
                                {rec.data.required_personnel_basis && (
                                  <span>{rec.data.required_personnel_basis}</span>
                                )}
                              </div>
                            )}

                            {!feasible && (
                              <p className="text-[10px] text-amber-700 font-medium">
                                ⚠ No longer feasible — capacity or status changed since intelligence assessment.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* B. Selected teams, each with its own personnel count */}
                <section>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Selected for dispatch ({selection.length}) · {validation.totalPersonnel} personnel
                    {required != null ? ` of ${required} planned` : ''}
                  </p>
                  {selection.length === 0 ? (
                    <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg p-3">No teams selected yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selection.map((s) => {
                        const team = teamsById.get(s.teamId);
                        const avail = team ? availableOf(team) : null;
                        const err = validation.errors[s.teamId];
                        return (
                          <div key={s.teamId} className={`rounded-lg border p-3 flex items-center gap-3 ${err ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-bold text-slate-900 truncate">{team?.name ?? s.teamId}</p>
                                <SourceBadge source={s.source} />
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {avail != null ? `${avail} of ${team?.personnel_count ?? '?'} available` : 'Availability not reported'}
                              </p>
                              {err && <p className="text-[10px] text-red-700 mt-0.5">{err}</p>}
                            </div>
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                              Personnel
                              <input
                                type="number"
                                min={1}
                                max={avail ?? team?.personnel_count ?? undefined}
                                value={s.personnel}
                                onChange={(e) => setSelection((sel) => setPersonnel(sel, s.teamId, Number(e.target.value)))}
                                className="w-16 px-2 py-1 border border-slate-300 rounded-md text-xs font-mono"
                                aria-label={`Personnel for ${team?.name ?? s.teamId}`}
                              />
                            </label>
                            <button type="button" aria-label="Remove team" onClick={() => setSelection((sel) => removeTeam(sel, s.teamId))} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* C. Add any team manually */}
                <section>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wide flex items-center gap-1.5"><UserPlus size={13} /> Add teams </p>
                    <input value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} placeholder="Filter by name or agency" className="px-2 py-1 text-xs border border-slate-200 rounded-md w-44" />
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {filteredTeams.map((team) => {
                      const availability = availabilityOf(team);
                      const style = AVAIL_STYLE[availability];
                      const selected = selection.some((x) => x.teamId === team.id);
                      const blocked = availability === 'committed' || availability === 'ineligible';
                      return (
                        <div key={team.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {team.name} <span className="text-[10px] text-slate-500 font-normal">· {team.agency}{team.specialization ? ` · ${team.specialization}` : ''}</span>
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {availableOf(team) != null ? `${availableOf(team)}/${team.personnel_count} available` : `${team.personnel_count} personnel`}
                              {team.active_assignment_count ? ` · ${team.active_assignment_count} active assignment(s)` : ''}
                              {aiTeamIds.has(team.id) ? ' · in AI suggestion' : ''}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.cls}`}>{style.label}</span>
                          <button
                            type="button"
                            disabled={selected || blocked}
                            onClick={() => setSelection((sel) => addTeam(sel, team, aiTeamIds.has(team.id) ? 'ai' : 'officer'))}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {selected ? 'Added' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </motion.div>
            )}

            {/* Step 2: Mission objectives */}
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

            {/* Step 3: Review & approval */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="px-4 py-3 flex items-start gap-3">
                      <Target size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Incident</p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedIncident?.display_id} — {selectedIncident?.title}</p>
                        <p className="text-[11px] text-slate-500">{selectedIncident?.location}, {selectedIncident?.state}</p>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-start gap-3">
                      <Shield size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Teams ({selection.length}) · {validation.totalPersonnel} personnel</p>
                        <ul className="mt-1 space-y-1">
                          {selection.map((s) => (
                            <li key={s.teamId} className="flex items-center gap-2 text-xs text-slate-800">
                              <span className="font-semibold">{teamsById.get(s.teamId)?.name ?? s.teamId}</span>
                              <span className="text-slate-500">· {s.personnel} personnel</span>
                              <SourceBadge source={s.source} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-start gap-3">
                      <FileText size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Objective</p>
                        <p className="text-xs text-slate-800 mt-0.5 whitespace-pre-wrap">{objective}</p>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-start gap-3">
                      <Flag size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <div className="flex items-center gap-2">
                        <Tag tone={SEVERITY_TONE[priority] ?? 'slate'}>{priority} Priority</Tag>
                        <span className="text-xs text-slate-500">· {durationHrs} h estimated</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    Operational Note (Optional)
                  </label>
                  <input
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    maxLength={500}
                    placeholder="Add operational notes or dispatch instructions..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                {submitError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{submitError}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button onClick={handleBack} disabled={step === 0 || submitting} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <ChevronLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer disabled:opacity-40">Cancel</button>
            {step < steps.length - 1 ? (
              <button onClick={handleNext} disabled={!canProceed()} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg cursor-pointer">
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleDispatch} disabled={!canProceed()} className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg cursor-pointer">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Approve &amp; Dispatch
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
