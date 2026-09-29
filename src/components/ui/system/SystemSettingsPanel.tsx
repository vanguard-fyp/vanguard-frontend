import React, { useState } from 'react';
import { CheckCircle2, Sliders, RefreshCw, Sparkles, Droplets, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

export const SystemSettingsPanel: React.FC = () => {
  const toast = useToast();
  const [aiPriorityThreshold, setAiPriorityThreshold] = useState(75);
  const [rainfallThreshold, setRainfallThreshold] = useState(60);
  const [waterSurgeLevel, setWaterSurgeLevel] = useState(3.5);
  const [autoSmsEnabled, setAutoSmsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [telemetrySyncInterval, setTelemetrySyncInterval] = useState('30');
  const [showAdvancedGateway, setShowAdvancedGateway] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  const handleSaveParameters = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveNotice(true);
    toast.success('System settings & AI Operational Thresholds updated successfully!');
    setTimeout(() => setSaveNotice(false), 3000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Disaster Intelligence & AI Operational Thresholds
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automated risk classification, rainfall alerts, and multi-agency escalation triggers
          </p>
        </div>

        {saveNotice && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={13} /> Thresholds Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSaveParameters} className="space-y-6">
        {/* Section 1: AI Risk Index Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Priority Index Slider */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={13} className="text-blue-600" />
                AI Priority Escalation
              </span>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                {aiPriorityThreshold} / 100
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={aiPriorityThreshold}
              onChange={(e) => setAiPriorityThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Incidents scoring above <strong>{aiPriorityThreshold}</strong> trigger automated Directive 20 Federal escalation.
            </p>
          </div>

          {/* Rainfall Threshold */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Droplets size={13} className="text-cyan-600" />
                Heavy Rainfall Warning
              </span>
              <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-lg">
                {rainfallThreshold} mm/hr
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="120"
              value={rainfallThreshold}
              onChange={(e) => setRainfallThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Doppler radar readings exceeding <strong>{rainfallThreshold} mm/hr</strong> activate flash flood warnings.
            </p>
          </div>

          {/* River Danger Water Level */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Activity size={13} className="text-amber-600" />
                River Danger Level
              </span>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                {waterSurgeLevel.toFixed(1)} meters
              </span>
            </div>
            <input
              type="range"
              min="2.0"
              max="6.0"
              step="0.1"
              value={waterSurgeLevel}
              onChange={(e) => setWaterSurgeLevel(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              JPS river sensors reaching <strong>{waterSurgeLevel}m</strong> auto-flag surrounding evacuation centers.
            </p>
          </div>
        </div>

        {/* Section 2: Automated Public & Officer Dispatch Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Public Siren & SMS Gateway</p>
              <p className="text-[11px] text-slate-500">Dispatch cell-broadcast sirens upon verified Level 3 hazards</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoSmsEnabled(!autoSmsEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                autoSmsEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}
            >
              {autoSmsEnabled ? 'ACTIVE' : 'PAUSED'}
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Officer Escalation Summaries</p>
              <p className="text-[11px] text-slate-500">Broadcast SITREP briefings to field commanders and agency leads</p>
            </div>
            <button
              type="button"
              onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                emailAlertsEnabled
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}
            >
              {emailAlertsEnabled ? 'ENABLED' : 'PAUSED'}
            </button>
          </div>
        </div>

        {/* Section 3: Collapsible Advanced Gateway Diagnostics */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvancedGateway(!showAdvancedGateway)}
            className="w-full px-4 py-3 bg-slate-50/80 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Advanced Telemetry Sync & Gateway Diagnostics</span>
            </div>
            {showAdvancedGateway ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {showAdvancedGateway && (
            <div className="p-4 bg-white space-y-3 text-xs border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">JPS Hydrological Polling Frequency</label>
                  <select
                    value={telemetrySyncInterval}
                    onChange={(e) => setTelemetrySyncInterval(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="15">Every 15 seconds (Real-time)</option>
                    <option value="30">Every 30 seconds (Recommended)</option>
                    <option value="60">Every 1 minute</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">GDACS Live Feed Heartbeat</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>WebSocket Connected (UN OCHA RSS Multilateral Gateway)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
          >
            Save System Settings
          </button>
        </div>
      </form>
    </div>
  );
};
