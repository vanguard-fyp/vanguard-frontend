const STATUS_ORDER = ['Pending', 'Acknowledged', 'Dispatched'];

type QueueRequest = { status: string; created_at?: string; createdAt?: string };

const receivedAt = (r: QueueRequest) => Date.parse(r.created_at ?? r.createdAt ?? '') || 0;
const rank = (r: QueueRequest) => {
  const i = STATUS_ORDER.indexOf(r.status);
  return i < 0 ? STATUS_ORDER.length : i;
};

/** Work order: least-handled status first, longest-waiting first; closed requests last, newest first. */
export function sortSosQueue<T extends QueueRequest>(requests: T[]): T[] {
  return [...requests].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const closed = rank(a) === STATUS_ORDER.length;
    return closed ? receivedAt(b) - receivedAt(a) : receivedAt(a) - receivedAt(b);
  });
}
