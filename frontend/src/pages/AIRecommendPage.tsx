import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, MapPin, Search, Sparkles } from 'lucide-react';

import { HttpClientError } from '@/api/http-client';
import { PageTransition } from '@/components/PageTransition';
import { ListItemSkeleton, CardSkeleton } from '@/components/PageSkeleton';
import { RequireAuth } from '@/components/RouteGuards';
import { RatingStars } from '@/components/RatingStars';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { recommendProviders } from '@/features/recommendations/api';
import { mapRecommendationResult } from '@/features/recommendations/mapper';
import type { RecommendationResult } from '@/features/recommendations/types';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDataStore } from '@/stores/data-store';
import type { Provider } from '@/types';

function formatLabel(value: string): string {
  if (!value) {
    return '';
  }

  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildRecommendationCard(
  match: RecommendationResult['topProviders'][number],
  providers: Provider[],
  analysisCategory: string,
) {
  const provider = providers.find((candidate) => candidate.id === match.id);

  return {
    id: match.id,
    name: provider?.name ?? match.name,
    avatar:
      provider?.avatar ??
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`provider-${match.id}`)}`,
    verified: provider?.verified ?? false,
    bio: provider?.bio ?? '',
    location: provider?.location ?? '',
    skills: provider?.skills ?? [],
    responseTime: provider?.responseTime ?? '',
    rating: match.rating,
    distance: match.distance,
    priceRange: match.priceRange,
    score: match.score,
    categoryLabel: formatLabel(analysisCategory || provider?.category || ''),
  };
}

const AIRecommendPage = () => {
  const { providers } = useDataStore();
  const { isLoading: skeletonLoading } = useSkeletonLoading();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const examplePrompts = [1, 2, 3, 4, 5, 6].map((index) => t(`ai.prompt.${index}` as const));

  const resultCards = useMemo(
    () =>
      recommendation?.topProviders.map((match) =>
        buildRecommendationCard(match, providers, recommendation.analysis.serviceCategory),
      ) ?? [],
    [providers, recommendation],
  );

  const getErrorMessage = (searchError: unknown) => {
    if (searchError instanceof HttpClientError) {
      if (searchError.message.includes('ollama_unavailable')) {
        return t('ai.error_unavailable');
      }
      if (searchError.message.includes('ollama_analysis_incomplete')) {
        return t('ai.error_incomplete');
      }
      if (searchError.message.includes('validation_error')) {
        return t('ai.error_validation');
      }
    }

    return t('ai.error_general');
  };

  const handleSearch = async (value: string) => {
    const problemDescription = value.trim();
    if (!problemDescription) {
      return;
    }

    setLoading(true);
    setSearched(true);
    setError('');
    setRecommendation(null);

    try {
      const response = await recommendProviders({
        problem_description: problemDescription,
        user_lat: null,
        user_lng: null,
        budget: null,
      });

      setRecommendation(mapRecommendationResult(response));
    } catch (searchError) {
      setError(getErrorMessage(searchError));
    } finally {
      setLoading(false);
    }
  };

  if (skeletonLoading) {
    return (
      <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('ai.title')}</h1>
            <CardSkeleton />
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}</div>
          </div>
        </PageTransition>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('ai.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('ai.subtitle')}</p>

          <div className="space-y-3">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ai.placeholder')}
              rows={3}
              className="text-base"
            />
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setQuery(prompt);
                    void handleSearch(prompt);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <Button onClick={() => void handleSearch(query)} disabled={!query.trim() || loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {loading ? t('ai.analyzing') : t('ai.find')}
            </Button>
          </div>

          {loading && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">{t('ai.analyzing')}</p>
            </div>
          )}

          {searched && !loading && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('ai.error_title')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {searched && !loading && recommendation && (
            <div className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('ai.analysis')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('ai.service_category')}</p>
                      <p className="mt-1 font-medium">{formatLabel(recommendation.analysis.serviceCategory) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('ai.provider_type')}</p>
                      <p className="mt-1 font-medium">{formatLabel(recommendation.analysis.providerType) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('ai.likely_issue')}</p>
                      <p className="mt-1 font-medium">{recommendation.analysis.likelyIssue}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('ai.urgency')}</p>
                      <p className="mt-1 font-medium">{formatLabel(recommendation.analysis.urgency)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('ai.suggested_solution')}</p>
                    <p className="mt-1 font-medium leading-7">{recommendation.analysis.suggestedSolution}</p>
                  </div>

                  {recommendation.analysis.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recommendation.analysis.keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('ai.quick_tips')}</p>
                    <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                      {recommendation.analysis.quickTips.map((tip) => (
                        <li key={tip} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold">{t('ai.recommended')}</h2>
                {resultCards.map((provider) => (
                  <Link key={provider.id} to={`/providers/${provider.id}`}>
                    <Card className="border-border bg-card hover:bg-muted/20 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={provider.avatar} />
                          <AvatarFallback>{provider.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{provider.name}</span>
                            {provider.verified && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                            {provider.categoryLabel && <Badge variant="outline">{provider.categoryLabel}</Badge>}
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                              {t('ai.match_score')}: {Math.round(provider.score * 100)}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            <RatingStars rating={provider.rating} size={12} />
                            <span>{provider.rating.toFixed(1)}</span>
                            {provider.location && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{provider.location}</span>
                            )}
                            {provider.distance > 0 && <span>{t('ai.distance')}: {provider.distance.toFixed(1)} km</span>}
                          </div>
                          {provider.bio && <p className="text-sm text-muted-foreground line-clamp-2">{provider.bio}</p>}
                          {provider.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {provider.skills.slice(0, 4).map((skill) => <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>)}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-primary font-semibold">{provider.priceRange || '-'}</p>
                          {provider.responseTime && <p className="text-xs text-muted-foreground">{provider.responseTime}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {resultCards.length === 0 && (
                  <Card className="border-dashed border-border bg-card/60">
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      {t('ai.no_results')}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default AIRecommendPage;
