import { describe, expect, it } from 'vitest';
import type { AdministrativeArea, GeoResolution } from '../../types';
import {
  canonicalState,
  districtsForState,
  initialLocation,
  isSubmittable,
  locationReducer,
  pendingLookup,
  stateCentroid,
  stateKey,
  statesOf,
} from '../../utils/locationSync';

const areas: AdministrativeArea[] = [
  { id: 'kb', state: 'Kelantan', district: 'Kota Bharu', district_code: 'KB', centroid_lat: 6.1, centroid_lng: 102.2 },
  { id: 'pm', state: 'Kelantan', district: 'Pasir Mas', centroid_lat: 6.0, centroid_lng: 102.1 },
  { id: 'nc', state: 'Kelantan', district: 'No Centroid' },
  { id: 'kl', state: 'WP Kuala Lumpur', district: 'Kuala Lumpur', centroid_lat: 3.1, centroid_lng: 101.7 },
];

const resolution = (over: Partial<GeoResolution> = {}): GeoResolution => ({
  status: 'resolved',
  lat: 6.12,
  lng: 102.24,
  administrative_area_id: 'kb',
  state: 'Kelantan',
  district: 'Kota Bharu',
  zone: 'KB',
  postcode: '15000',
  ...over,
});

describe('canonical area helpers', () => {
  it('lists states and districts from administrative areas only', () => {
    expect(statesOf(areas)).toEqual(['Kelantan', 'WP Kuala Lumpur']);
    expect(districtsForState(areas, ' kelantan ').map((a) => a.district)).toEqual(['Kota Bharu', 'No Centroid', 'Pasir Mas']);
  });
  it('averages district centroids and returns null when there are none', () => {
    expect(stateCentroid(areas, 'Kelantan')).toEqual({ lat: 6.05, lng: 102.15 });
    expect(stateCentroid(areas, 'Atlantis')).toBeNull();
  });
});

describe('locationReducer', () => {
  it('starts with no default pin', () => {
    const s = initialLocation();
    expect(s.lat).toBeNull();
    expect(s.lng).toBeNull();
    expect(isSubmittable(s)).toBe(false);
  });

  it('moving the pin asks for a reverse lookup and applies its result', () => {
    let s = locationReducer(initialLocation(), { type: 'PIN_MOVED', lat: 6.12, lng: 102.24 });
    expect(pendingLookup(s)).toBe('reverse');
    s = locationReducer(s, { type: 'RESOLVED', seq: s.seq, result: resolution() });
    expect(s).toMatchObject({ district: 'Kota Bharu', administrativeAreaId: 'kb', postcode: '15000', status: 'resolved' });
    expect(pendingLookup(s)).toBeNull(); // a resolution never triggers another lookup (no loops)
    expect(isSubmittable(s)).toBe(true);
  });

  it('drops stale responses so a slow reply cannot overwrite a newer selection', () => {
    let s = locationReducer(initialLocation(), { type: 'PIN_MOVED', lat: 6, lng: 102 });
    const staleSeq = s.seq;
    s = locationReducer(s, { type: 'PIN_MOVED', lat: 3.1, lng: 101.7 });
    const after = locationReducer(s, { type: 'RESOLVED', seq: staleSeq, result: resolution() });
    expect(after).toBe(s);
    expect(locationReducer(s, { type: 'FAILED', seq: staleSeq, message: 'x' })).toBe(s);
  });

  it('ignores non-finite pins', () => {
    const s = initialLocation();
    expect(locationReducer(s, { type: 'PIN_MOVED', lat: NaN, lng: 1 })).toBe(s);
  });

  it('keeps the officer values when the lookup is unresolved', () => {
    let s = initialLocation({ state: 'Kelantan', district: 'Kota Bharu', administrativeAreaId: 'kb' });
    s = locationReducer(s, { type: 'PIN_MOVED', lat: 1.3, lng: 104.0 });
    s = locationReducer(s, { type: 'RESOLVED', seq: s.seq, result: resolution({ status: 'unresolved', message: 'Outside Malaysia' }) });
    expect(s).toMatchObject({ district: 'Kota Bharu', status: 'unresolved', message: 'Outside Malaysia' });
  });

  it('selecting a district snaps the pin to its centroid; a district without one is unresolved', () => {
    let s = locationReducer(initialLocation(), { type: 'STATE_SELECTED', state: 'Kelantan', areas });
    expect(s.district).toBe('');
    s = locationReducer(s, { type: 'DISTRICT_SELECTED', district: 'Kota Bharu', areas });
    expect(s).toMatchObject({ lat: 6.1, lng: 102.2, administrativeAreaId: 'kb', status: 'partial' });
    const nc = locationReducer(s, { type: 'DISTRICT_SELECTED', district: 'No Centroid', areas });
    expect(nc.status).toBe('unresolved');
    expect(nc.lat).toBe(6.1); // keeps the last valid pin rather than inventing one
  });

  it('changing state clears a district that does not belong to it', () => {
    let s = initialLocation({ state: 'Kelantan', district: 'Kota Bharu', administrativeAreaId: 'kb' });
    s = locationReducer(s, { type: 'STATE_SELECTED', state: 'WP Kuala Lumpur', areas });
    expect(s).toMatchObject({ district: '', administrativeAreaId: null, status: 'partial' });
  });

  it('an ambiguous postcode lists candidates and blocks submit until one is chosen', () => {
    let s = locationReducer(initialLocation(), { type: 'POSTCODE_ENTERED', postcode: '16-300' });
    expect(s.postcode).toBe('16300');
    expect(pendingLookup(s)).toBe('forward-postcode');
    const candidate = { administrative_area_id: 'pm', state: 'Kelantan', district: 'Pasir Mas', zone: null, lat: 6.0, lng: 102.1 };
    s = locationReducer(s, { type: 'RESOLVED', seq: s.seq, result: resolution({ status: 'ambiguous', lat: null, lng: null, candidates: [candidate] }) });
    expect(s.status).toBe('ambiguous');
    expect(isSubmittable(s)).toBe(false);
    s = locationReducer(s, { type: 'CANDIDATE_CHOSEN', candidate });
    expect(s).toMatchObject({ district: 'Pasir Mas', administrativeAreaId: 'pm', status: 'resolved', candidates: [] });
    expect(isSubmittable(s)).toBe(true);
  });

  it('a failed lookup is reported as unavailable', () => {
    let s = locationReducer(initialLocation(), { type: 'PIN_MOVED', lat: 6, lng: 102 });
    s = locationReducer(s, { type: 'FAILED', seq: s.seq, message: 'Network error' });
    expect(s).toMatchObject({ status: 'unavailable', message: 'Network error' });
  });
});

