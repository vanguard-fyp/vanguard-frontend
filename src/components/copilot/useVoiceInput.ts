import { useEffect, useRef, useState } from 'react';

/** The browser's speech recogniser (Chrome/Edge expose it with a webkit prefix). */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
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
 * Speech-to-text for the copilot box. The text is handed to ``onText`` for the
 * officer to read and send; nothing is sent automatically. ``supported`` is
 * false in browsers without speech recognition (the mic button is hidden).
 */
export function useVoiceInput(onText: (text: string) => void) {
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
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((res) => res[0]?.transcript ?? '').join(' ').trim();
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
