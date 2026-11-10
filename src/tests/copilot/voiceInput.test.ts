import { describe, expect, it } from 'vitest';
import { joinTranscript } from '../../components/copilot/useVoiceInput';

const results = (...texts: string[]) => texts.map((t) => Object.assign([{ transcript: t }], { isFinal: false }));

describe('voice transcript', () => {
  it('keeps one copy when the browser resends the sentence so far', () => {
    expect(joinTranscript(results('Summarize today', 'Summarize today res', 'Summarize today rescue Mission')))
      .toBe('Summarize today rescue Mission');
  });

  it('joins separate phrases and ignores a shorter repeat', () => {
    expect(joinTranscript(results('Draft a broadcast', 'for Kuantan'))).toBe('Draft a broadcast for Kuantan');
    expect(joinTranscript(results('Summarize today rescue', 'Summarize today'))).toBe('Summarize today rescue');
    expect(joinTranscript(results('', '  '))).toBe('');
  });
});
