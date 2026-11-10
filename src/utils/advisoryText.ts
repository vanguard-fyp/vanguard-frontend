/**
 * The scan's AI advisory arrives as markdown-ish text. These helpers pull out its
 * heading, recommended level, summary and actions; inline marks such as **bold**
 * are left for FormattedMessageText to render.
 */

/** "**Title** Body … Recommended disaster level: Level 1: District" */
export const parseAdvisory = (text: string) => {
  let body = text.trim();
  let title: string | null = null;
  const t = body.match(/^(?:\*\*(.+?)\*\*|#{1,6}\s+(.+?)(?:\n|$))\s*/);
  if (t) {
    title = (t[1] ?? t[2]).trim().replace(/\*+/g, '').replace(/:$/, '');
    body = body.slice(t[0].length);
  }
  let level: string | null = null;
  const l = body.match(/\s*\**Recommended disaster level:?\**:?\s*\**(.+?)\**\.?\s*$/i);
  if (l) {
    level = l[1].trim();
    body = body.slice(0, l.index).trim();
  }
  return { title, body, level };
};

const ACTION_WORDS = /\b(should|must|need to|needs to|recommend|advise|ensure|evacuate|restrict|establish|prepare|monitor|deploy|issue|activate|avoid|close)\b/i;
const LIST_ITEM = /^(?:[-*•]|\d+[.)])\s+(.+)$/;
/** A line that only introduces what follows, like "**Recommended actions:**". */
const LEAD_IN = /^\**[^.!?]{0,48}:\**$/;

/** Sentence boundaries, keeping a **bold run** whole even if it holds a full stop. */
const sentences = (text: string): string[] => {
  const out: string[] = [];
  for (const part of text.split(/(?<=[.!?]|[.!?]\*\*)\s+(?=[A-Z*])/)) {
    const prev = out[out.length - 1];
    if (prev !== undefined && (prev.match(/\*\*/g)?.length ?? 0) % 2 === 1) out[out.length - 1] = `${prev} ${part}`;
    else out.push(part);
  }
  return out.map((x) => x.trim()).filter(Boolean);
};

/** Split an advisory body into a short summary and the actions it recommends,
 *  so a long AI paragraph reads as a few lines and a checklist. */
export const splitAdvisory = (body: string): { summary: string[]; actions: string[] } => {
  const listed: string[] = [];
  const prose: string[] = [];
  // Some models put a whole list on one line: "… steps: * Close roads * Open shelters".
  body.replace(/\s+\*\s+(?=[A-Z])/g, '\n* ').split(/\r?\n/).forEach((raw) => {
    const line = raw.trim().replace(/^#{1,6}\s+/, '');
    if (!line) return;
    const item = line.match(LIST_ITEM);
    if (item) listed.push(item[1].trim());
    else if (!LEAD_IN.test(line)) prose.push(line);
  });
  const summary: string[] = [];
  const actions: string[] = [];
  sentences(prose.join(' ')).forEach((x, i) => (i > 0 && ACTION_WORDS.test(x) ? actions : summary).push(x));
  return { summary, actions: [...actions, ...listed] };
};
