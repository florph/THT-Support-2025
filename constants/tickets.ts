// Shared ticket status presentation. The backend never returns a literal
// "open" status (open tickets are new / pending_tht / pending_customer), so
// callers must not key styling off `status === 'open'`.

export type StatusMeta = {
  label: string;
  bgColor: string; // rgba for translucent badge backgrounds
  textColor: string; // hex
};

const DEFAULT_META: StatusMeta = {
  label: 'Unknown',
  bgColor: 'rgba(107, 114, 128, 0.2)',
  textColor: '#9ca3af',
};

const STATUS_META: Record<string, StatusMeta> = {
  new: { label: 'New', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#60a5fa' },
  pending_tht: { label: 'Pending THT', bgColor: 'rgba(234, 179, 8, 0.2)', textColor: '#facc15' },
  pending_customer: {
    label: 'Pending Customer',
    bgColor: 'rgba(168, 85, 247, 0.2)',
    textColor: '#c084fc',
  },
  closed: { label: 'Closed', bgColor: 'rgba(107, 114, 128, 0.2)', textColor: '#9ca3af' },
};

export function getStatusMeta(status?: string | null): StatusMeta {
  if (!status) return DEFAULT_META;
  return STATUS_META[status] ?? { ...DEFAULT_META, label: status.replace(/_/g, ' ').toUpperCase() };
}

export type PriorityMeta = {
  bgColor: string;
  textColor: string;
};

export function getPriorityMeta(priority?: string | null): PriorityMeta {
  switch (priority) {
    case 'high':
    case 'urgent':
      return { bgColor: 'rgba(239, 68, 68, 0.2)', textColor: '#f87171' };
    case 'medium':
      return { bgColor: 'rgba(234, 179, 8, 0.2)', textColor: '#facc15' };
    default:
      return { bgColor: 'rgba(34, 197, 94, 0.2)', textColor: '#4ade80' };
  }
}
