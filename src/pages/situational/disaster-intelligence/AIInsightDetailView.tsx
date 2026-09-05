import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Building2 } from 'lucide-react';
import { DisasterBadge } from '../../../components/ui/dashboard/DisasterBadge';
import { AIImpactPanel, getTopDrivers } from '../../../components/ui/situational/AIImpactPanel';
import { ImpactTimeline } from '../../../components/ui/situational/ImpactTimeline';
import { disasterLevelInfo } from '../../../constants/components/disasterLevels';
import type { Incident } from '../../../types';

interface AIInsightDetailViewProps {
  incident: Incident;
  onBack: () => void;
  onSelectPeer: (incident: Incident) => void;
  allIncidents?: Incident[];
}

export const AIInsightDetailView: React.FC<AIInsightDetailViewProps> = ({ incident, onBack, onSelectPeer, allIncidents = [] }) => {
  const tracked = allIncidents.filter((i) => i.status !== 'Unverified' && i.impactTimeline?.length);
  const ranked = [...tracked].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
  const rank = ranked.findIndex((i) => i.id === incident.id) + 1;
  const drivers = getTopDrivers(incident, 2);
  const levelInfo = disasterLevelInfo[incident.disasterLevel];
  const peers = ranked.filter((i) => i.disasterLevel === incident.disasterLevel && i.id !== incident.id);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-6xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
      >
        <ArrowLeft size={15} /> Back to intelligence overview
      </button>

      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white overflow-hidden relative">
        <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full bg-blue-500/20" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-blue-300">AI-processed disaster intelligence</p>
            <h1 className="text-2xl font-extrabold mt-2">{incident.title}</h1>
            <p className="text-sm text-slate-300 mt-2">{incident.location}, {incident.district}, {incident.state}</p>
          </div>
          <div className="flex gap-2">
            <DisasterBadge type="severity" value={incident.severity} />
            <DisasterBadge type="level" value={incident.disasterLevel} />
          </div>
        </div>
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">
          {[
            { label: 'Priority rank', value: rank ? `#${rank} of ${ranked.length}` : '—' },
            { label: 'AI priority score', value: `${incident.aiPriorityScore}/100` },
            { label: 'Population impact', value: incident.affectedPopulation.toLocaleString() },
            { label: 'Access constraint', value: `${100 - incident.accessibilityScore}/100` },
          ].map((metric) => (
            <div key={metric.label} className="bg-white/10 border border-white/10 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-300 font-bold">{metric.label}</p>
              <p className="text-lg font-extrabold mt-1">{metric.value}</p>
            </div>
          ))}
        </div>
      </div>

      {incident.impactTimeline && <ImpactTimeline timeline={incident.impactTimeline} size="full" />}

      <AIImpactPanel incident={incident} rank={rank || undefined} size="full" />

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        {/* TODO: CHANGE THIS SECTION TO AI SUMMARY SOON */}
        <h2 className="text-sm font-bold text-slate-900 mb-3">Why this incident ranks {rank ? `#${rank}` : 'here'}</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          The priority score is driven primarily by <strong className="text-slate-900">{drivers[0]}</strong> and{' '}
          <strong className="text-slate-900">{drivers[1]}</strong> — together these outweigh the other four factors
          in the model. In practice: {incident.affectedPopulation.toLocaleString()} residents in the impact zone,
          {' '}{incident.infrastructureDamage.toLowerCase()} infrastructure damage, and an accessibility score of{' '}
          {incident.accessibilityScore}/100 combine to place this above lower-scoring incidents even where casualty
          counts alone might suggest otherwise.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex items-start gap-2">
            <Users size={15} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Population factor</p>
              <p className="text-xs font-semibold text-slate-800">{incident.affectedPopulation.toLocaleString()} in zone</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex items-start gap-2">
            <Building2 size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Infrastructure factor</p>
              <p className="text-xs font-semibold text-slate-800">{incident.infrastructureDamage}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Disaster level context</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{levelInfo?.desc}</p>

        {peers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
              Other {levelInfo?.short} incidents ({peers.length})
            </p>
            <div className="space-y-2">
              {peers.map((peer) => (
                <button
                  key={peer.id}
                  onClick={() => onSelectPeer(peer)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      #{ranked.findIndex((r) => r.id === peer.id) + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{peer.title}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-700">{peer.aiPriorityScore}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};