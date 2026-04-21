import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/RatingStars';
import { useLanguage } from '@/i18n/LanguageContext';
import { MapPin, CheckCircle2, GitCompareArrows } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import type { Provider } from '@/types';
import { motion } from 'framer-motion';

export const ProviderCard = ({ provider }: { provider: Provider }) => {
  const navigate = useNavigate();
  const { addToCompare, compareQueue, removeFromCompare } = useUIStore();
  const { t } = useLanguage();
  const isInCompare = compareQueue.some((p) => p.id === provider.id);

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className="group cursor-pointer overflow-hidden border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.15)]"
        onClick={() => navigate(`/providers/${provider.id}`)}
      >
        <div className="relative h-32 overflow-hidden">
          <img src={provider.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          {provider.verified && (
            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0 gap-1">
              <CheckCircle2 size={12} /> {t('provider.verified')}
            </Badge>
          )}
        </div>
        <CardContent className="relative -mt-8 p-4">
          <div className="flex items-end gap-3 mb-3">
            <img src={provider.avatar} alt={provider.name} className="h-14 w-14 rounded-full border-2 border-card bg-card" />
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-foreground truncate">{provider.name}</h3>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={12} /> {provider.location}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <RatingStars rating={provider.rating} size={14} />
            <span className="text-sm text-muted-foreground">({provider.reviewCount})</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{provider.bio}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">${provider.hourlyRate}{t('price.per_hour')}</span>
            <Button
              variant="ghost"
              size="sm"
              className={isInCompare ? 'text-primary' : 'text-muted-foreground'}
              onClick={(e) => {
                e.stopPropagation();
                if (isInCompare) {
                  removeFromCompare(provider.id);
                } else {
                  addToCompare(provider);
                }
              }}
            >
              <GitCompareArrows size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

