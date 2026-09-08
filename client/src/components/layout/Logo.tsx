export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative grid h-7 w-7 place-items-center">
        <svg viewBox="0 0 28 28" className="h-7 w-7">
          <circle cx="14" cy="14" r="12" fill="none" stroke="#23282f" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="7" fill="none" stroke="#23282f" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="1.6" fill="#e0a94a" />
          <path d="M14 14 L14 2 A12 12 0 0 1 24.4 8 Z" fill="#e0a94a" opacity="0.18" />
          <line x1="14" y1="14" x2="24.4" y2="8" stroke="#e0a94a" strokeWidth="1.5" />
        </svg>
      </span>
      <span className="font-display text-[17px] font-bold tracking-tight text-white">
        Set<span className="text-amber-signal">Radar</span>
      </span>
    </span>
  );
}
