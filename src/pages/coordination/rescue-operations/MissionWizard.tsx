import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  Sparkles, MapPin, Users, Target, Flag, Clock, FileText, Send
} from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import type { AITeamRecommendation, Incident, MissionWizardProps, RescueTeam, SeverityLevel } from '../../../types';
import { steps } from '../../../constants';

function getAIRecommendation(incident: Incident | null, teams: RescueTeam[]): AITeamRecommendation | null {
  if (!incident) return null;
  // TODO: Mock AI logic: pick available team or least-loaded deployed team
  const available = teams.find((t) => t.status === 'Available');
  const candidate = available || teams[0];
  return {
    teamId: candidate.id,
    confidence: available ? 89 : 64,
    rationale: available
      ? `${candidate.name} is at full readiness with ${candidate.personnelCount} personnel and matched vehicle assets. Proximity to incident zone reduces mobilisation time significantly.`
      : `All teams are currently deployed. ${candidate.name} has the lowest current mission load and estimated earliest extraction window.`,
    eta: available ? '~25 mins' : '~90 mins',
  };
}

export const MissionWizard: React.FC<MissionWizardProps> = ({ incidents, teams, onClose, onDispatch }) => {
  const [step, setStep] = useState(0);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [aiOverridden, setAiOverridden] = useState(false);
  const [objective, setObjective] = useState('');
  const [priority, setPriority] = useState<SeverityLevel>('High');
  const [durationHrs, setDurationHrs] = useState(6);
  const [notes, setNotes] = useState('');

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || null;
  const aiRec = getAIRecommendation(selectedIncident, teams);
  const selectedTeam = teams.find((t) => t.id === (selectedTeamId || aiRec?.teamId)) || null;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Pre-fill objective when incident is selected if objective is empty
  React.useEffect(() => {
    if (selectedIncident && !objective) {
      setObjective(`Conduct immediate Search and Rescue and evacuation operations for ${selectedIncident.title} at ${selectedIncident.location}.`);
      setPriority(selectedIncident.severity);
    }
  }, [selectedIncident, objective]);

  const canProceed = (): boolean => {
    if (step === 0) return !!selectedIncidentId;
    if (step === 1) return !!(selectedTeamId || aiRec?.teamId);
    if (step === 2) return objective.trim().length > 3;
    return true;
  };

  const handleNext = () => {
    if (step === 0 && selectedIncidentId && aiRec && !selectedTeamId) {
      setSelectedTeamId(aiRec.teamId);
    }
    if (step === 1 && !selectedTeamId && aiRec) {
      setSelectedTeamId(aiRec.teamId);
    }
    if (step < steps.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => { if (step > 0) setStep((s) => s - 1); };

  const handleDispatch = () => {
    const finalTeamId = selectedTeamId || aiRec?.teamId;
    if (!selectedIncidentId || !finalTeamId) return;
    onDispatch({ incidentId: selectedIncidentId, teamId: finalTeamId, objective: objective || 'Emergency search and rescue operation', priority, durationHrs, notes });
    onClose();
  };

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
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Assign Rescue Mission</h2>
            <p className="text-[11px] text-blue-200 font-medium mt-0.5">Step {step + 1} of {steps.length} — {steps[step]}</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 shrink-0">
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${i < step ? 'bg-blue-600 border-blue-600 text-white' :
                      i === step ? 'bg-white border-blue-600 text-blue-700' :
                        'bg-white border-slate-300 text-slate-400'
                    }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-[9px] font-bold text-center leading-tight w-16 ${i <= step ? 'text-blue-700' : 'text-slate-400'}`}>
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
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Choose a Verified Incident Awaiting Mission Dispatch</p>
                {(() => {
                  const assignableIncidents = incidents.filter(i => i.status === 'Verified');
                  if (assignableIncidents.length === 0) {
                    return (
                      <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-slate-200">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800">All Verified Incidents Are Responded To</p>
                        <p className="text-xs text-slate-500 mt-1">There are no pending verified incidents without active team responses.</p>
                      </div>
                    );
                  }
                  return assignableIncidents.map((inc) => (
                    <button
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${selectedIncidentId === inc.id ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-[11px] font-mono font-bold text-slate-400">{inc.displayId || inc.id}</span>
                        <DisasterBadge type="severity" value={inc.severity} />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border ml-auto bg-emerald-50 text-emerald-700 border-emerald-200">
                          {inc.status} · Ready for Squad
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{inc.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><MapPin size={10} />{inc.location}, {inc.state}</span>
                        <span className="flex items-center gap-1"><Users size={10} />{inc.affectedPopulation.toLocaleString()} affected</span>
                      </div>
                    </button>
                  ));
                })()}
              </motion.div>
            )}

            {/* Step 1: AI Recommendation */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">AI Team Recommendation</p>

                {/* AI Card */}
                {aiRec && (
                  <div className="border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center">
                        <Sparkles size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-violet-900">AI Recommendation</p>
                        <p className="text-[10px] text-violet-600 font-medium">{aiRec.confidence}% confidence · Est. mobilisation: {aiRec.eta}</p>
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div className="w-full h-1.5 bg-violet-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full" style={{ width: `${aiRec.confidence}%` }} />
                    </div>

                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1">Recommended Team</p>
                      <p className="text-sm font-bold text-slate-800">{teams.find(t => t.id === aiRec.teamId)?.name}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Rationale</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{aiRec.rationale}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedTeamId(aiRec.teamId); setAiOverridden(false); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors border ${selectedTeamId === aiRec.teamId && !aiOverridden ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-700 border-violet-200 hover:bg-violet-50'}`}
                      >
                        <CheckCircle2 size={13} /> Accept AI Recommendation
                      </button>
                      <button
                        onClick={() => setAiOverridden(true)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors border ${aiOverridden ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        <AlertTriangle size={13} /> Override — Choose Manually
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual team picker (shown when overriding) */}
                <AnimatePresence>
                  {aiOverridden && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Select a Team Manually</p>
                      {teams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeamId(team.id)}
                          className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${selectedTeamId === team.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{team.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${team.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                              {team.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{team.agency} · {team.personnelCount} personnel · {team.currentLocation}</p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Step 2: Mission Brief */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Define Mission Parameters</p>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                    <FileText size={11} /> Mission Objective *
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
                        <option key={p} value={p}>{p}</option>
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

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Special Notes / ROE</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Rules of engagement, special equipment, coordination notes..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirm & Dispatch */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Review & Confirm Mission Dispatch</p>

                {/* Summary Card */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-700">Mission Assignment Summary</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      { icon: Target, label: 'Incident Target', value: selectedIncident ? `${selectedIncident.id} — ${selectedIncident.title}` : '—', sub: selectedIncident ? `${selectedIncident.location}, ${selectedIncident.state}` : '' },
                      { icon: Users, label: 'Assigned Team', value: selectedTeam?.name || '—', sub: selectedTeam ? `${selectedTeam.agency} · ${selectedTeam.personnelCount} personnel` : '' },
                      { icon: FileText, label: 'Objective', value: objective, sub: '' },
                      { icon: Flag, label: 'Priority', value: priority, sub: '' },
                      { icon: Clock, label: 'Est. Duration', value: `${durationHrs} hours`, sub: '' },
                    ].map(({ icon: Icon, label, value, sub }) => (
                      <div key={label} className="px-4 py-3 flex items-start gap-3">
                        <Icon size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{value}</p>
                          {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
                        </div>
                      </div>
                    ))}
                    {notes && (
                      <div className="px-4 py-3 flex items-start gap-3">
                        <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Special Notes</p>
                          <p className="text-xs text-slate-600 mt-0.5">{notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    This action will officially dispatch the selected rescue team to the incident zone. Confirm all details before proceeding.
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
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
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
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
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
