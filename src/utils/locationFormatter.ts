/**
 * Standardize and clean Malaysian location presentation.
 * Prevents repeating the district and state if the specific location string already contains them.
 */
export function formatFullLocation(
  location?: string | null,
  district?: string | null,
  state?: string | null,
  adminDistrict?: string | null
): string {
  const cleanLoc = (location || '').trim();
  // A precise district/town (e.g. Mentakab) is followed by its administrative
  // district (e.g. Temerloh) when the two differ.
  const admin = (adminDistrict || '').trim();
  const dist = (district || '').trim();
  const cleanDist = admin && admin.toLowerCase() !== dist.toLowerCase() ? [dist, admin].filter(Boolean).join(', ') : dist;
  const cleanState = (state || '').trim();

  if (!cleanLoc) {
    return [cleanDist, cleanState].filter(Boolean).join(', ') || 'Unspecified Location';
  }

  const parts = cleanLoc
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const locLower = cleanLoc.toLowerCase();
  const distLower = cleanDist.toLowerCase();
  const stateLower = cleanState.toLowerCase();

  const resultParts = [...parts];

  // Append district if not already included in location
  if (cleanDist && !locLower.includes(distLower)) {
    resultParts.push(cleanDist);
  }

  // Append state if not already included in location
  if (cleanState && !locLower.includes(stateLower)) {
    resultParts.push(cleanState);
  }

  // Remove contiguous duplicates if any
  const deduplicated: string[] = [];
  for (const p of resultParts) {
    if (deduplicated.length === 0 || deduplicated[deduplicated.length - 1].toLowerCase() !== p.toLowerCase()) {
      deduplicated.push(p);
    }
  }

  return deduplicated.join(', ');
}
