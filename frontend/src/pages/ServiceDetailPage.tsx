import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CategoryPill } from '@/components/CategoryPill';
import { RatingStars } from '@/components/RatingStars';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useDataStore } from '@/stores/data-store';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton, StatCardSkeleton } from '@/components/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, CheckCircle2, DollarSign, ArrowLeft, Star, User } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import type { ServiceRequest } from '@/types';

const ServiceDetailPage = () => {
  const { providerId, serviceId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { setLoginModalOpen } = useUIStore();
  const { providers, addRequest, reviews } = useDataStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();

  const provider = providers.find((p) => p.id === providerId);
  const service = provider?.services.find((s) => s.id === serviceId);

  const [requestOpen, setRequestOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [desiredBudget, setDesiredBudget] = useState('');

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container max-w-3xl py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <CardSkeleton />
          <StatCardSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (!provider || !service) {
    return (
      <PageTransition>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">{t('service_detail.not_found')}</p>
          <Button variant="ghost" className="mt-4 text-primary" onClick={() => navigate('/')}>{t('service_detail.back_home')}</Button>
        </div>
      </PageTransition>
    );
  }

  const handleRequest = () => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    setRequestOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!user || !description.trim()) return;
    const newReq: ServiceRequest = {
      id: `r${Date.now()}`,
      clientId: user.id,
      clientName: user.name,
      title: service.title,
      description: description.trim(),
      category: service.category,
      backendCategory: service.backendCategory ?? service.category,
      budget: desiredBudget ? Number(desiredBudget) : service.price,
      location: preferredLocation || provider.location,
      status: 'open',
      urgency: 'medium',
      createdAt: new Date().toISOString().split('T')[0],
      bidsCount: 0,
      serviceId: service.id,
      preferredTime: preferredTime || undefined,
    };
    const created = await addRequest(newReq);
    if (!created) {
      toast.error(t('service_detail.post_error'));
      return;
    }

    toast.success(t('service_detail.submitted'));
    setRequestOpen(false);
    setDescription('');
    setPreferredTime('');
    setPreferredLocation('');
    setDesiredBudget('');
  };

  return (
    <PageTransition>
      <div className="container max-w-3xl py-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('service_detail.back')}
        </Button>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <CategoryPill category={service.category} />
            {service.duration && <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{service.duration}</Badge>}
          </div>
          <h1 className="text-3xl font-bold mb-2">{service.title}</h1>
          <p className="text-muted-foreground text-lg">{service.description}</p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold text-primary">
                {service.priceType === 'starting_at' && `${t('price.from')} `}${service.price}
                {service.priceType === 'hourly' && t('price.per_hour')}
              </span>
              <span className="text-sm text-muted-foreground ml-2">{t(`services.price_type.${service.priceType}` as const)}</span>
            </div>
            <Button size="lg" onClick={handleRequest}>{t('service_detail.request')}</Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">{t('service_detail.provider')}</h3>
            <Link to={`/providers/${provider.id}`} className="flex items-center gap-4 group">
              <img src={provider.avatar} alt={provider.name} className="h-14 w-14 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold group-hover:text-primary transition-colors">{provider.name}</span>
                  {provider.verified && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <RatingStars rating={provider.rating} size={12} />
                  <span>{provider.rating} ({provider.reviewCount} {provider.reviewCount === 1 ? t('reviews.singular') : t('reviews.plural')})</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{provider.location}</span>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Ratings & Reviews */}
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">{t('service_detail.ratings_reviews')}</h3>
            {(() => {
              const providerReviews = reviews.filter(r => r.providerId === provider.id);
              const avgRating = providerReviews.length > 0
                ? Math.round((providerReviews.reduce((acc, r) => acc + r.rating, 0) / providerReviews.length) * 10) / 10
                : 0;

              if (providerReviews.length === 0) {
                return <p className="text-muted-foreground text-sm">{t('service_detail.no_reviews')}</p>;
              }

              return (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-bold text-primary">{avgRating}</span>
                     <div>
                       <RatingStars rating={avgRating} size={18} />
                       <p className="text-sm text-muted-foreground mt-1">{providerReviews.length} {providerReviews.length === 1 ? t('reviews.singular') : t('reviews.plural')}</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                    {providerReviews.map((review) => (
                      <div key={review.id} className="border border-border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-sm">{review.clientName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{review.createdAt}</span>
                        </div>
                        <RatingStars rating={review.rating} size={14} />
                        {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('service_detail.request_title')} {service.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('service_detail.what_need')} *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('service_detail.what_need_placeholder')}
                  rows={4}
                />
              </div>
              <div>
                <Label>{t('service_detail.preferred_time')}</Label>
                <Input
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder={t('service_detail.preferred_time_placeholder')}
                />
              </div>
              <div>
                <Label>{t('service_detail.location')}</Label>
                <Input
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  placeholder={t('service_detail.location_placeholder')}
                />
              </div>
              <div>
                <Label>{t('service_detail.desired_budget')}</Label>
                <Input
                  type="number"
                  value={desiredBudget}
                  onChange={(e) => setDesiredBudget(e.target.value)}
                  placeholder={`${service.price}`}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestOpen(false)}>{t('cancel')}</Button>
              <Button onClick={() => void handleSubmitRequest()} disabled={!description.trim()}>{t('service_detail.submit')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default ServiceDetailPage;
