import React from 'react';
import { formatLogDetail } from '../../../utils/logDetail';

/** Action-log detail: changed fields as "Label value" rows, otherwise plain text. */
export const LogDetailBody: React.FC<{ detail?: string | null }> = ({ detail }) => {
  const d = formatLogDetail(detail);
  if (!d) return null;
  if (d.kind === 'text') return <p className="text-xs text-slate-600">{d.text}</p>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {d.items.map((it, i) =>
        it.value ? (
          <React.Fragment key={i}>
            <dt className="text-slate-500">{it.label}</dt>
            <dd className="text-slate-800 font-medium">{it.value}</dd>
          </React.Fragment>
        ) : (
          <dd key={i} className="col-span-2 text-slate-600">{it.label}</dd>
        )
      )}
    </dl>
  );
};
