import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { RequireAuth } from '@/components/RouteGuards';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CategoryPill } from '@/components/CategoryPill';
import { StatusBadge } from '@/components/StatusBadge';
import { ReviewDialog } from '@/components/ReviewDialog';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, type ServiceCategory, type RequestStatus, type ServiceRequest } from '@/types';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { Plus, MapPin, Calendar, MessageSquare, Star, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TranslationKey } from '@/i18n/translations';

const schema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(500),
  category: z.string().min(1, 'Select a category'),
  budget: z.coerce.number().min(1, 'Budget must be positive'),
  location: z.string().trim().min(2, 'Location is required').max(100),
  urgency: z.enum(['low', 'medium', 'high']),
  preferredTime: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type RenderFormFieldsInput = {
  register: ReturnType<typeof useForm<FormData>>['register'];
  control: ReturnType<typeof useForm<FormData>>['control'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
};

const urgencyColors: Record<string, string> = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-destructive/20 text-red-400 border-destructive/30',
};

const MyRequestsPage = () => {
  const { user } = useAuthStore();
  const { requests, bids, reviews, addRequest, updateRequest, deleteRequest } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();
  const [open, setOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewProviderId, setReviewProviderId] = useState('');
  const [reviewRequestId, setReviewRequestId] = useState('');

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ServiceRequest | null>(null);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const myRequests = requests.filter((r) => r.clientId === user?.id);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { urgency: 'medium' },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const newReq: ServiceRequest = {
      id: `r${Date.now()}`,
      clientId: user!.id,
      clientName: user!.name,
      title: data.title,
      description: data.description,
      category: data.category as ServiceCategory,
      budget: data.budget,
      location: data.location,
      status: 'open',
      urgency: data.urgency,
      createdAt: new Date().toISOString().split('T')[0],
      bidsCount: 0,
      preferredTime: data.preferredTime || undefined,
    };
    const created = await addRequest(newReq);
    if (!created) {
      toast.error(t('requests.post_error') || 'Could not post request.');
      return;
    }

    toast.success(t('requests.post_success'));
    reset();
    setOpen(false);
  };

  const openEditDialog = (req: ServiceRequest) => {
    setEditingRequest(req);
    editForm.reset({
      title: req.title,
      description: req.description,
      category: req.category,
      budget: req.budget,
      location: req.location,
      urgency: req.urgency,
      preferredTime: req.preferredTime || '',
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (data: FormData) => {
    if (!editingRequest) return;
    await updateRequest(editingRequest.id, {
      title: data.title,
      description: data.description,
      category: data.category as ServiceCategory,
      budget: data.budget,
      location: data.location,
      urgency: data.urgency,
      preferredTime: data.preferredTime || undefined,
    });
    toast.success(t('requests.edit_success'));
    setEditOpen(false);
    setEditingRequest(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteRequest(deleteId);
    toast.success(t('requests.delete_success'));
    setDeleteId(null);
  };

  const filterByStatus = (status: RequestStatus | 'all') =>
    status === 'all' ? myRequests : myRequests.filter((r) => r.status === status);

  const canReview = (req: ServiceRequest) => {
    if (req.status !== 'completed') return false;
    const acceptedBid = bids.find((b) => b.requestId === req.id && b.status === 'accepted');
    if (!acceptedBid) return false;
    return !reviews.some((r) => r.providerId === acceptedBid.providerId && r.clientId === user?.id);
  };

  const getProviderIdForRequest = (req: ServiceRequest): string => {
    const acceptedBid = bids.find((b) => b.requestId === req.id && b.status === 'accepted');
    return acceptedBid?.providerId || '';
  };

  const renderFormFields = ({ register: reg, control: ctrl, errors: errs }: RenderFormFieldsInput, isEdit = false) => {
    return (
      <>
        <div>
          <Label>{t('requests.field.title')}</Label>
          <Input {...reg('title')} placeholder={t('requests.placeholder.title')} />
          {errs.title && <p className="text-sm text-destructive mt-1">{errs.title.message}</p>}
        </div>
        <div>
          <Label>{t('requests.field.description')}</Label>
          <Textarea {...reg('description')} placeholder={t('requests.placeholder.description')} />
          {errs.description && <p className="text-sm text-destructive mt-1">{errs.description.message}</p>}
        </div>
        <div>
          <Label>{t('requests.field.category')}</Label>
          <Controller name="category" control={ctrl} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger><SelectValue placeholder={t('requests.placeholder.category')} /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.icon} {t(`cat.${c.value}` as TranslationKey)}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errs.category && <p className="text-sm text-destructive mt-1">{errs.category.message}</p>}
        </div>
        <div>
          <Label>{t('requests.field.budget')}</Label>
          <Input type="number" {...reg('budget')} placeholder={t('requests.placeholder.budget')} />
          {errs.budget && <p className="text-sm text-destructive mt-1">{errs.budget.message}</p>}
        </div>
        <div>
          <Label>{t('requests.field.location')}</Label>
          <Input {...reg('location')} placeholder={t('requests.placeholder.location')} />
          {errs.location && <p className="text-sm text-destructive mt-1">{errs.location.message}</p>}
        </div>
        <div>
          <Label>{t('requests.field.preferred_time')}</Label>
          <Input {...reg('preferredTime')} placeholder={t('requests.placeholder.preferred_time')} />
        </div>
        <div>
          <Label>{t('requests.field.urgency')}</Label>
          <Controller name="urgency" control={ctrl} render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4 mt-2">
              {(['low', 'medium', 'high'] as const).map((u) => (
                <div key={u} className="flex items-center gap-2">
                  <RadioGroupItem value={u} id={`${isEdit ? 'edit-' : ''}${u}`} />
                  <Label htmlFor={`${isEdit ? 'edit-' : ''}${u}`} className="cursor-pointer">{t(`urgency.${u}` as TranslationKey)}</Label>
                </div>
              ))}
            </RadioGroup>
          )} />
        </div>
      </>
    );
  };

  if (isLoading) {
    return (
      <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('requests.title')}</h1>
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
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
            <h1 className="text-2xl font-bold">{t('requests.title')}</h1>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />{t('requests.post_new')}</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t('requests.post_dialog_title')}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {renderFormFields({ register, control, errors })}
                  <Button type="submit" className="w-full">{t('requests.post_new')}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              {['all', 'open', 'in_progress', 'completed', 'cancelled'].map((s) => (
                <TabsTrigger key={s} value={s}>{t(`status.${s.replace('_', '_')}` as TranslationKey)}</TabsTrigger>
              ))}
            </TabsList>
            {['all', 'open', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <TabsContent key={status} value={status} className="space-y-3 mt-4">
                {filterByStatus(status as RequestStatus | 'all').length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{t('requests.no_requests')}</p>
                ) : (
                  filterByStatus(status as RequestStatus | 'all').map((r) => (
                    <Card key={r.id} className="border-border bg-card">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{r.title}</span>
                            <StatusBadge status={r.status} />
                            <Badge variant="outline" className={urgencyColors[r.urgency]}>{t(`urgency.${r.urgency}` as TranslationKey)}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <CategoryPill category={r.category} />
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{r.createdAt}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="font-semibold text-primary">${r.budget}</span>
                          <span className="flex items-center gap-1 text-muted-foreground"><MessageSquare className="h-3 w-3" />{r.bidsCount} {t('requests.bids')}</span>
                          {r.status === 'open' && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => openEditDialog(r)} className="gap-1">
                                <Edit className="h-3 w-3" /> {t('edit')}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setDeleteId(r.id)} className="gap-1">
                                <Trash2 className="h-3 w-3" /> {t('delete')}
                              </Button>
                            </>
                          )}
                          {canReview(r) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => {
                                setReviewProviderId(getProviderIdForRequest(r));
                                setReviewRequestId(r.id);
                                setReviewOpen(true);
                              }}
                            >
                              <Star className="h-3 w-3" /> {t('requests.review')}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Edit Request Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('requests.edit_dialog_title')}</DialogTitle></DialogHeader>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                {renderFormFields({ register: editForm.register, control: editForm.control, errors: editForm.formState.errors }, true)}
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit">{t('update')}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Request Confirm */}
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('requests.delete_title')}</AlertDialogTitle>
                <AlertDialogDescription>{t('requests.delete_desc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleDelete()}>{t('delete')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

          <ReviewDialog
            open={reviewOpen}
            onOpenChange={setReviewOpen}
            providerId={reviewProviderId}
            requestId={reviewRequestId}
          />
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default MyRequestsPage;

