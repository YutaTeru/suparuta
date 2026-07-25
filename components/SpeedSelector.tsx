import React from 'react';
import { Minus, Plus, Gauge } from 'lucide-react';

interface SpeedSelectorProps {
  selectedWpm: number;
  onSelect: (wpm: number) => void;
}

export const SpeedSelector: React.FC<SpeedSelectorProps> = ({ selectedWpm, onSelect }) => {
  const MIN_WPM = 70;
  const MAX_WPM = 160;
  const STEP = 10;

  const handleDecrease = () => {
    onSelect(Math.max(MIN_WPM, selectedWpm - STEP));
  };

  const handleIncrease = () => {
    onSelect(Math.min(MAX_WPM, selectedWpm + STEP));
  };

  const presets = [
    { label: 'ゆっくり (70)', value: 70 },
    { label: '標準 (110)', value: 110 },
    { label: '高速 (160)', value: 160 },
  ];

  return (
    <div className="bg-spartan-gray/50 border border-gray-800 p-4 rounded-xl space-y-4 w-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
          <Gauge size={16} className="text-spartan-neon" /> 表示速度 (WPM)
        </span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-spartan-neon tracking-tight font-mono">
            {selectedWpm}
          </span>
          <span className="text-xs text-gray-400 font-bold">WPM</span>
        </div>
      </div>

      {/* Main Controller: Minus, Range Slider, Plus */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={selectedWpm <= MIN_WPM}
          className="w-10 h-10 rounded-lg bg-spartan-gray hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-spartan-gray text-white flex items-center justify-center font-bold border border-gray-700 transition-all active:scale-95 shrink-0"
          title="速度を10下げる（遅くする）"
        >
          <Minus size={18} />
        </button>

        <div className="flex-1 px-1">
          <input
            type="range"
            min={MIN_WPM}
            max={MAX_WPM}
            step={STEP}
            value={selectedWpm}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="w-full h-2.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-spartan-neon"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
            <span>70 (遅い)</span>
            <span>110 (標準)</span>
            <span>160 (速い)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleIncrease}
          disabled={selectedWpm >= MAX_WPM}
          className="w-10 h-10 rounded-lg bg-spartan-gray hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-spartan-gray text-white flex items-center justify-center font-bold border border-gray-700 transition-all active:scale-95 shrink-0"
          title="速度を10上げる（速くする）"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Preset Quick Buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-800/60">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onSelect(preset.value)}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
              selectedWpm === preset.value
                ? 'bg-spartan-neon/20 border-spartan-neon text-spartan-neon shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                : 'bg-spartan-black/40 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
