import { Button } from '@/components/ui/button';
import { ProviderCard } from '@/components/ProviderCard';
import { HeroParticles } from '@/components/HeroParticles';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { CATEGORIES } from '@/types';
import { useNavigate, Navigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { PageSkeletonGrid, ProviderCardSkeleton } from '@/components/PageSkeleton';
import { ArrowRight, CheckCircle2, Search, MessageSquare, Shield, Users, Star, Zap, DollarSign, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TranslationKey } from '@/i18n/translations';

const Index = () => {
  const navigate = useNavigate();
  const { setLoginModalOpen } = useUIStore();
  const { isAuthenticated, user } = useAuthStore();
  const { providers } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();

  // Role-based redirects
  if (isAuthenticated && user) {
    if (user.status === 'blocked') return null;
    if (user.role === 'provider') return <Navigate to="/provider/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  }

  const featuredProviders = providers.some((provider) => provider.featured)
    ? providers.filter((provider) => provider.featured)
    : [...providers].sort((a, b) => b.rating - a.rating).slice(0, 4);

  const allServices = providers.flatMap((p) =>
    p.services.map((s) => ({ ...s, providerName: p.name, providerId: p.id }))
  ).slice(0, 8);

  const getCatLabel = (value: string) => t(`cat.${value}` as TranslationKey);

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <HeroParticles />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="container relative z-10 text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <Zap size={14} /> {t('app.tagline')}
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
              {t('hero.title_1')}
              <span className="text-primary">{t('hero.title_2')}</span>
              {t('hero.title_3')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2 px-8 text-base" onClick={() => navigate('/providers')}>
                {t('hero.browse_providers')} <ArrowRight size={18} />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8 text-base" onClick={() => {
                const section = document.getElementById('popular-services');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
                else navigate('/providers');
              }}>
                {t('hero.browse_services')} <ArrowRight size={18} />
              </Button>
              {!isAuthenticated && (
                <Button size="lg" variant="secondary" className="gap-2 px-8 text-base" onClick={() => setLoginModalOpen(true)}>
                  {t('hero.post_request')}
                </Button>
              )}
            </div>
          </motion.div>

          <motion.div
            className="flex items-center justify-center gap-8 mt-12 text-muted-foreground"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 text-sm"><Users size={16} /> <span><strong className="text-foreground">{t('hero.providers_count')}</strong></span></div>
            <div className="flex items-center gap-2 text-sm"><Star size={16} /> <span><strong className="text-foreground">{t('hero.avg_rating')}</strong></span></div>
            <div className="flex items-center gap-2 text-sm"><Shield size={16} /> <span><strong className="text-foreground">{t('hero.verified')}</strong></span></div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 border-t border-border">
        <div className="container">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-foreground mb-10">{t('categories.title')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/providers?category=${cat.value}`)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-sm font-medium text-foreground">{getCatLabel(cat.value)}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Top Providers */}
      <section className="py-16 border-t border-border">
        <div className="container">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t('section.top_providers')}</h2>
            <Button variant="ghost" className="text-primary gap-1" onClick={() => navigate('/providers')}>
              {t('view_all')} <ArrowRight size={16} />
            </Button>
          </div>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <ProviderCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProviders.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popular Services */}
      <section id="popular-services" className="py-16 border-t border-border">
        <div className="container">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-10">{t('section.popular_services')}</h2>
          {isLoading ? (
            <PageSkeletonGrid count={4} type="card" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allServices.map((s) => (
                <motion.div key={`${s.providerId}-${s.id}`} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                  <Card
                    className="cursor-pointer border-border bg-card hover:border-primary/30 transition-all hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.15)]"
                    onClick={() => navigate(`/services/${s.providerId}/${s.id}`)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground">{s.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <DollarSign className="h-3.5 w-3.5" />
                          {s.priceType === 'starting_at' && `${t('price.from')} `}${s.price}{s.priceType === 'hourly' && t('price.per_hour')}
                        </span>
                        {s.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{t('index.by')} <span className="text-foreground font-medium">{s.providerName}</span></p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-4xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-foreground mb-12">{t('how.title')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search, titleKey: 'how.step1_title' as TranslationKey, descKey: 'how.step1_desc' as TranslationKey },
              { icon: MessageSquare, titleKey: 'how.step2_title' as TranslationKey, descKey: 'how.step2_desc' as TranslationKey },
              { icon: CheckCircle2, titleKey: 'how.step3_title' as TranslationKey, descKey: 'how.step3_desc' as TranslationKey },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <step.icon size={24} />
                </div>
                <div className="mb-1 text-sm font-mono text-primary">{t('how.step')} {i + 1}</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{t(step.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(step.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-4xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-foreground mb-12">{t('section.testimonials')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: t('testimonial.1.name'), text: t('testimonial.1.text'), rating: 5 },
              { name: t('testimonial.2.name'), text: t('testimonial.2.text'), rating: 5 },
              { name: t('testimonial.3.name'), text: t('testimonial.3.text'), rating: 4 },
            ].map((review, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} size={14} className="fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-3">"{review.text}"</p>
                <p className="text-sm font-medium text-foreground">— {review.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-foreground">
            <Zap className="text-primary" size={18} /> {t('app.name')}
          </div>
          <p className="text-sm text-muted-foreground">{t('app.copyright')}</p>
        </div>
      </footer>
    </PageTransition>
  );
};

export default Index;
