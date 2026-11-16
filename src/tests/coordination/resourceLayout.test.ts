import { describe, expect, it } from 'vitest';
import { placeSites } from '../../components/ui/coordination/resource/scene3d/layout';

const items = [
  { key: 'depot:a', lat: 3.1, lng: 101.6 },
  { key: 'depot:b', lat: 3.2, lng: 101.7 },
  { key: 'incident:x', lat: 3.15, lng: 101.65 },
];
const block = (sites: ReturnType<typeof placeSites>, key: string) => [sites.get(key)!.i, sites.get(key)!.j];

describe('3D yard layout', () => {
  it('puts a dragged place on the block the officer chose', () => {
    const sites = placeSites(items, ['supplier:s'], { 'depot:a': [7, 7], 'supplier:s': [-4, 2] });
    expect(block(sites, 'depot:a')).toEqual([7, 7]);
    expect(block(sites, 'supplier:s')).toEqual([-4, 2]);
  });

  it('keeps every place on its own block and ignores pins for places that are gone', () => {
    const base = placeSites(items);
    const taken = block(base, 'depot:b') as [number, number];
    const sites = placeSites(items, [], { 'depot:a': taken, 'depot:gone': [0, 0] });
    expect(block(sites, 'depot:a')).toEqual(taken);
    expect(sites.has('depot:gone')).toBe(false);
    expect(new Set([...sites.values()].map((s) => `${s.i},${s.j}`)).size).toBe(sites.size);
  });

  it('is unchanged when nothing is pinned', () => {
    const a = placeSites(items, ['supplier:s']);
    const b = placeSites(items, ['supplier:s'], {});
    expect([...a.values()].map((s) => [s.key, s.i, s.j])).toEqual([...b.values()].map((s) => [s.key, s.i, s.j]));
  });
});
