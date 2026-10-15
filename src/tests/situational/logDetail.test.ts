import { describe, expect, it } from 'vitest';
import { formatLogDetail } from '../../utils/logDetail';

describe('action log detail', () => {
  it('tidies legacy "field → value" entries with Python objects and ids', () => {
    const d = formatLogDetail(
      "severity → Critical, field_verification → {'severity': 'verified', 'affected_population': 'unknown'}, " +
        'disaster_type_id → 00000002-0000-4000-8000-000000000001, lat → 3.14, lng → 101.6, updated_at → 2026-10-15'
    );
    expect(d).toEqual({
      kind: 'changes',
      items: [
        { label: 'Severity', value: 'Critical' },
        { label: 'Fact checks', value: 'verified severity; unknown affected population' },
        { label: 'Disaster type', value: 'changed' },
        { label: 'Map pin moved', value: '' },
      ],
    });
  });

  it('splits the new backend format and keeps plain sentences as text', () => {
    expect(formatLogDetail('Severity: Critical · Map pin moved')).toEqual({
      kind: 'changes',
      items: [
        { label: 'Severity', value: 'Critical' },
        { label: 'Map pin moved', value: '' },
      ],
    });
    expect(formatLogDetail('Outcome: residents evacuated safely')).toEqual({ kind: 'text', text: 'Outcome: residents evacuated safely' });
    expect(formatLogDetail('')).toBeNull();
  });
});
