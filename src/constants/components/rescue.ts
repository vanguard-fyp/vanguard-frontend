// ─── Rescue Operations Constants ─────────────────────────────────────────────

export const riskColors: Record<string, string> = {
  Low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  High: 'text-red-700 bg-red-50 border-red-200',
};

export const milestones = ['Mobilised', 'En Route', 'On Site', 'Executing', 'Completed'];

export const steps = ['Select Incident', 'AI Recommendation', 'Mission Brief', 'Confirm & Dispatch'] as const;