describe('state names and the pin as source of truth', () => {
  it('treats every spelling of a federal territory / state as the same state', () => {
    for (const v of ['W.P. Kuala Lumpur', 'WP Kuala Lumpur', 'Wilayah Persekutuan Kuala Lumpur', 'Federal Territory of Kuala Lumpur', 'kuala lumpur']) {
      expect(stateKey(v)).toBe('kuala lumpur');
    }
    expect(stateKey('Penang')).toBe(stateKey('Pulau Pinang'));
    expect(stateKey('Malacca')).toBe(stateKey('Melaka'));
    expect(canonicalState('Wilayah Persekutuan Kuala Lumpur', ['Kelantan', 'WP Kuala Lumpur'])).toBe('WP Kuala Lumpur');
    expect(canonicalState('Atlantis', ['Kelantan'])).toBe('Atlantis');
  });

  it('lists each state once even when the areas use different spellings', () => {
    const mixed = [...areas, { id: 'x', state: 'W.P. Kuala Lumpur', district: 'Bukit Bintang' }];
    expect(statesOf(mixed)).toEqual(['Kelantan', 'WP Kuala Lumpur']);
    expect(districtsForState(mixed, 'Wilayah Persekutuan Kuala Lumpur').map((a) => a.district)).toEqual(['Bukit Bintang', 'Kuala Lumpur']);
  });

  it('uses the town from the pin as the district text and keeps the canonical district as the link', () => {
    let s = locationReducer(initialLocation(), { type: 'PIN_MOVED', lat: 3.45, lng: 102.42 });
    s = locationReducer(s, { type: 'RESOLVED', seq: s.seq, result: resolution({ district: 'Temerloh', administrative_area_id: 'tm', locality: 'Mentakab' }) });
    expect(s).toMatchObject({ district: 'Mentakab', adminDistrict: 'Temerloh', administrativeAreaId: 'tm' });
    expect(isSubmittable(s)).toBe(true);
    s = locationReducer(s, { type: 'PIN_MOVED', lat: 3.5, lng: 102.4 });
    s = locationReducer(s, { type: 'RESOLVED', seq: s.seq, result: resolution({ district: 'Temerloh', administrative_area_id: 'tm', locality: null }) });
    expect(s.district).toBe('Temerloh'); // no town known for the new point: the district name is used
  });

  it('lets the officer type a more precise place without moving the pin or losing the link', () => {
    const start = initialLocation({ lat: 3.45, lng: 102.42, district: 'Temerloh', adminDistrict: 'Temerloh', administrativeAreaId: 'tm', status: 'resolved' });
    const s = locationReducer(start, { type: 'DISTRICT_TYPED', district: 'Kampung Paya' });
    expect(s).toMatchObject({ district: 'Kampung Paya', adminDistrict: 'Temerloh', administrativeAreaId: 'tm', lat: 3.45, seq: start.seq });
    expect(pendingLookup(s)).toBeNull();
  });

  it('choosing a state does not invent a pin at the state centre', () => {
    const s = locationReducer(initialLocation(), { type: 'STATE_SELECTED', state: 'Kelantan', areas });
    expect(s.lat).toBeNull();
    expect(isSubmittable(s)).toBe(false);
  });

  it('cannot submit without a link to a canonical district', () => {
    const s = initialLocation({ lat: 3.4, lng: 102.4, state: 'Pahang', district: 'Mentakab', status: 'partial' });
    expect(isSubmittable(s)).toBe(false);
  });
});
