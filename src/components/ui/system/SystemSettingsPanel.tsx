import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw, Sliders } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { useResetSystemSetting, useSystemSettings, useUpdateSystemSetting } from '../../../hooks/useSystemSettings';
import type { SettingGroup, SystemSetting } from '../../../services/systemSettingsService';
import { relativeTime } from '../../../utils/display';

const GROUPS: { key: SettingGroup; title: string }[] = [
  { key: 'early_warning', title: 'Early warning' },
  { key: 'hazard', title: 'Danger levels' },
  { key: 'workflow', title: 'Timing' },
];

const fmt = (s: SystemSetting, v: number) =>
  s.kind === 'choice' ? s.options.find((o) => o.value === v)?.label ?? String(v) : `${v} ${s.unit}`;

/**
 * Operational thresholds read by the backend at runtime
 * (app/services/system/settings_service.py). Admins edit; others read.
 */
export const SystemSettingsPanel: React.FC = () => {
  const { data, isLoading, isError, refetch } = useSystemSettings();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('SYSTEM_ADMIN') && !!data?.storage_available;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      <div className="flex items-center gap-2">
        <Sliders size={16} className="text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900">Operational thresholds</h3>
        {data && !canEdit && data.storage_available && <span className="text-[11px] text-slate-400">· read-only</span>}
      </div>

      {isLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
      {isError && (
        <p className="text-xs text-red-700">
          Could not load. <button onClick={() => refetch()} className="font-bold underline cursor-pointer">Retry</button>
        </p>
      )}
      {data && !data.storage_available && (
        <p className="text-xs text-amber-800 flex items-center gap-1.5">
          <AlertTriangle size={13} /> Defaults in use. Apply migration 20261018 to edit.
        </p>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {GROUPS.map((g) => (
            <section key={g.key}>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{g.title}</h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {data.items
                  .filter((i) => i.group === g.key)
                  .map((s) => (
                    <SettingRow key={s.key} setting={s} canEdit={canEdit} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

const SettingRow: React.FC<{ setting: SystemSetting; canEdit: boolean }> = ({ setting: s, canEdit }) => {
  const toast = useToast();
  const update = useUpdateSystemSetting();
  const reset = useResetSystemSetting();
  const [draft, setDraft] = useState(String(s.value));
  useEffect(() => setDraft(String(s.value)), [s.value]);

  const num = Number(draft);
  const invalid =
    draft.trim() === '' ||
    !Number.isFinite(num) ||
    (s.kind === 'int' && !Number.isInteger(num)) ||
    (s.minimum != null && num < s.minimum) ||
    (s.maximum != null && num > s.maximum);
  const dirty = !invalid && num !== s.value;
  const busy = update.isPending || reset.isPending;

  const save = () =>
    update.mutate(
      { key: s.key, value: num },
      {
        onSuccess: () => toast.success(`${s.label}: ${fmt(s, num)}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save'),
      }
    );
  const restore = () =>
    reset.mutate(s.key, {
      onSuccess: () => toast.success(`${s.label}: back to ${fmt(s, s.default)}`),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not reset'),
    });

  const changed = !s.is_default
    ? `Changed${s.updated_by ? ` by ${s.updated_by}` : ''}${s.updated_at ? ` ${relativeTime(s.updated_at)}` : ''}`
    : null;

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800" title={s.help}>{s.label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {s.kind === 'choice' ? (
            <select
              value={draft}
              disabled={!canEdit || busy}
              onChange={(e) => setDraft(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 disabled:opacity-70"
            >
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
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
                disabled={!canEdit || busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && dirty && save()}
                aria-invalid={invalid}
                aria-label={s.label}
                className={`w-16 bg-slate-50 border rounded-md px-1.5 py-1 text-xs font-mono font-semibold text-slate-800 text-right focus:outline-none disabled:opacity-70 ${
                  invalid ? 'border-rose-400' : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              <span className="text-[11px] text-slate-500 w-14">{s.unit}</span>
            </>
          )}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-0.5">
        {invalid && canEdit ? <span className="text-rose-600">Allowed {s.minimum} to {s.maximum}</span> : s.help}
      </p>
      {(dirty || changed) && (
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="text-[10px] text-slate-400">{changed}</span>
          {canEdit && (
            <span className="flex items-center gap-2">
              {!s.is_default && !dirty && (
                <button
                  type="button"
                  onClick={restore}
                  disabled={busy}
                  title={`Back to ${fmt(s, s.default)}`}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer disabled:opacity-40"
                >
                  <RotateCcw size={11} /> Default
                </button>
              )}
              {dirty && (
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-600 text-white hover:bg-blue-500 cursor-pointer disabled:opacity-40"
                >
                  {update.isPending ? 'Saving…' : 'Save'}
                </button>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
