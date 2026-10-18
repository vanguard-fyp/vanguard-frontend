import React from 'react';

/**
 * Vanguard Copilot's mascot: a small robot head in the app's navy and blue.
 * It blinks now and then and its antenna glows (see index.css: .mascot-*).
 * `tone="light"` is the version for navy surfaces (white head, navy visor).
 */
interface CopilotMascotProps {
  size?: number;
  tone?: 'navy' | 'light';
  className?: string;
}

export const CopilotMascot: React.FC<CopilotMascotProps> = ({ size = 56, tone = 'navy', className = '' }) => {
  const navy = tone === 'navy';
  const head = navy ? '#1e293b' : '#ffffff';
  const ear = navy ? '#334155' : '#cbd5e1';
  const visor = navy ? '#dbeafe' : '#1e293b';
  const face = navy ? '#1e293b' : '#93c5fd';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* antenna */}
      <line x1="32" y1="12" x2="32" y2="5" stroke={ear} strokeWidth="2.5" strokeLinecap="round" />
      <circle className="mascot-antenna" cx="32" cy="4.5" r="3.2" fill="#3b82f6" />
      {/* ears */}
      <rect x="5" y="25" width="6" height="13" rx="3" fill={ear} />
      <rect x="53" y="25" width="6" height="13" rx="3" fill={ear} />
      {/* head */}
      <rect x="9" y="11" width="46" height="38" rx="15" fill={head} />
      {/* visor */}
      <rect x="15" y="18" width="34" height="23" rx="11" fill={visor} />
      {/* eyes */}
      <ellipse className="mascot-eye" cx="25.5" cy="27.5" rx="3.3" ry="4.2" fill={face} />
      <ellipse className="mascot-eye" cx="38.5" cy="27.5" rx="3.3" ry="4.2" fill={face} />
      {/* cheeks */}
      <circle cx="19.5" cy="33.5" r="2.2" fill="#60a5fa" opacity="0.45" />
      <circle cx="44.5" cy="33.5" r="2.2" fill="#60a5fa" opacity="0.45" />
      {/* smile */}
      <path d="M28 34.5 Q32 38 36 34.5" fill="none" stroke={face} strokeWidth="2.2" strokeLinecap="round" />
      {/* body with a chest light */}
      <rect x="21" y="50" width="22" height="11" rx="5.5" fill={head} />
      <circle cx="32" cy="55.5" r="2.3" fill="#3b82f6" />
    </svg>
  );
};
