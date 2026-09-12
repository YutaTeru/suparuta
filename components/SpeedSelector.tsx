import { useId } from 'react';
import { Minus, Plus } from 'lucide-react';

export function SpeedSelector({ selectedWpm, onSelect }: { selectedWpm: number; onSelect: (wpm: number) => void }) {
  const id = useId();
  return <div className="space-y-4">
    <label htmlFor={id} className="flex items-center justify-between text-sm text-zinc-300">表示速度 <span className="font-mono text-white">{selectedWpm} WPM</span></label>
    <div className="flex items-center gap-4">
      <button type="button" aria-label="速度を10下げる" className="icon-button" disabled={selectedWpm <= 70} onClick={() => onSelect(Math.max(70, selectedWpm - 10))}><Minus size={18} /></button>
      <input id={id} type="range" min={70} max={160} step={10} value={selectedWpm} onChange={e => onSelect(Number(e.target.value))} className="h-11 w-full min-w-0 accent-spartan-red" />
      <button type="button" aria-label="速度を10上げる" className="icon-button" disabled={selectedWpm >= 160} onClick={() => onSelect(Math.min(160, selectedWpm + 10))}><Plus size={18} /></button>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[['ゆっくり', 70], ['標準', 110], ['速め', 160]].map(([label, value]) => <button key={value} type="button" className="choice" aria-pressed={selectedWpm === value} onClick={() => onSelect(Number(value))}>{label}<span className="ml-1 font-mono">{value}</span></button>)}
    </div>
    <p className="text-xs leading-relaxed text-zinc-400">WPMは1分間に表示する単語数。内容を追える速さを選んでください。</p>
  </div>;
}
