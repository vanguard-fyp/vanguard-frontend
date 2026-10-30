import { DataRegion } from '../../common/DataRegion';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Clock, Loader2, RotateCcw, Save, ShieldAlert, Sliders, Undo2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { useResetSystemSetting, useSystemSettings, useUpdateSystemSetting } from '../../../hooks/useSystemSettings';
import type { SettingGroup, SystemSetting } from '../../../services/systemSettingsService';
import { relativeTime } from '../../../utils/display';

const GROUP_META: Record<SettingGroup, { title: string; sub: string; Icon: React.FC<{ size?: number; className?: string }> }> = {
  early_warning: { title: 'Early Warning Triggers', sub: 'Sensor thresholds that automatically spawn alert tickets', Icon: Bell },
  hazard: { title: 'Danger Level Boundaries', sub: 'Severity classification cutoffs for active incidents', Icon: ShieldAlert },
  workflow: { title: 'Timing & Workflow Cadence', sub: 'Response SLA and periodic escalation windows', Icon: Clock },
};

const fmt = (s: SystemSetting, v: number) =>
  s.kind === 'choice' ? s.options.find((o) => o.value === v)?.label ?? String(v) : `${v} ${s.unit}`;


export const SystemSettingsPanel: React.FC = () => {
  const settingsQuery = useSystemSettings();
  const { data, isLoading, isError, refetch } = settingsQuery;
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('SYSTEM_ADMIN') && !!data?.storage_available;

  const toast = useToast();
  const updateSetting = useUpdateSystemSetting();
  const resetSetting = useResetSystemSetting();

  // Unified draft state for all settings
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync drafts when settings load or refresh
  useEffect(() => {
    if (data?.items) {
      const initial: Record<string, string> = {};
      data.items.forEach((s) => {
        initial[s.key] = String(s.value);
      });
      setDrafts(initial);
    }
  }, [data]);

  const handleDraftChange = (key: string, val: string) => {
    setDrafts((prev) => ({ ...prev, [key]: val }));
  };

  const handleDiscard = () => {
    if (data?.items) {
      const reverted: Record<string, string> = {};
      data.items.forEach((s) => {
        reverted[s.key] = String(s.value);
      });
      setDrafts(reverted);
      toast.info('Changes discarded');
    }
  };

  // Check validation and dirty status
  const dirtyItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((s) => {
      const d = drafts[s.key];
      if (d === undefined) return false;
      const num = Number(d);
      if (d.trim() === '' || !Number.isFinite(num)) return false;
      if (s.kind === 'int' && !Number.isInteger(num)) return false;
      if (s.minimum != null && num < s.minimum) return false;
      if (s.maximum != null && num > s.maximum) return false;
      return num !== s.value;
    });
  }, [data, drafts]);

  const hasInvalid = useMemo(() => {
    if (!data?.items) return false;
    return data.items.some((s) => {
      const d = drafts[s.key];
      if (d === undefined) return false;
      const num = Number(d);
      if (d.trim() === '' || !Number.isFinite(num)) return true;
      if (s.kind === 'int' && !Number.isInteger(num)) return true;
      if (s.minimum != null && num < s.minimum) return true;
      if (s.maximum != null && num > s.maximum) return true;
      return false;
    });
  }, [data, drafts]);

  const handleSaveAll = async () => {
    if (dirtyItems.length === 0 || hasInvalid) return;
    setIsSaving(true);
    try {
      await Promise.all(
        dirtyItems.map((s) =>
          updateSetting.mutateAsync({ key: s.key, value: Number(drafts[s.key]) })
        )
      );
      toast.success(
        'Thresholds saved',
        `Successfully updated ${dirtyItems.length} operational threshold${dirtyItems.length > 1 ? 's' : ''}.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save thresholds');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSingle = (s: SystemSetting) => {
    resetSetting.mutate(s.key, {
      onSuccess: () => {
        toast.success(`${s.label}: reset to default (${fmt(s, s.default)})`);
        setDrafts((prev) => ({ ...prev, [s.key]: String(s.default) }));
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not reset setting'),
    });
  };

  const renderGroupCard = (key: SettingGroup, className = '') => {
    if (!data) return null;
    const meta = GROUP_META[key];
    const GroupIcon = meta.Icon;
    const items = data.items.filter((i) => i.group === key);
    if (!items.length) return null;

    return (
      <div key={key} className={`bg-white border border-slate-200 rounded-xl shadow-xs ${className}`}>
        {/* Group header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <GroupIcon size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{meta.title}</p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{meta.sub}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
            {items.length} {items.length === 1 ? 'param' : 'params'}
          </span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-around">
          {items.map((s) => {
            const draft = drafts[s.key] ?? String(s.value);
            const num = Number(draft);
            const isInvalid =
              draft.trim() === '' ||
              !Number.isFinite(num) ||
              (s.kind === 'int' && !Number.isInteger(num)) ||
              (s.minimum != null && num < s.minimum) ||
              (s.maximum != null && num > s.maximum);
            const isDirty = !isInvalid && num !== s.value;
            const changed = !s.is_default
              ? `${s.updated_by ? `By ${s.updated_by}` : 'Modified'}${s.updated_at ? ` · ${relativeTime(s.updated_at)}` : ''}`
              : null;

            return (
              <div key={s.key} className="px-4 py-3 space-y-2 hover:bg-slate-50/30 transition-colors">
                {/* Title + chip */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 leading-snug" title={s.help}>
                      {s.label}
                    </p>
                    {!isInvalid || !canEdit ? (
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{s.help}</p>
                    ) : (
                      <p className="text-[11px] text-rose-600 mt-0.5 font-medium">
                        Allowed range: {s.minimum} – {s.maximum}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 animate-pulse">
                        Pending
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        !s.is_default
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {fmt(s, s.value)}
                    </span>
                  </div>
                </div>

                {/* Input row */}
                <div className="flex items-center gap-2">
                  {s.kind === 'choice' ? (
                    <select
                      value={draft}
                      disabled={!canEdit || isSaving}
                      onChange={(e) => handleDraftChange(s.key, e.target.value)}
                      className={`flex-1 bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 disabled:opacity-60 cursor-pointer ${
                        isDirty
                          ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20'
                          : 'border-slate-200 focus:border-blue-500'
                      }`}
                    >
                      {s.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type="number"
                        value={draft}
                        min={s.minimum ?? undefined}
                        max={s.maximum ?? undefined}
                        step={s.step}
                        disabled={!canEdit || isSaving}
                        onChange={(e) => handleDraftChange(s.key, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && dirtyItems.length > 0 && handleSaveAll()}
                        aria-invalid={isInvalid}
                        aria-label={s.label}
                        className={`w-24 bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 text-right focus:outline-none focus:ring-1 disabled:opacity-60 transition-colors ${
                          isInvalid
                            ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/20'
                            : isDirty
                            ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20'
                            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
                        }`}
                      />
                      {s.unit && (
                        <span className="text-[11px] text-slate-500 font-medium shrink-0 min-w-[40px]">{s.unit}</span>
                      )}
                    </>
                  )}

                  {canEdit && (
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      {!s.is_default && !isDirty && (
                        <button
                          type="button"
                          onClick={() => handleResetSingle(s)}
                          disabled={resetSetting.isPending || isSaving}
                          title={`Reset to default: ${fmt(s, s.default)}`}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-40 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                        >
                          <RotateCcw size={11} />
                          Default
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Audit trail info */}
                {changed && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {changed}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <DataRegion queries={[settingsQuery]} label="Operational thresholds"><div className="space-y-5">
      {/* Header bar with Unified Save Button */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Sliders size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Operational Thresholds</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Runtime hazard triggers, escalation windows, and decision parameters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {data && !canEdit && data.storage_available && (
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Read-only mode
            </span>
          )}

          {canEdit && (
            <>
              {dirtyItems.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Undo2 size={13} />
                    <span>Discard</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={dirtyItems.length === 0 || hasInvalid || isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{isSaving ? 'Saving Changes…' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 flex items-center justify-center gap-2 shadow-xs">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <span className="text-sm font-medium text-slate-500">Loading operational thresholds…</span>
        </div>
      )}

      {/* Error state (only when nothing was loaded; stale data shows under the banner) */}
      {isError && settingsQuery.data === undefined && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <AlertTriangle size={15} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700 flex-1">Failed to load system thresholds from server.</p>
          <button
            onClick={() => refetch()}
            className="text-xs font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Storage migration notice */}
      {data && !data.storage_available && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xs">
          <AlertTriangle size={14} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">
            System defaults in use. Apply migration{' '}
            <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">20261018</code> to enable editing.
          </p>
        </div>
      )}

      {/* Reorganized Layout: 1 column on left (Early Warning, 4 items), 2 stacked cards on right (Danger 2 items, Workflow 2 items) */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Early Warning Triggers (Taller card, matching the longest section) */}
          <div className="lg:col-span-6 flex flex-col">
            {renderGroupCard('early_warning', 'h-full flex flex-col')}
          </div>

          {/* Right Column: Danger Levels & Timing / Workflow (Stacked, defining full content height) */}
          <div className="lg:col-span-6 flex flex-col gap-5 justify-between">
            {renderGroupCard('hazard')}
            {renderGroupCard('workflow')}
          </div>
        </div>
      )}
    </div></DataRegion>
  );
};
