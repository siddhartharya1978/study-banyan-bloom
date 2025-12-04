import { WifiOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-accent/90 text-accent-foreground overflow-hidden"
        >
          <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>{t('dashboard.offline', "You're offline. Reviews will sync when you reconnect.")}</span>
            <RefreshCw className="h-4 w-4 animate-spin opacity-70" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}