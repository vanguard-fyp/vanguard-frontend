import { describe, expect, it } from 'vitest';
import { currentStage, stageLocked, stageState } from '../../utils/incidentPipeline';

describe('incident pipeline', () => {
  it('waits on the step each status needs next', () => {
    expect(currentStage('Unverified')).toBe('verify');
    expect(currentStage('Verified')).toBe('deploy');
    expect(currentStage('Responding')).toBe('resolve');
    expect(currentStage('Resolved')).toBe('export');
  });

  it('marks earlier steps done and later ones upcoming', () => {
    expect(stageState('verify', 'Responding')).toBe('done');
    expect(stageState('resolve', 'Responding')).toBe('current');
    expect(stageState('export', 'Responding')).toBe('upcoming');
  });

  it('never marks a rejected report as verified', () => {
    expect(stageState('verify', 'Rejected')).toBe('current');
    expect(stageState('deploy', 'Rejected')).toBe('upcoming');
  });
});

describe('stage locks', () => {
  it('holds Deploy and Resolve until the report is verified', () => {
    for (const status of ['Unverified', 'Rejected']) {
      expect(stageLocked('deploy', status)).toBe(true);
      expect(stageLocked('resolve', status)).toBe(true);
    }
    expect(stageLocked('deploy', 'Verified')).toBe(false);
    expect(stageLocked('resolve', 'Responding')).toBe(false);
  });

  it('never locks verification or export', () => {
    expect(stageLocked('verify', 'Unverified')).toBe(false);
    expect(stageLocked('export', 'Unverified')).toBe(false);
  });
});
