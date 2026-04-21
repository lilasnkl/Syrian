import { Star } from 'lucide-react';

export const RatingStars = ({ rating, size = 16 }: { rating: number; size?: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.floor(rating) ? 'fill-primary text-primary' : 'text-muted-foreground/30'}
        />
      ))}
    </div>
  );
};
