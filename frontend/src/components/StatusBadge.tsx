import { Badge } from '@/components/ui/badge';
import type { RequestStatus, BidStatus, BookingStatus, ComplaintStatus, VerificationRequest } from '@/types';

type AllStatus = RequestStatus | BidStatus | BookingStatus | ComplaintStatus | VerificationRequest['status'];

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-primary/20 text-primary border-primary/30' },
  pending: { label: 'Pending', className: 'bg-primary/20 text-primary border-primary/30' },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  in_review: { label: 'In Review', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  disputed: { label: 'Disputed', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  completed: { label: 'Completed', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  accepted: { label: 'Accepted', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  approved: { label: 'Approved', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  revoked: { label: 'Revoked', className: 'bg-destructive/20 text-red-400 border-destructive/30' },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  declined: { label: 'Declined', className: 'bg-destructive/20 text-red-400 border-destructive/30' },
  rejected: { label: 'Rejected', className: 'bg-destructive/20 text-red-400 border-destructive/30' },
  withdrawn: { label: 'Withdrawn', className: 'bg-muted text-muted-foreground border-border' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
  dismissed: { label: 'Dismissed', className: 'bg-muted text-muted-foreground border-border' },
  upcoming: { label: 'Upcoming', className: 'bg-primary/20 text-primary border-primary/30' },
  awarded: { label: 'Awarded', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

export const StatusBadge = ({ status }: { status: AllStatus }) => {
  const config = statusConfig[status] || { label: status, className: '' };
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
};
