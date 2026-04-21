import type { ReactNode } from 'react';

import { PageTransition } from '@/components/PageTransition';
import { RequireAuth } from '@/components/RouteGuards';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RatingStars } from '@/components/RatingStars';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Search, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Provider } from '@/types';

type CompareRow = {
  label: string;
  render: (provider: Provider) => ReactNode;
};

const ComparePage = () => {
  const { compareQueue, removeFromCompare } = useUIStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();

  const rows: CompareRow[] = [
    { label: t('compare.rating'), render: (p) => <div className="flex items-center gap-2"><RatingStars rating={p.rating} size={14} /><span className="text-sm">{p.rating}</span></div> },
    { label: t('compare.reviews'), render: (p) => <span>{p.reviewCount}</span> },
    { label: t('compare.hourly_rate'), render: (p) => <span className="text-primary font-semibold">${p.hourlyRate}{t('price.per_hour')}</span> },
    { label: t('compare.experience'), render: (p) => <span>{p.yearsExperience}</span> },
    { label: t('compare.completed_jobs'), render: (p) => <span>{p.completedJobs}</span> },
    { label: t('compare.verified'), render: (p) => p.verified ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-muted-foreground" /> },
    { label: t('compare.skills'), render: (p) => <div className="flex flex-wrap gap-1">{p.skills.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div> },
    { label: t('compare.response_time'), render: (p) => <span>{p.responseTime}</span> },
    { label: t('compare.location'), render: (p) => <span>{p.location}</span> },
  ];

  if (isLoading) {
    return (
      <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('compare.title')}</h1>
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </PageTransition>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <PageTransition>
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">{t('compare.title')}</h1>
          {compareQueue.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-12 text-center space-y-4">
                <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">{t('compare.empty')}</p>
                <Button asChild><Link to="/providers">{t('compare.browse')}</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-3 border-b border-border w-36"></th>
                    {compareQueue.map((p) => (
                      <th key={p.id} className="p-3 border-b border-border min-w-[200px]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={p.avatar} />
                              <AvatarFallback>{p.name[0]}</AvatarFallback>
                            </Avatar>
                            <button onClick={() => removeFromCompare(p.id)} className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5">
                              <X className="h-3 w-3 text-destructive-foreground" />
                            </button>
                          </div>
                          <Link to={`/providers/${p.id}`} className="font-semibold hover:text-primary transition-colors">{p.name}</Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/50">
                      <td className="p-3 text-sm text-muted-foreground font-medium">{row.label}</td>
                      {compareQueue.map((p) => (
                        <td key={p.id} className="p-3 text-center">{row.render(p)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default ComparePage;
