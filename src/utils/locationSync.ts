/**
 * Loop-safe, race-safe location synchronisation for the incident location picker.
 *
 * Model
 * -----
 * - The map PIN is the source of truth. Every way of choosing a place (address
 *   search, map click/drag, postcode) ends by moving the pin, and the backend's
 *   reverse lookup of the pin fills state, district, postcode and the admin link.
 * - `district` is the most precise place name (e.g. Mentakab), filled from the
 *   pin and freely editable. The CANONICAL administrative district it lies in
 *   (e.g. Temerloh) is kept as `adminDistrict` + `administrativeAreaId`; that
 *   link drives the DOSM population / boundary data used by the AI pipeline.
 *
 * Rules
 * -----
 * - Every USER action gets a new sequence number. Only the response for the
 *   latest sequence is applied; stale async responses are dropped.
 * - Applying a RESOLUTION never starts another lookup, so pin → district → pin
 *   loops cannot happen.
 * - Unresolved / unavailable lookups keep the officer's latest valid values and
 *   set an explicit status; nothing is replaced with an unrelated default.
 */
import type { AdministrativeArea, GeoResolution, GeoStatus } from '../types';

export type SyncOrigin = 'pin' | 'state' | 'district' | 'postcode' | 'init';
export type SyncStatus = GeoStatus | 'pending' | 'idle';

export interface LocationState {
  lat: number | null;
  lng: number | null;
  state: string;
  /** Most precise place name (town / locality or district); free text. */
  district: string;
  /** Canonical administrative district the pin lies in ('' when not linked). */
  adminDistrict: string;
  postcode: string;
  zone: string | null;
  administrativeAreaId: string | null;
  /** Full address of the pin from the last reverse lookup (null until one succeeds). */
  displayName: string | null;
  status: SyncStatus;
  message: string | null;
  candidates: NonNullable<GeoResolution['candidates']>;
  seq: number;
  origin: SyncOrigin;
}

export type LocationAction =
  | { type: 'PIN_MOVED'; lat: number; lng: number }
  | { type: 'STATE_SELECTED'; state: string; areas: AdministrativeArea[] }
  | { type: 'DISTRICT_SELECTED'; district: string; areas: AdministrativeArea[] }
  | { type: 'POSTCODE_ENTERED'; postcode: string }
  | { type: 'DISTRICT_TYPED'; district: string }
  | { type: 'RESOLVED'; seq: number; result: GeoResolution }
  | { type: 'FAILED'; seq: number; message: string }
  | { type: 'CANDIDATE_CHOSEN'; candidate: NonNullable<GeoResolution['candidates']>[number] };

export const initialLocation = (partial: Partial<LocationState> = {}): LocationState => ({
  lat: null,
  lng: null,
  state: '',
  district: '',
  adminDistrict: '',
  postcode: '',
  zone: null,
  administrativeAreaId: null,
  displayName: null,
  status: 'idle',
  message: null,
  candidates: [],
  seq: 0,
  origin: 'init',
  ...partial,
});

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Spelling-independent key for a Malaysian state name, so "W.P. Kuala Lumpur",
 * "WP Kuala Lumpur", "Wilayah Persekutuan Kuala Lumpur", "Federal Territory of
 * Kuala Lumpur" and "Kuala Lumpur" are the same state; likewise Penang /
 * Pulau Pinang and Malacca / Melaka.
 */
export function stateKey(raw: string | null | undefined): string {
  const s = norm(raw)
    .replace(/[.,]/g, ' ')
    .replace(/\b(wilayah persekutuan|federal territory( of)?|w p|wp)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s === 'penang') return 'pulau pinang';
  if (s === 'malacca') return 'melaka';
  return s;
}

/** The entry of `known` that names the same state as `raw` (or `raw` trimmed when none does). */
export function canonicalState(raw: string | null | undefined, known: readonly string[]): string {
  const key = stateKey(raw);
  if (!key) return '';
  return known.find((k) => stateKey(k) === key) ?? (raw ?? '').trim();
}

export function districtsForState(areas: AdministrativeArea[], state: string): AdministrativeArea[] {
  const key = stateKey(state);
  return areas.filter((a) => stateKey(a.state) === key).sort((a, b) => a.district.localeCompare(b.district));
}

/** One entry per state (spelling variants collapsed), sorted. */
export function statesOf(areas: AdministrativeArea[]): string[] {
  const byKey = new Map<string, string>();
  for (const a of areas) if (!byKey.has(stateKey(a.state))) byKey.set(stateKey(a.state), a.state);
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
}

/** Mean of the canonical district centroids of a state (null if none have centroids). */
export function stateCentroid(areas: AdministrativeArea[], state: string): { lat: number; lng: number } | null {
  const pts = districtsForState(areas, state).filter(
    (a) => typeof a.centroid_lat === 'number' && typeof a.centroid_lng === 'number'
  );
  if (!pts.length) return null;
  return {
    lat: pts.reduce((s, a) => s + (a.centroid_lat as number), 0) / pts.length,
    lng: pts.reduce((s, a) => s + (a.centroid_lng as number), 0) / pts.length,
  };
}

