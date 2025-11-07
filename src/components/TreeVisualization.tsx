import { useEffect, useState } from "react";

interface TreeVisualizationProps {
  level: number;
  animated?: boolean;
}

const TreeVisualization = ({ level, animated = false }: TreeVisualizationProps) => {
  const [visible, setVisible] = useState(!animated);

  useEffect(() => {
    if (animated) {
      setTimeout(() => setVisible(true), 100);
    }
  }, [animated]);

  // Calculate tree size based on level
  const scale = Math.min(1 + (level - 1) * 0.15, 2);
  const leafCount = Math.min(5 + level * 3, 30);

  return (
    <div className="relative flex items-center justify-center py-8">
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className={`transition-all duration-1000 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Tree trunk */}
        <path
          d="M95 180 L95 120 Q95 100, 100 100 L100 100 Q105 100, 105 120 L105 180 Z"
          fill="hsl(var(--secondary))"
          className="animate-grow"
        />

        {/* Main branches */}
        <path
          d="M100 110 Q80 90, 70 80"
          stroke="hsl(var(--secondary))"
          strokeWidth="4"
          fill="none"
          className="animate-grow"
          style={{ animationDelay: "100ms" }}
        />
        <path
          d="M100 110 Q120 90, 130 80"
          stroke="hsl(var(--secondary))"
          strokeWidth="4"
          fill="none"
          className="animate-grow"
          style={{ animationDelay: "150ms" }}
        />

        {/* Leaves - dynamically generated based on level */}
        {Array.from({ length: leafCount }).map((_, i) => {
          const angle = (i / leafCount) * Math.PI * 2;
          const radius = 40 + Math.random() * 20;
          const x = 100 + Math.cos(angle) * radius;
          const y = 90 + Math.sin(angle) * radius * 0.6;
          const size = 8 + Math.random() * 4;

          return (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx={size}
              ry={size * 1.3}
              fill={i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "hsl(var(--primary-glow))" : "hsl(var(--accent))"}
              className="animate-grow"
              style={{
                animationDelay: `${200 + i * 30}ms`,
                transform: `rotate(${angle}rad)`,
                transformOrigin: `${x}px ${y}px`,
              }}
            />
          );
        })}

        {/* Ground */}
        <ellipse
          cx="100"
          cy="185"
          rx="50"
          ry="10"
          fill="hsl(var(--muted))"
          opacity="0.5"
        />
      </svg>

      {/* Level badge */}
      <div className="absolute -bottom-2 bg-gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-medium">
        Level {level}
      </div>
    </div>
  );
};

export default TreeVisualization;
