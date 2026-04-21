import { useParams, useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { RatingStars } from '@/components/RatingStars';
import { CategoryPill } from '@/components/CategoryPill';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDataStore } from '@/stores/data-store';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton, StatCardSkeleton } from '@/components/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, CheckCircle2, Clock, Briefcase, MessageSquare, Star } from 'lucide-react';

const ProviderProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { providers, reviews, startConversation } = useDataStore();
  const provider = providers.find((p) => p.id === id);
  const providerReviews = reviews.filter((r) => r.providerId === id);
  const { isAuthenticated, user } = useAuthStore();
  const { setLoginModalOpen, addToCompare } = useUIStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();
  const isOwnProfile = user?.id === provider?.userId;

  if (isLoading) {
    return (
      <PageTransition>
        <Skeleton className="h-48 w-full" />
        <div className="container py-8 space-y-6">
          <StatCardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (!provider) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">{t('provider.not_found')}</p>
        <Button variant="ghost" className="mt-4 text-primary" onClick={() => navigate('/providers')}>{t('provider.back_to_providers')}</Button>
      </div>
    );
  }

  const handleContact = async () => {
    if (!isAuthenticated) { setLoginModalOpen(true); return; }
    const conversationId = await startConversation(provider.userId);
    navigate(`/chat?conversation=${conversationId}`);
  };

  return (
    <PageTransition>
      {/* Cover */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img src={provider.coverImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="container relative -mt-16 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start gap-4 mb-8">
          <img src={provider.avatar} alt={provider.name} className="h-24 w-24 rounded-2xl border-4 border-background bg-card" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{provider.name}</h1>
              {provider.verified && <Badge className="bg-primary text-primary-foreground border-0 gap-1"><CheckCircle2 size={12} /> {t('provider.verified')}</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><MapPin size={14} /> {provider.location}</span>
              <span className="flex items-center gap-1"><Briefcase size={14} /> {provider.yearsExperience} {t('provider.years_experience')}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {provider.responseTime}</span>
            </div>
            <div className="flex items-center gap-3">
              <RatingStars rating={provider.rating} />
              <span className="text-sm text-muted-foreground">{provider.rating} ({provider.reviewCount} {provider.reviewCount === 1 ? t('reviews.singular') : t('reviews.plural')})</span>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={() => void handleContact()} className="flex-1 md:flex-none gap-2" disabled={isOwnProfile}><MessageSquare size={16} /> {t('provider.contact')}</Button>
            <Button variant="outline" onClick={() => addToCompare(provider)}>{t('provider.compare')}</Button>
          </div>
        </div>

        {/* Sticky price bar */}
        <div className="rounded-xl border border-border bg-card p-4 mb-8 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-primary">${provider.hourlyRate}</span>
            <span className="text-muted-foreground">{t('price.per_hour')}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{provider.completedJobs} {t('provider.jobs_completed')}</span>
            <CategoryPill category={provider.category} />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-secondary border border-border mb-6">
            <TabsTrigger value="overview">{t('provider.overview')}</TabsTrigger>
            <TabsTrigger value="services">{t('provider.services')}</TabsTrigger>
            <TabsTrigger value="reviews">{t('provider.reviews')} ({providerReviews.length})</TabsTrigger>
            <TabsTrigger value="portfolio">{t('provider.portfolio')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg text-foreground mb-3">{t('provider.about')}</h3>
                <p className="text-muted-foreground">{provider.bio}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg text-foreground mb-3">{t('provider.skills')}</h3>
                <div className="flex flex-wrap gap-2">
                  {provider.skills.map((s) => (
                    <Badge key={s} variant="outline" className="border-border bg-secondary/50 text-secondary-foreground">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg text-foreground mb-1">{t('provider.availability')}</h3>
                <p className="text-muted-foreground">{provider.availability}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <div className="grid sm:grid-cols-2 gap-4">
              {provider.services.map((s) => (
                <Card key={s.id} className="border-border bg-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/services/${provider.id}/${s.id}`)}>
                  <CardContent className="p-5">
                    <h4 className="font-display font-semibold text-foreground mb-1">{s.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{s.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-semibold">
                        {s.priceType === 'starting_at' && `${t('price.from')} `}${s.price}{s.priceType === 'hourly' && t('price.per_hour')}
                      </span>
                      {s.duration && <span className="text-xs text-muted-foreground">{s.duration}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {provider.services.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">{t('provider.no_services')}</p>}
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="space-y-4">
              {providerReviews.map((r) => (
                <Card key={r.id} className="border-border bg-card">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <img src={r.clientAvatar} alt={r.clientName} className="h-8 w-8 rounded-full" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.clientName}</p>
                        <p className="text-xs text-muted-foreground">{r.createdAt}</p>
                      </div>
                      <div className="ml-auto"><RatingStars rating={r.rating} size={12} /></div>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.comment}</p>
                  </CardContent>
                </Card>
              ))}
              {providerReviews.length === 0 && <p className="text-muted-foreground text-center py-8">{t('provider.no_reviews')}</p>}
            </div>
          </TabsContent>

          <TabsContent value="portfolio">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {provider.portfolio.map((p) => (
                <Card key={p.id} className="border-border bg-card overflow-hidden">
                  <img src={p.image} alt={p.title} className="h-48 w-full object-cover" />
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-foreground">{p.title}</h4>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </CardContent>
                </Card>
              ))}
              {provider.portfolio.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-8">{t('provider.no_portfolio')}</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default ProviderProfilePage;
