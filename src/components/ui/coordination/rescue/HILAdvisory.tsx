import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ThumbsUp, Pencil, RefreshCw, Cpu } from 'lucide-react';
import type { RescueTeam, AIRecommendation } from '../../../../types';
import { useTeamRecommendation, useGenerateTeamRecommendation } from '../../../../hooks';
import { riskColors } from '../../../../constants';

interface HILAdvisoryProps {
  team: RescueTeam;
  recommendation?: AIRecommendation;
}

export const HILAdvisory: React.FC<HILAdvisoryProps> = ({ team, recommendation: propRec }) => {
  const [decision, setDecision] = useState<'approved' | 'overridden' | null>(null);


  const { data: fetchedRec, isLoading: isFetchingRec } = useTeamRecommendation(team.id);
  const generateRec = useGenerateTeamRecommendation();

  const rec: AIRecommendation | undefined = propRec || fetchedRec;
  const isGenerating = generateRec.isPending || isFetchingRec;

  if (!rec) {
    if (isGenerating) {
      return (
        <div className="border border-violet-200 rounded-xl bg-violet-50/50 p-4 text-xs text-violet-700 flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin text-violet-600" />
          <span>Generating AI Recommendation...</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="border border-violet-200 rounded-xl bg-gradient-to-br from-violet-50/80 to-indigo-50/60 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100 bg-white/70">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <Sparkles size={12} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-violet-900">Backend AI Advisory (HIL)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1">
                <Cpu size={9} />
                {rec.model_used || 'rule-based-v1'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskColors[rec.risk_level] || 'text-slate-600 bg-slate-100'}`}>
            {rec.risk_level} Risk
          </span>
          <span className="text-[11px] font-bold text-violet-700 font-mono">{rec.confidence}% conf.</span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="w-full h-1.5 bg-violet-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-700"
            style={{ width: `${rec.confidence}%` }}
          />
        </div>
      </div>

      {/* Body Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Recommendation action */}
        <div className="bg-white border border-violet-100 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">Recommended Action</p>
            {rec.stream_status === 'streaming' && (
              <span className="text-[9px] font-mono text-amber-600 animate-pulse font-bold">● Streaming from LLM</span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-800 leading-relaxed">{rec.action_text}</p>
        </div>

        {/* Rationale */}
        <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">AI Rationale & Context</p>
          <p className="text-xs text-slate-600 leading-relaxed">{rec.rationale}</p>
        </div>

        {/* HIL Operator Decision Buttons */}
        {!decision ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setDecision('approved')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <ThumbsUp size={13} />
              Approve Recommendation
            </button>
            <button
              onClick={() => setDecision('overridden')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Pencil size={13} />
              Override Plan
            </button>
          </div>
        ) : (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${decision === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            {decision === 'approved'
              ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              : <AlertTriangle size={15} className="text-slate-500 shrink-0" />
            }
            <span className={`text-xs font-bold ${decision === 'approved' ? 'text-emerald-800' : 'text-slate-700'}`}>
              {decision === 'approved' ? 'Operator approved AI recommendation' : 'Operator overrode AI recommendation'}
            </span>
            <button
              onClick={() => setDecision(null)}
              className="ml-auto text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
