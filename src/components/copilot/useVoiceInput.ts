import { useEffect, useRef, useState } from 'react';

type SpeechResult = ArrayLike<{ transcript: string }> & { isFinal?: boolean };

/** The browser's speech recogniser (Chrome/Edge expose it with a webkit prefix). */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

const ctor = (): RecognitionCtor | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. Allow it in the browser to speak.',
  'no-speech': 'No speech heard. Try again.',
  network: 'Voice input needs an internet connection.',
};

/**
 * Everything said so far, as one line. Some browsers (Chrome on Android, Edge)
 * send each result as the whole sentence so far ("Summarize", "Summarize today",
 * …) rather than only the new words, so a result that repeats the previous one
 * replaces it instead of being added.
 */
export function joinTranscript(results: ArrayLike<SpeechResult>): string {
  const parts: string[] = [];
  for (const res of Array.from(results)) {
    const text = (res[0]?.transcript ?? '').trim();
    if (!text) continue;
    const last = parts[parts.length - 1];
    if (last !== undefined && text.toLowerCase().startsWith(last.toLowerCase())) parts[parts.length - 1] = text;
    else if (last === undefined || !last.toLowerCase().startsWith(text.toLowerCase())) parts.push(text);
  }
  return parts.join(' ');
}

/**
 * Speech-to-text for the copilot box. ``onText`` receives the whole of what has
 * been said in this session each time it changes (words appear as they are
 * spoken), so the caller replaces its spoken part rather than appending. Nothing
 * is sent automatically. ``supported`` is false in browsers without speech
 * recognition (the mic button is hidden).
 */
export function useVoiceInput(onText: (spoken: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const handler = useRef(onText);
  handler.current = onText;

  useEffect(() => () => rec.current?.stop(), []);

  const start = () => {
    const Ctor = ctor();
    if (!Ctor || listening) return;
    const r = new Ctor();
    r.lang = 'en-MY';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const text = joinTranscript(e.results);
      if (text) handler.current(text);
    };
    r.onerror = (e) => setError(ERRORS[e.error] ?? 'Voice input stopped.');
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    setListening(true);
    r.start();
  };

  const stop = () => rec.current?.stop();

  return { supported: !!ctor(), listening, error, start, stop };
}
