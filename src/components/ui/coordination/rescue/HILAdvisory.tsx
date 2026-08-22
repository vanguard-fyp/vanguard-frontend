import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, ThumbsUp, Pencil } from 'lucide-react';
import type { RescueTeam, AIRecommendation } from '../../../../types';
import { riskColors } from '../../../../constants';

interface HILAdvisoryProps {
  team: RescueTeam;
}

function getTeamRecommendation(team: RescueTeam): AIRecommendation {
  if (team.status === 'Available') {
    return {
      action: `Deploy ${team.name} to INC-2026-001 (Kelantan Flooding) — highest priority unaddressed sector`,
      rationale: `Team is at full readiness with ${team.personnelCount} personnel and vehicles suitable for flood response. Proximity to Kota Bharu staging area reduces mobilisation time by ~40 mins.`,
      confidence: 87,
      riskLevel: 'Low',
    };
  }
  if (team.status === 'Deployed') {
    return {
      action: `Maintain current deployment. Monitor extraction readiness for post-mission reallocation.`,
      rationale: `Team is actively engaged in a critical or high-priority mission. Withdrawing now would compromise field operation continuity. Estimated mission completion within projected window.`,
      confidence: 92,
      riskLevel: 'Low',
    };
  }
  return {
    action: `Stand by — assess mission readiness before next deployment`,
    rationale: `Team operational capacity is limited due to current status. A brief readiness assessment is recommended before the next assignment to ensure personnel and vehicle availability.`,
    confidence: 74,
    riskLevel: 'Medium',
  };
}

export const HILAdvisory: React.FC<HILAdvisoryProps> = ({ team }) => {
  const [expanded, setExpanded] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'overridden' | null>(null);
  const rec = getTeamRecommendation(team);

  return (
    <div className="border border-violet-200 rounded-xl bg-gradient-to-br from-violet-50/80 to-indigo-50/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-xs font-bold text-violet-900">AI Advisory (HIL)</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskColors[rec.riskLevel]}`}>
            {rec.riskLevel} Risk
          </span>
          {decision && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${decision === 'approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
              {decision === 'approved' ? '✓ Approved by Operator' : '✎ Overridden by Operator'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-violet-700">{rec.confidence}% confidence</span>
          {expanded ? <ChevronUp size={14} className="text-violet-500" /> : <ChevronDown size={14} className="text-violet-500" />}
        </div>
      </button>

      {/* Confidence Bar */}
      <div className="px-4 pb-2">
        <div className="w-full h-1.5 bg-violet-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-700"
            style={{ width: `${rec.confidence}%` }}
          />
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Recommendation action */}
              <div className="bg-white/80 border border-violet-100 rounded-lg p-3">
                <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1">Recommended Action</p>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">{rec.action}</p>
              </div>

              {/* Rationale */}
              <div className="bg-white/60 border border-slate-100 rounded-lg p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">AI Rationale</p>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.rationale}</p>
              </div>

              {/* HIL Operator Buttons */}
              {!decision ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDecision('approved')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-xs"
                  >
                    <ThumbsUp size={12} />
                    Approve Recommendation
                  </button>
                  <button
                    onClick={() => setDecision('overridden')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-lg transition-colors"
                  >
                    <Pencil size={12} />
                    Override
                  </button>
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${decision === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  {decision === 'approved'
                    ? <CheckCircle2 size={14} className="text-emerald-600" />
                    : <AlertTriangle size={14} className="text-slate-500" />
                  }
                  <span className={`text-xs font-bold ${decision === 'approved' ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {decision === 'approved' ? 'Operator approved AI recommendation' : 'Operator overrode AI recommendation'}
                  </span>
                  <button
                    onClick={() => setDecision(null)}
                    className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Undo
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
