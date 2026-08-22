import React from 'react';
import type { SeverityLevel, DisasterLevel } from '../../../types';
import { SEVERITY_BADGE_MAP, DISASTER_LEVEL_BADGE_MAP } from '../../../constants';

interface DisasterBadgeProps {
  type: 'severity' | 'level';
  value: SeverityLevel | DisasterLevel;
  className?: string;
}

export const DisasterBadge: React.FC<DisasterBadgeProps> = ({ type, value, className = '' }) => {
  if (type === 'severity') {
    const style = SEVERITY_BADGE_MAP[value as SeverityLevel] || SEVERITY_BADGE_MAP.Low;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${className}`}
        style={{ background: style.bg, color: style.text, borderColor: style.border }}
      >
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" style={{ background: style.dot }} />
        {value}
      </span>
    );
  }

  const style = DISASTER_LEVEL_BADGE_MAP[value] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${className}`}
      style={{ background: style.bg, color: style.text, borderColor: style.border }}
    >
      {value}
    </span>
  );
};
