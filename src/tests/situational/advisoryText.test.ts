import { describe, expect, it } from 'vitest';
import { parseAdvisory, splitAdvisory } from '../../utils/advisoryText';

describe('parseAdvisory', () => {
  it('takes a bold title and plain level off the text', () => {
    expect(parseAdvisory('**Flood watch:** Rain is heavy. Recommended disaster level: Level 1: District.')).toEqual({
      title: 'Flood watch',
      body: 'Rain is heavy.',
      level: 'Level 1: District',
    });
  });

  it('reads a markdown heading and a bold level', () => {
    const a = parseAdvisory('## Flood watch\nRain is heavy.\n**Recommended disaster level:** **Level 2: State**');
    expect(a).toEqual({ title: 'Flood watch', body: 'Rain is heavy.', level: 'Level 2: State' });
  });
});

describe('splitAdvisory', () => {
  it('keeps inline marks for the renderer and sorts actions from summary', () => {
    expect(splitAdvisory('Rain reached **120 mm** today. Officers should **close** the low road.')).toEqual({
      summary: ['Rain reached **120 mm** today.'],
      actions: ['Officers should **close** the low road.'],
    });
  });

  it('never cuts a bold run in half', () => {
    expect(splitAdvisory('**River is high. Banks are soft.** More rain is due.').summary).toEqual([
      '**River is high. Banks are soft.**',
      'More rain is due.',
    ]);
  });

  it('turns list lines into actions and drops the lead-in', () => {
    expect(splitAdvisory('Rain is heavy.\n\n**Recommended actions:**\n- Close roads\n* Open shelters\n1. Warn villages')).toEqual({
      summary: ['Rain is heavy.'],
      actions: ['Close roads', 'Open shelters', 'Warn villages'],
    });
  });

  it('separates a list written on one line', () => {
    expect(splitAdvisory('Rain is heavy. * Close roads * Open shelters').actions).toEqual(['Close roads', 'Open shelters']);
  });
});
