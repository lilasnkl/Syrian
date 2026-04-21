import { Skeleton } from '@/components/ui/skeleton';

export const CardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const StatCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-lg" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

export const ListItemSkeleton = () => (
  <div className="rounded-lg border border-border p-4 flex items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-6 w-16 rounded-full" />
  </div>
);

export const ChartSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-5">
    <Skeleton className="h-5 w-40 mb-4" />
    <Skeleton className="h-[250px] w-full rounded-lg" />
  </div>
);

export const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 py-3 border-b border-border/50">
    <Skeleton className="h-4 w-1/4" />
    <Skeleton className="h-4 w-1/6" />
    <Skeleton className="h-4 w-1/6" />
    <Skeleton className="h-4 w-16 rounded-full" />
  </div>
);

export const ProviderCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <Skeleton className="h-32 w-full" />
    <div className="p-4 space-y-3">
      <div className="flex items-end gap-3 -mt-10">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

export const PageSkeletonGrid = ({ count = 4, type = 'card' }: { count?: number; type?: 'card' | 'stat' | 'list' | 'provider' }) => {
  const Component = type === 'stat' ? StatCardSkeleton : type === 'list' ? ListItemSkeleton : type === 'provider' ? ProviderCardSkeleton : CardSkeleton;
  const gridClass = type === 'stat' ? 'grid grid-cols-2 gap-4 lg:grid-cols-4' : type === 'provider' ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-3';

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => <Component key={i} />)}
    </div>
  );
};
