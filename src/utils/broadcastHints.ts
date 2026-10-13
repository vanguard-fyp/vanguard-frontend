/**
 * Instant compose hints for a broadcast title (no AI call, no network): which
 * hazard it is about, the category and severity the wording implies, and what
 * the message should tell the public. The officer applies them or ignores them.
 */
import type { PublicAnnouncement, SeverityLevel } from '../types';

export type BroadcastHazard = 'flood' | 'landslide' | 'storm' | 'haze' | 'fire' | 'earthquake' | 'other';

export interface BroadcastHints {
  hazard: BroadcastHazard;
  hazardLabel: string | null;
  category: PublicAnnouncement['category'] | null;
  severity: SeverityLevel | null;
  /** what a good message for this hazard / category should contain */
  include: string[];
}

// English and Malay keywords, most specific first.
const HAZARDS: [RegExp, BroadcastHazard, string][] = [
  [/flood|banjir|water level|paras air|river/i, 'flood', 'Flood'],
  [/landslide|tanah runtuh|slope|cerun/i, 'landslide', 'Landslide'],
  [/storm|ribut|wind|angin|cyclone|thunder/i, 'storm', 'Storm / strong wind'],
  [/haze|jerebu|aqi|air quality|kualiti udara|smoke|asap/i, 'haze', 'Haze'],
  [/fire|kebakaran|wildfire|burn/i, 'fire', 'Fire'],
  [/earthquake|gempa|tremor/i, 'earthquake', 'Earthquake'],
];

const INCLUDE: Record<BroadcastHazard, string[]> = {
  flood: ['Which areas are flooded or at risk', 'Move to higher ground / relief centre (PPS)', 'Do not cross floodwater', 'Switch off electricity before leaving'],
  landslide: ['Which slopes or roads are affected', 'Leave homes on or below unstable slopes', 'Road closures and detours'],
  storm: ['When the strong wind is expected', 'Stay indoors, away from trees and power lines', 'Advice for fishermen and boat users'],
  haze: ['Current air quality (AQI) and where', 'Limit outdoor activity; N95 masks', 'School or activity closures, if any'],
  fire: ['Where the fire is and roads closed', 'Stay away; no open burning', 'Smoke advice for people with breathing problems'],
  earthquake: ['Where shaking was felt', 'Check buildings before re-entry', 'Expect aftershocks'],
  other: ['What is happening and where', 'What residents must do now', 'Where to get help'],
};

export function broadcastHints(title: string): BroadcastHints | null {
  const t = title.trim();
  if (t.length < 4) return null;
  const match = HAZARDS.find(([re]) => re.test(t));
  const hazard: BroadcastHazard = match ? match[1] : 'other';

  let category: BroadcastHints['category'] = null;
  if (/evacuat|pindah|pemindahan/i.test(t)) category = 'Evacuation Order';
  else if (/warning|alert|amaran|emergency|kecemasan/i.test(t)) category = 'Emergency Alert';
  else if (/advis|notice|tips|reminder|nasihat|makluman|update/i.test(t)) category = 'Safety Announcement';

  let severity: SeverityLevel | null = null;
  if (/\b(mandatory|immediate(ly)?|now|critical|red|wajib|segera)\b/i.test(t)) severity = 'Critical';
  else if (category === 'Evacuation Order' || category === 'Emergency Alert') severity = 'High';
  else if (category === 'Safety Announcement') severity = 'Medium';

  const include = [...INCLUDE[hazard]];
  if (category === 'Evacuation Order') include.unshift('Where to go and what to bring (IC, medicine, water)');
  include.push('Emergency number 999');
  return { hazard, hazardLabel: match ? match[2] : null, category, severity, include };
}
