/**
 * Provenance of officer-entered incident facts. Mirrors
 * vanguard-backend/app/services/intelligence/deterministic.py::fact_state so
 * the console and the pipeline agree on what counts as "unknown".
 */
import type { FactField, FactState, Incident } from '../types';

export const FACT_STATE_LABEL: Record<FactState, string> = {
  reported: 'Reported',
  verified: 'Verified',
  disputed: 'Disputed',
  unknown: 'Not reported',
};

/** Fields absent from field_verification are "reported" (legacy rows); a null value is "unknown". */
export function factState(
  incident: Pick<Incident, 'field_verification'> & Partial<Record<FactField, unknown>>,
  field: FactField
): FactState {
  const state = incident.field_verification?.[field];
  if (state) return state;
  return incident[field] === null || incident[field] === undefined ? 'unknown' : 'reported';
}

/** Facts changed in an edit form become "reported"; untouched facts keep their state. */
export function editedFieldVerification(
  incident: Incident,
  next: Partial<Record<FactField, unknown>>
): Partial<Record<FactField, FactState>> {
  const out: Partial<Record<FactField, FactState>> = { ...(incident.field_verification ?? {}) };
  (Object.keys(next) as FactField[]).forEach((k) => {
    const before = (incident as unknown as Record<string, unknown>)[k] ?? null;
    if (String(before ?? '') !== String(next[k] ?? '')) out[k] = next[k] === null ? 'unknown' : 'reported';
  });
  return out;
}
