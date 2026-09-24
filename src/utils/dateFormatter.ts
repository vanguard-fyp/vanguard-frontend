/**
 * Unified Date & Time Formatter Utility
 * Provides consistent, localized (en-MY / standard) time strings across all Vanguard modules.
 */

export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  fallback = 'N/A'
): string {
  if (!dateInput) return fallback;

  try {
    let d: Date;
    if (typeof dateInput === 'string') {
      const cleaned = dateInput.trim().replace(' ', 'T');
      d = new Date(cleaned);
    } else {
      d = new Date(dateInput);
    }

    if (isNaN(d.getTime())) {
      return String(dateInput);
    }

    const dateStr = d.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const timeStr = d.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${dateStr} · ${timeStr} MYT`;
  } catch {
    return String(dateInput || fallback);
  }
}

export function formatDateOnly(
  dateInput: string | number | Date | null | undefined,
  fallback = 'N/A'
): string {
  if (!dateInput) return fallback;
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput.trim().replace(' ', 'T')) : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateInput || fallback);
  }
}

export function formatTimeOnly(
  dateInput: string | number | Date | null | undefined,
  fallback = 'N/A'
): string {
  if (!dateInput) return fallback;
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput.trim().replace(' ', 'T')) : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return String(dateInput || fallback);
  }
}

export function formatRelativeTime(
  dateInput: string | number | Date | null | undefined,
  fallback = 'just now'
): string {
  if (!dateInput) return fallback;
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput.trim().replace(' ', 'T')) : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateOnly(d);
  } catch {
    return String(dateInput || fallback);
  }
}
