export function ProgressBar({ progress }: { progress: number }) {
  const value = Math.min(100, Math.max(0, progress));
  return <div role="progressbar" aria-label="読書の進み具合" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className="h-1 shrink-0 bg-zinc-800">
    <div className="h-full bg-spartan-red transition-[width]" style={{ width: `${value}%` }} />
  </div>;
}
