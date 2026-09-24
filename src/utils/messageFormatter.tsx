import React from 'react';

/**
 * Renders copilot chat messages with basic markdown formatting:
 * bold (**text**), italic (*text*), inline code (`code`), and bullet lists (* item).
 */
export const FormattedMessageText: React.FC<{ text: string; isUser?: boolean }> = ({
  text,
  isUser,
}) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, lIdx) => {
        if (!line.trim()) return <div key={lIdx} className="h-1" />;

        const isBullet =
          line.trim().startsWith('* ') ||
          line.trim().startsWith('- ') ||
          line.trim().startsWith('• ');
        const cleanLine = isBullet ? line.trim().slice(2) : line;

        const parts: React.ReactNode[] = [];
        let remaining = cleanLine;
        let pKey = 0;

        while (remaining.length > 0) {
          // Bold **...** or __...__
          const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
          if (boldMatch) {
            parts.push(
              <strong
                key={pKey++}
                className={`font-extrabold ${isUser ? 'text-white' : 'text-slate-900'}`}
              >
                {boldMatch[2]}
              </strong>
            );
            remaining = remaining.slice(boldMatch[0].length);
            continue;
          }

          // Inline Code `...`
          const codeMatch = remaining.match(/^`([^`]+)`/);
          if (codeMatch) {
            parts.push(
              <code
                key={pKey++}
                className={`px-1 py-0.5 rounded text-[11px] font-mono ${
                  isUser ? 'bg-blue-700 text-white' : 'bg-slate-100 text-blue-600 font-semibold'
                }`}
              >
                {codeMatch[1]}
              </code>
            );
            remaining = remaining.slice(codeMatch[0].length);
            continue;
          }

          // Italic *...* or _..._
          const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
          if (italicMatch && !italicMatch[2].startsWith('*')) {
            parts.push(
              <em key={pKey++} className="italic">
                {italicMatch[2]}
              </em>
            );
            remaining = remaining.slice(italicMatch[0].length);
            continue;
          }

          // Plain text until next token
          const nextSpecial = remaining.search(/(\*\*|__|`|\*|_)/);
          if (nextSpecial === -1) {
            parts.push(<span key={pKey++}>{remaining}</span>);
            break;
          } else if (nextSpecial === 0) {
            parts.push(<span key={pKey++}>{remaining[0]}</span>);
            remaining = remaining.slice(1);
          } else {
            parts.push(<span key={pKey++}>{remaining.slice(0, nextSpecial)}</span>);
            remaining = remaining.slice(nextSpecial);
          }
        }

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-1.5 pl-1">
              <span
                className={`text-[10px] mt-0.5 font-bold ${isUser ? 'text-blue-200' : 'text-blue-600'}`}
              >
                •
              </span>
              <div className="flex-1">{parts}</div>
            </div>
          );
        }

        return <div key={lIdx}>{parts}</div>;
      })}
    </div>
  );
};
