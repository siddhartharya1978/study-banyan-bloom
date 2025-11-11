import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LevelUpModalProps {
  open: boolean;
  onClose: () => void;
  level: number;
  streakVaultSave: boolean;
}

const LevelUpModal = ({ open, onClose, level, streakVaultSave }: LevelUpModalProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#fbbf24', '#f59e0b'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#fbbf24', '#f59e0b'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse-glow" />
            <div className="relative bg-gradient-warm p-6 rounded-2xl shadow-glow">
              <Sparkles className="h-16 w-16 text-accent-foreground animate-float" />
            </div>
          </div>

          <h2 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            {t('levelUp')}
          </h2>
          
          <p className="text-xl text-muted-foreground">
            You're now Level {level}!
          </p>

          {streakVaultSave && (
            <div className="bg-gradient-primary p-4 rounded-lg w-full">
              <p className="text-primary-foreground font-medium">
                🏦 +1 Streak Vault Save
              </p>
              <p className="text-primary-foreground/80 text-sm mt-1">
                Use it to protect your streak if you miss a day
              </p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Keep growing your knowledge tree! 🌳
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            Continue Learning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelUpModal;
