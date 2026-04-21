import { useEffect, useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CategoryPill } from '@/components/CategoryPill';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { CATEGORIES, type ServiceCategory, type Service } from '@/types';
import { Plus, Pencil, Trash2, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';

type ServiceForm = {
  title: string;
  description: string;
  price: number;
  priceType: 'fixed' | 'hourly' | 'starting_at';
  category: string;
  duration?: string;
};

const ProviderServicesPage = () => {
  const { user } = useAuthStore();
  const { providers, addService, updateService, removeService } = useDataStore();
  const { t } = useLanguage();
  const provider = providers.find((p) => p.userId === user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const serviceSchema = z.object({
    title: z.string().min(3, t('services.validation.title_min')),
    description: z.string().min(10, t('services.validation.description_min')),
    price: z.coerce.number().min(1, t('services.validation.price_min')),
    priceType: z.enum(['fixed', 'hourly', 'starting_at']),
    category: z.string().min(1, t('services.validation.category')),
    duration: z.string().optional(),
  });

  const priceTypeLabels: Record<string, string> = {
    fixed: t('services.price_type.fixed'),
    hourly: t('services.price_type.hourly'),
    starting_at: t('services.price_type.starting_at'),
  };

  const form = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { title: '', description: '', price: 0, priceType: 'fixed', category: provider?.category ?? '', duration: '' },
  });

  useEffect(() => {
    if (!provider) {
      return;
    }

    form.setValue('category', provider.category, { shouldValidate: true });
  }, [form, provider]);

  const resetForm = (service?: Service | null) => {
    form.reset({
      title: service?.title ?? '',
      description: service?.description ?? '',
      price: service?.price ?? 0,
      priceType: service?.priceType ?? 'fixed',
      category: provider?.category ?? '',
      duration: service?.duration ?? '',
    });
  };

  const { isLoading } = useSkeletonLoading();

  if (isLoading) {
    return <PageTransition><div className="space-y-6 p-6"><div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div></div></PageTransition>;
  }

  if (!provider) {
    return <PageTransition><div className="p-6 text-center text-muted-foreground">{t('services.provider_not_found')}</div></PageTransition>;
  }

  const onSubmit = async (data: ServiceForm) => {
    if (editingService) {
      await updateService(provider.id, editingService.id, {
        title: data.title,
        description: data.description,
        price: data.price,
        priceType: data.priceType,
        category: provider.category,
        duration: data.duration || undefined,
      });
      toast.success(t('services.updated'));
    } else {
      const newService: Service = {
        id: `s-${Date.now()}`,
        providerId: provider.id,
        title: data.title,
        description: data.description,
        price: data.price,
        priceType: data.priceType,
        category: provider.category,
        duration: data.duration || undefined,
      };
      await addService(provider.id, newService);
      toast.success(t('services.added'));
    }

    resetForm();
    setEditingService(null);
    setDialogOpen(false);
  };

  const handleDelete = async (serviceId: string) => {
    await removeService(provider.id, serviceId);
    toast.success(t('services.removed'));
  };

  const handleCreate = () => {
    setEditingService(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    resetForm(service);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingService(null);
      resetForm();
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('services.title')}</h1>
            <p className="text-muted-foreground">{provider.services.length} {t('services.listed')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> {t('services.add')}</Button>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>{editingService ? t('services.edit_dialog') : t('services.add_dialog')}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>{t('services.field.title')}</FormLabel><FormControl><Input placeholder={t('services.placeholder.title')} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>{t('services.field.description')}</FormLabel><FormControl><Textarea placeholder={t('services.placeholder.description')} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem><FormLabel>{t('services.field.price')}</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="priceType" render={({ field }) => (
                      <FormItem><FormLabel>{t('services.field.price_type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">{t('services.price_type.fixed')}</SelectItem><SelectItem value="hourly">{t('services.price_type.hourly')}</SelectItem><SelectItem value="starting_at">{t('services.price_type.starting_at')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('services.field.category')}</FormLabel>
                        <FormControl>
                          <Input value={`${CATEGORIES.find((categoryOption) => categoryOption.value === provider.category)?.icon ?? ''} ${t(`cat.${provider.category}` as const)}`.trim()} disabled readOnly />
                        </FormControl>
                        <input type="hidden" value={field.value} readOnly />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="duration" render={({ field }) => (
                      <FormItem><FormLabel>{t('services.field.duration')}</FormLabel><FormControl><Input placeholder={t('services.placeholder.duration')} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full">{editingService ? t('update') : t('services.add')}</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {provider.services.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                  </div>
                  <CategoryPill category={s.category} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${s.price} <span className="text-xs">({priceTypeLabels[s.priceType]})</span></span>
                  {s.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(s)}><Pencil className="mr-1 h-3 w-3" /> {t('edit')}</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-3 w-3" /> {t('delete')}</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>{t('services.delete_title')}</AlertDialogTitle><AlertDialogDescription>{t('services.delete_desc')} "{s.title}".</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => void handleDelete(s.id)}>{t('delete')}</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {provider.services.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p>{t('services.no_services')}</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default ProviderServicesPage;