export function locationReducer(s: LocationState, a: LocationAction): LocationState {
  switch (a.type) {
    case 'PIN_MOVED':
      if (!Number.isFinite(a.lat) || !Number.isFinite(a.lng)) return s;
      // The pin moved: everything derived from it is unknown until reverse-geocoded.
      return { ...s, lat: a.lat, lng: a.lng, status: 'pending', message: null, candidates: [], seq: s.seq + 1, origin: 'pin' };

    case 'STATE_SELECTED': {
      const keepDistrict = districtsForState(a.areas, a.state).some((d) => norm(d.district) === norm(s.adminDistrict));
      // The pin is NOT moved to the state's centre: a pin there would be a made-up
      // incident location. The picker only pans the map; the officer places the pin.
      return {
        ...s,
        state: a.state,
        district: keepDistrict ? s.district : '',
        adminDistrict: keepDistrict ? s.adminDistrict : '',
        zone: keepDistrict ? s.zone : null,
        administrativeAreaId: keepDistrict ? s.administrativeAreaId : null,
        postcode: keepDistrict ? s.postcode : '',
        status: keepDistrict ? s.status : 'partial',
        message: keepDistrict ? s.message : 'Choose the district, or search the address / click the map.',
        candidates: [],
        seq: s.seq + 1, // invalidates any in-flight lookup
        origin: 'state',
      };
    }

    case 'DISTRICT_SELECTED': {
      const area = districtsForState(a.areas, s.state).find((d) => norm(d.district) === norm(a.district));
      if (!area) return { ...s, district: a.district };
      const hasCentre = typeof area.centroid_lat === 'number' && typeof area.centroid_lng === 'number';
      return {
        ...s,
        district: area.district,
        adminDistrict: area.district,
        administrativeAreaId: area.id,
        zone: area.district_code ?? null,
        postcode: '',
        lat: hasCentre ? (area.centroid_lat as number) : s.lat,
        lng: hasCentre ? (area.centroid_lng as number) : s.lng,
        status: hasCentre ? 'partial' : 'unresolved',
        message: hasCentre ? 'Pin placed at the district centre — drag it to the exact location.' : 'District has no centroid; place the pin manually.',
        candidates: [],
        seq: s.seq + 1,
        origin: 'district',
      };
    }

    case 'POSTCODE_ENTERED': {
      const pc = a.postcode.replace(/\D/g, '').slice(0, 5);
      return { ...s, postcode: pc, status: pc.length === 5 ? 'pending' : s.status, candidates: [], seq: s.seq + 1, origin: 'postcode' };
    }

    case 'DISTRICT_TYPED':
      // Free text (e.g. Mentakab); it does not move the pin or change the admin link.
      return { ...s, district: a.district };

    case 'RESOLVED': {
      if (a.seq !== s.seq) return s; // stale response
      const r = a.result;
      if (s.origin === 'pin') {
        if (r.status === 'unresolved' || r.status === 'unavailable') {
          return { ...s, status: r.status, message: r.message ?? 'Location could not be resolved.' };
        }
        return {
          ...s,
          state: r.state ?? s.state,
          // The pin is the source of truth: the most precise name of the NEW point
          // (town if known, else its district) replaces the old text.
          district: r.locality || r.district || s.district,
          adminDistrict: r.district ?? '',
          zone: r.zone,
          administrativeAreaId: r.administrative_area_id,
          postcode: r.postcode ?? '',
          displayName: r.display_name ?? null,
          status: r.status,
          message: r.message ?? null,
        };
      }
      if (s.origin === 'postcode') {
        if (r.status === 'ambiguous') {
          return { ...s, status: 'ambiguous', message: r.message ?? 'Postcode matches more than one district.', candidates: r.candidates ?? [] };
        }
        if (r.lat == null || r.lng == null || r.status === 'unresolved' || r.status === 'unavailable') {
          return { ...s, status: r.status, message: r.message ?? 'Postcode could not be resolved.' };
        }
        return {
          ...s,
          lat: r.lat,
          lng: r.lng,
          state: r.state ?? s.state,
          district: r.district ?? s.district,
          adminDistrict: r.district ?? s.adminDistrict,
          zone: r.zone,
          administrativeAreaId: r.administrative_area_id,
          status: r.status,
          message: r.message ?? null,
        };
      }
      return s;
    }

    case 'FAILED':
      if (a.seq !== s.seq) return s;
      return { ...s, status: 'unavailable', message: a.message };

    case 'CANDIDATE_CHOSEN':
      return {
        ...s,
        lat: a.candidate.lat,
        lng: a.candidate.lng,
        state: a.candidate.state ?? s.state,
        district: a.candidate.district ?? s.district,
        adminDistrict: a.candidate.district ?? s.adminDistrict,
        zone: a.candidate.zone,
        administrativeAreaId: a.candidate.administrative_area_id,
        status: 'resolved',
        message: null,
        candidates: [],
        seq: s.seq + 1,
        origin: 'district',
      };
  }
}

/** Which lookup (if any) a state needs after a user action. */
export function pendingLookup(s: LocationState): 'reverse' | 'forward-postcode' | null {
  if (s.status !== 'pending') return null;
  if (s.origin === 'pin' && s.lat != null && s.lng != null) return 'reverse';
  if (s.origin === 'postcode' && s.postcode.length === 5) return 'forward-postcode';
  return null;
}

/** True when the location is good enough to submit (canonical district + coordinates). */
export function isSubmittable(s: LocationState): boolean {
  return s.lat != null && s.lng != null && !!s.administrativeAreaId && s.status !== 'pending' && s.status !== 'ambiguous';
}
