import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { CATEGORIES, type ServiceCategory } from '@/types';

export const CategoryPill = ({ category, onClick }: { category: ServiceCategory; onClick?: () => void }) => {
  const { t } = useLanguage();
  const cat = CATEGORIES.find((c) => c.value === category);
  if (!cat) return null;
  return (
    <Badge
      variant="outline"
      className="cursor-pointer border-border bg-secondary/50 text-secondary-foreground hover:border-primary/50 hover:bg-primary/10 transition-colors"
      onClick={onClick}
    >
      <span className="mr-1">{cat.icon}</span>
      {t(`cat.${cat.value}` as const)}
    </Badge>
  );
};
