export default function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 85 ? "#4fb286" : score >= 72 ? "#e0a94a" : score >= 55 ? "#d8a24a" : "#c05555";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#23282f" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-xl font-bold leading-none text-white">{score}</div>
        <div className="font-mono text-[9px] uppercase tracking-wider text-fog-500">/ 100</div>
      </div>
    </div>
  );
}
