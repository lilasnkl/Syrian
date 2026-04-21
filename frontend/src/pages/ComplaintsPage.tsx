import { useState, useMemo } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { RequireAuth } from '@/components/RouteGuards';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { Plus, Calendar, MessageCircle, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/i18n/LanguageContext';
import { COMPLAINT_ISSUE_TYPES } from '@/types';
import type { ComplaintIssueType } from '@/types';

const schema = z.object({
  issueType: z.string().min(1, 'Please select an issue type'),
  providerId: z.string().min(1, 'Please select a provider'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000),
});

type FormData = z.infer<typeof schema>;

const ComplaintsPage = () => {
  const { user } = useAuthStore();
  const { complaints, addComplaint, providers } = useDataStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');

  const myComplaints = complaints.filter((c) => c.userId === user?.id);

  const filteredProviders = useMemo(
    () => providers.filter((p) => p.name.toLowerCase().includes(providerSearch.toLowerCase())),
    [providers, providerSearch]
  );

  const { register, handleSubmit, reset, control, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { issueType: '', providerId: '', description: '' },
  });

  const selectedProviderId = watch('providerId');
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const onSubmit = (data: FormData) => {
    const provider = providers.find((p) => p.id === data.providerId);
    const issueLabel = COMPLAINT_ISSUE_TYPES.find((t) => t.value === data.issueType)?.label || data.issueType;
    addComplaint({
      id: `cmp${Date.now()}`,
      userId: user!.id,
      userName: user!.name,
      providerId: data.providerId,
      providerName: provider?.name || '',
      issueType: data.issueType as ComplaintIssueType,
      subject: issueLabel,
      description: data.description,
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0],
    });
    toast.success(t('complaints.submitted'));
    reset();
    setProviderSearch('');
    setOpen(false);
  };

  if (isLoading) {
    return (
      <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('complaints.title')}</h1>
            <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          </div>
        </PageTransition>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t('complaints.title')}</h1>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { reset(); setProviderSearch(''); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />{t('complaints.submit')}</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t('complaints.dialog_title')}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Issue Type */}
                  <div>
                    <Label>{t('complaints.field.issue_type')}</Label>
                    <Controller
                      name="issueType"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder={t('complaints.placeholder.issue_type')} /></SelectTrigger>
                          <SelectContent>
                            {COMPLAINT_ISSUE_TYPES.map((it) => (
                              <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.issueType && <p className="text-sm text-destructive mt-1">{errors.issueType.message}</p>}
                  </div>

                  {/* Provider Selection */}
                  <div>
                    <Label>{t('complaints.field.provider')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder={t('complaints.placeholder.provider_search')}
                        value={providerSearch}
                        onChange={(e) => setProviderSearch(e.target.value)}
                      />
                    </div>
                    {selectedProvider && (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{selectedProvider.name}</span>
                        <Button type="button" variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => { setValue('providerId', ''); setProviderSearch(''); }}>
                          {t('close')}
                        </Button>
                      </div>
                    )}
                    {!selectedProviderId && providerSearch && (
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover">
                        {filteredProviders.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground">{t('complaints.no_providers')}</p>
                        ) : (
                          filteredProviders.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                              onClick={() => { setValue('providerId', p.id); setProviderSearch(p.name); }}
                            >
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {p.name} — {p.category}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {errors.providerId && <p className="text-sm text-destructive mt-1">{errors.providerId.message}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <Label>{t('complaints.field.description')}</Label>
                    <Textarea {...register('description')} placeholder={t('complaints.placeholder.description')} rows={4} />
                    {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
                  </div>

                  <Button type="submit" className="w-full">{t('submit')}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {myComplaints.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{t('complaints.no_complaints')}</p>
          ) : (
            <div className="space-y-3">
              {myComplaints.map((c) => (
                <Card key={c.id} className="border-border bg-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{c.subject}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    {c.providerName && (
                      <p className="text-xs text-muted-foreground">
                        {t('complaints.against_provider')}: <span className="font-medium text-foreground">{c.providerName}</span>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />{c.createdAt}
                    </div>
                    {c.response && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <MessageCircle className="h-3 w-3" /> {t('complaints.admin_response')}
                        </div>
                        <p className="text-sm">{c.response}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default ComplaintsPage;
