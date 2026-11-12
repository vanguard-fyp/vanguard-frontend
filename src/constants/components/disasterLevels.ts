// Disaster management levels under Arahan NADMA No. 1 (replaced MKN Directive No. 20, Aug 2024).
// The level depends on complexity and magnitude, damage, available resources and response time,
// not only on how many districts or states are affected.
export const disasterLevelInfo: Record<
  string,
  { short: string; desc: string; color: string; headerColor: string }
> = {
  'Level 1: District': {
    short: 'District',
    desc: 'One area or district. Managed by the District Disaster Management Committee (JPBD) without or with limited outside help. Chair: District Officer. Secretariat: district APM.',
    color: 'border-blue-200 bg-blue-50/40',
    headerColor: 'text-blue-900',
  },
  'Level 2: State': {
    short: 'State',
    desc: 'More than one district in the same state. Resources mobilised by the State Disaster Management Committee (JPBN) with limited federal help. Chair: State Secretary. Secretariat: state APM.',
    color: 'border-purple-200 bg-purple-50/40',
    headerColor: 'text-purple-900',
  },
  'Level 3: Federal': {
    short: 'Federal',
    desc: 'More than one state, or complex in nature. Federal coordination and mobilisation by the Federal Disaster Management Committee (JPBP), including foreign aid. Chair: Deputy Prime Minister. Secretariat: NADMA.',
    color: 'border-rose-300 bg-rose-50/60',
    headerColor: 'text-rose-900',
  },
};
