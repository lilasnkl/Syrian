import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { ProviderCard } from '@/components/ProviderCard';
import { useDataStore } from '@/stores/data-store';
import { CATEGORIES, type Provider, type ServiceCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { ProviderCardSkeleton } from '@/components/PageSkeleton';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { listProviders } from '@/features/providers/api';
import { mapProviderProfile } from '@/features/providers/mapper';

const ProvidersPage = () => {
  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get('category') as ServiceCategory | null;
  const querySearch = searchParams.get('search') ?? '';
  const { providers } = useDataStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();

  const [search, setSearch] = useState(querySearch);
  const [category, setCategory] = useState<ServiceCategory | 'all'>(queryCategory || 'all');
  const [maxRate, setMaxRate] = useState(200);
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price_low' | 'price_high' | 'experience'>('rating');
  const [providerResults, setProviderResults] = useState<Provider[]>(providers);

  useEffect(() => {
    setSearch(querySearch);
    setCategory(queryCategory || 'all');
  }, [queryCategory, querySearch]);

  useEffect(() => {
    let isCurrent = true;

    const loadProviders = async () => {
      try {
        const payload = await listProviders({
          category: category !== 'all' ? category : undefined,
          minRating: minRating > 0 ? minRating : undefined,
          verified: verifiedOnly ? true : undefined,
          search: search.trim() || undefined,
        });

        if (!isCurrent) {
          return;
        }

        setProviderResults(
          payload.providers.map((provider) => {
            const existingProvider = providers.find((candidate) => candidate.id === String(provider.id));
            return mapProviderProfile(provider, existingProvider?.services ?? []);
          })
        );
      } catch {
        if (!isCurrent) {
          return;
        }

        setProviderResults(providers);
      }
    };

    void loadProviders();

    return () => {
      isCurrent = false;
    };
  }, [category, minRating, providers, search, verifiedOnly]);

  const filtered = useMemo(() => {
    const result = providerResults.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.bio.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (p.hourlyRate > maxRate) return false;
      if (p.rating < minRating) return false;
      if (verifiedOnly && !p.verified) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'price_low': return a.hourlyRate - b.hourlyRate;
        case 'price_high': return b.hourlyRate - a.hourlyRate;
        case 'experience': return b.yearsExperience - a.yearsExperience;
        default: return 0;
      }
    });

    return result;
  }, [search, category, maxRate, minRating, verifiedOnly, sortBy, providerResults]);

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-foreground mb-2 block">{t('providers.category')}</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as ServiceCategory | 'all')}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('providers.all_categories')}</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.icon} {t(`cat.${c.value}` as const)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-foreground mb-2 block">{t('providers.max_rate')}: ${maxRate}</Label>
        <Slider value={[maxRate]} onValueChange={([v]) => setMaxRate(v)} max={200} step={5} className="mt-2" />
      </div>
      <div>
        <Label className="text-foreground mb-2 block">{t('providers.min_rating')}: {minRating}+</Label>
        <Slider value={[minRating]} onValueChange={([v]) => setMinRating(v)} max={5} step={0.5} className="mt-2" />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-foreground">{t('providers.verified_only')}</Label>
        <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
      </div>
    </div>
  );

  return (
    <PageTransition>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t('providers.title')}</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden gap-2"><SlidersHorizontal size={16} /> {t('providers.filters')}</Button>
            </SheetTrigger>
            <SheetContent className="bg-card border-border"><FilterContent /></SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 shrink-0 space-y-6">
            <FilterContent />
          </aside>

          <div className="flex-1 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input placeholder={t('providers.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">{t('providers.sort.top_rated')}</SelectItem>
                  <SelectItem value="price_low">{t('providers.sort.price_low')}</SelectItem>
                  <SelectItem value="price_high">{t('providers.sort.price_high')}</SelectItem>
                  <SelectItem value="experience">{t('providers.sort.experience')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">{filtered.length} {t('providers.found')}</p>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <ProviderCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((p) => <ProviderCard key={p.id} provider={p} />)}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">{t('providers.no_match')}</p>
                <Button variant="ghost" className="mt-2 text-primary" onClick={() => { setCategory('all'); setSearch(''); setMaxRate(200); setMinRating(0); setVerifiedOnly(false); }}>
                  <X size={14} className="mr-1" /> {t('providers.clear_filters')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProvidersPage;


