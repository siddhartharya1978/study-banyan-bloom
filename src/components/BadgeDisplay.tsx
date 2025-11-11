import { useEffect, useState } from 'react';
import { getUserBadges } from '@/lib/badges';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Badge = Database["public"]["Tables"]["badges"]["Row"];

interface BadgeDisplayProps {
  userId: string;
}

const BadgeDisplay = ({ userId }: BadgeDisplayProps) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBadges();
  }, [userId]);

  const loadBadges = async () => {
    try {
      const earnedBadges = await getUserBadges(userId);
      setBadges(earnedBadges);
    } catch (error: any) {
      toast({
        title: "Error loading badges",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Badges</h3>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 w-12 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (badges.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Badges</h3>
        <p className="text-sm text-muted-foreground">
          Keep learning to earn badges! 🌟
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-3">Badges ({badges.length})</h3>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="group relative"
            title={`${badge.name}: ${badge.description}`}
          >
            <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-2xl shadow-glow hover:scale-110 transition-transform cursor-pointer">
              {badge.icon}
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-popover text-popover-foreground text-xs rounded-lg p-2 shadow-lg max-w-[200px]">
                <p className="font-semibold">{badge.name}</p>
                <p className="text-muted-foreground">{badge.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BadgeDisplay;
