import TreeVisualization from './TreeVisualization';

interface ShareTemplateProps {
  stats: {
    accuracy: number;
    xpEarned: number;
    level: number;
    correct: number;
    incorrect: number;
  };
}

export function ShareTemplate({ stats }: ShareTemplateProps) {
  const getMessage = (accuracy: number) => {
    if (accuracy >= 90) return "Outstanding! 🌟";
    if (accuracy >= 70) return "Great job! 🎉";
    if (accuracy >= 50) return "Keep growing! 🌱";
    return "Practice makes perfect! 💪";
  };

  return (
    <div 
      id="share-template" 
      className="w-[1200px] h-[630px] bg-gradient-hero flex items-center justify-center p-16"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="bg-white rounded-3xl p-12 shadow-2xl w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="text-6xl">🌳</div>
            <div>
              <h1 className="text-5xl font-bold text-primary">Banyan Tree</h1>
              <p className="text-xl text-muted-foreground">Learning Progress</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-6xl font-bold text-primary">{stats.accuracy}%</p>
            <p className="text-2xl text-muted-foreground">Accuracy</p>
          </div>
        </div>

        <div className="flex items-center justify-center my-8">
          <TreeVisualization level={stats.level} />
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6 bg-primary/10 rounded-2xl">
            <p className="text-5xl font-bold text-primary mb-2">{stats.correct}</p>
            <p className="text-xl text-muted-foreground">Correct</p>
          </div>
          <div className="text-center p-6 bg-destructive/10 rounded-2xl">
            <p className="text-5xl font-bold text-destructive mb-2">{stats.incorrect}</p>
            <p className="text-xl text-muted-foreground">Incorrect</p>
          </div>
          <div className="text-center p-6 bg-accent/10 rounded-2xl">
            <p className="text-5xl font-bold text-accent mb-2">+{stats.xpEarned}</p>
            <p className="text-xl text-muted-foreground">XP Earned</p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-4xl font-bold mb-3">{getMessage(stats.accuracy)}</h2>
          <p className="text-2xl text-muted-foreground">Level {stats.level} • Keep learning!</p>
        </div>
      </div>
    </div>
  );
}
