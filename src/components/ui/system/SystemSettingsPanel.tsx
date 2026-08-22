import React, { useState } from 'react';
import { Settings, CheckCircle2, Sliders, Bell, RefreshCw } from 'lucide-react';

export const SystemSettingsPanel: React.FC = () => {
  const [aiThreshold, setAiThreshold] = useState(75);
  const [telemetrySyncInterval, setTelemetrySyncInterval] = useState('30');
  const [autoSmsEnabled, setAutoSmsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState('en-MY');
  const [saveStatusNotice, setSaveStatusNotice] = useState(false);

  const handleSaveParameters = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatusNotice(true);
    setTimeout(() => setSaveStatusNotice(false), 3000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            System Operational Parameters & Gateway Configuration
          </h3>
        </div>

        {saveStatusNotice && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={13} /> Operational Parameters Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSaveParameters} className="space-y-6">
        {/* Section 1: Operational Thresholds */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Sliders size={13} />
            Disaster Intelligence Thresholds
          </h4>

          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Priority Index Escalation Threshold
              </label>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                {aiThreshold} / 100 Index
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={aiThreshold}
              onChange={(e) => setAiThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Incidents scoring above index {aiThreshold} automatically trigger State (Level 2) or Federal (Level 3) response parameters under NADMA standard operating procedures.
            </p>
          </div>
        </div>

        {/* Section 2: Sync & Gateway Settings */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <RefreshCw size={13} />
            Telemetry Sync & Communication Gateways
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                JPS Hydrological & Weather Telemetry Interval
              </label>
              <select
                value={telemetrySyncInterval}
                onChange={(e) => setTelemetrySyncInterval(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="15">Every 15 seconds (High-frequency monitor)</option>
                <option value="30">Every 30 seconds (Standard operational mode)</option>
                <option value="60">Every 1 minute</option>
                <option value="300">Every 5 minutes</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                System Language & Locale
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="en-MY">English (Malaysia Government Standard)</option>
                <option value="ms-MY">Bahasa Melayu (Official)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Notification Links */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Bell size={13} />
            Alert Gateway & Officer Notifications
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Automated Public SMS Siren Gateway</p>
                <p className="text-[11px] text-slate-500">Dispatch SMS alerts upon critical incident verification</p>
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
                {autoSmsEnabled ? 'ENABLED' : 'PAUSED'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Officer Email Summary Notifications</p>
                <p className="text-[11px] text-slate-500">Send SITREP report summaries to verified personnel</p>
              </div>
              <button
                type="button"
                onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  emailAlertsEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-200 text-slate-600 border-slate-300'
                }`}
              >
                {emailAlertsEnabled ? 'ENABLED' : 'PAUSED'}
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Save System Parameters
          </button>
        </div>
      </form>
    </div>
  );
};
