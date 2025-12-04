import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface TreeVisualizationProps {
  level: number;
  animated?: boolean;
}

const TreeVisualization = ({ level, animated = false }: TreeVisualizationProps) => {
  const [visible, setVisible] = useState(!animated);
  const [fallingLeaves, setFallingLeaves] = useState<number[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (animated) {
      setTimeout(() => setVisible(true), 100);
      // Trigger falling leaves animation
      const leaves = Array.from({ length: 5 }, (_, i) => i);
      setFallingLeaves(leaves);
    }
  }, [animated]);

  // Calculate tree size based on level
  const scale = Math.min(1 + (level - 1) * 0.1, 1.8);
  const leafCount = Math.min(5 + level * 3, 35);
  const showRoots = level >= 5;
  const rootCount = Math.min((level - 4) * 2, 8);

  return (
    <div className="relative flex items-center justify-center py-8 overflow-hidden">
      {/* Falling leaves animation */}
      {fallingLeaves.map((i) => (
        <motion.div
          key={`falling-${i}`}
          className="absolute text-2xl pointer-events-none"
          initial={{ 
            x: 80 + Math.random() * 40, 
            y: 20,
            opacity: 1,
            rotate: 0 
          }}
          animate={{ 
            x: 60 + Math.random() * 80, 
            y: 200,
            opacity: 0,
            rotate: 360 
          }}
          transition={{ 
            duration: 3 + Math.random() * 2,
            delay: i * 0.3,
            ease: "easeOut"
          }}
        >
          🍃
        </motion.div>
      ))}

      <svg
        width="200"
        height="220"
        viewBox="0 0 200 220"
        className={`transition-all duration-1000 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Roots - appear at level 5+ */}
        {showRoots && Array.from({ length: rootCount }).map((_, i) => {
          const angle = (i / rootCount) * Math.PI - Math.PI / 2;
          const length = 20 + Math.random() * 15;
          const startX = 100 + (i % 2 === 0 ? -5 : 5);
          const endX = startX + Math.cos(angle + Math.PI / 2) * length;
          const endY = 185 + Math.sin(angle + Math.PI / 2) * length * 0.5;
          
          return (
            <motion.path
              key={`root-${i}`}
              d={`M${startX} 180 Q${startX + (endX - startX) * 0.5} ${185 + length * 0.3}, ${endX} ${endY}`}
              stroke="hsl(var(--secondary))"
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
            />
          );
        })}

        {/* Ground with gradient */}
        <defs>
          <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Tree trunk with texture */}
        <path
          d="M92 185 L92 115 Q92 95, 100 95 L100 95 Q108 95, 108 115 L108 185 Z"
          fill="hsl(var(--secondary))"
          className="animate-grow"
        />
        
        {/* Trunk texture lines */}
        <path d="M96 120 L96 170" stroke="hsl(var(--secondary-foreground))" strokeWidth="0.5" opacity="0.3" />
        <path d="M100 125 L100 175" stroke="hsl(var(--secondary-foreground))" strokeWidth="0.5" opacity="0.3" />
        <path d="M104 118 L104 168" stroke="hsl(var(--secondary-foreground))" strokeWidth="0.5" opacity="0.3" />

        {/* Main branches */}
        <motion.path
          d="M100 105 Q75 85, 60 70"
          stroke="hsl(var(--secondary))"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        />
        <motion.path
          d="M100 105 Q125 85, 140 70"
          stroke="hsl(var(--secondary))"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        />
        <motion.path
          d="M100 115 Q70 100, 50 95"
          stroke="hsl(var(--secondary))"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <motion.path
          d="M100 115 Q130 100, 150 95"
          stroke="hsl(var(--secondary))"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        />

        {/* Leaves - dynamically generated based on level */}
        {Array.from({ length: leafCount }).map((_, i) => {
          const angle = (i / leafCount) * Math.PI * 2;
          const radius = 35 + Math.random() * 25;
          const x = 100 + Math.cos(angle) * radius;
          const y = 85 + Math.sin(angle) * radius * 0.6;
          const size = 7 + Math.random() * 5;
          const colorVariant = i % 4;
          const colors = [
            "hsl(var(--primary))",
            "hsl(var(--primary-glow))",
            "hsl(var(--accent))",
            "hsl(142, 60%, 50%)" // Lighter green variant
          ];

          return (
            <motion.ellipse
              key={i}
              cx={x}
              cy={y}
              rx={size}
              ry={size * 1.4}
              fill={colors[colorVariant]}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 0.9,
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.3 + i * 0.02,
                type: "spring",
                stiffness: 200
              }}
              style={{
                transformOrigin: `${x}px ${y}px`,
              }}
              className="leaf-sway"
            />
          );
        })}

        {/* Ground */}
        <ellipse
          cx="100"
          cy="190"
          rx="55"
          ry="12"
          fill="url(#groundGradient)"
        />
      </svg>

      {/* Level badge with enhanced glow */}
      <motion.div 
        className="absolute -bottom-2 bg-gradient-primary text-primary-foreground px-5 py-1.5 rounded-full text-sm font-bold shadow-glow"
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
        style={{ filter: "url(#glow)" }}
      >
        <span className="relative z-10 flex items-center gap-1">
          {level >= 10 && "⭐ "}
          {t('dashboard.level', 'Level')} {level}
          {level >= 10 && " ⭐"}
        </span>
      </motion.div>

      {/* CSS for leaf sway animation */}
      <style>{`
        @keyframes leaf-sway {
          0%, 100% { transform: rotate(-3deg) translateY(0); }
          50% { transform: rotate(3deg) translateY(-2px); }
        }
        .leaf-sway {
          animation: leaf-sway 4s ease-in-out infinite;
          animation-delay: calc(var(--i, 0) * 0.1s);
        }
        .leaf-sway:nth-child(odd) {
          animation-direction: reverse;
        }
      `}</style>
    </div>
  );
};

export default TreeVisualization;