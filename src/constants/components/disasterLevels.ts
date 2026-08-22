export const disasterLevelInfo: Record<
  string,
  { short: string; desc: string; color: string; headerColor: string }
> = {
  'Level 1: District': {
    short: 'District',
    desc: 'District-level response managed by District Disaster Committee. Local emergency services handle response.',
    color: 'border-blue-200 bg-blue-50/40',
    headerColor: 'text-blue-900',
  },
  'Level 2: State': {
    short: 'State',
    desc: 'State-level coordination. State Disaster Committee activated. Cross-district resources mobilized.',
    color: 'border-purple-200 bg-purple-50/40',
    headerColor: 'text-purple-900',
  },
  'Level 3: Federal': {
    short: 'Federal',
    desc: 'Federal-level coordination. NADMA assumes command. Military & SMART assets deployed under Directive 20.',
    color: 'border-rose-300 bg-rose-50/60',
    headerColor: 'text-rose-900',
  },
};