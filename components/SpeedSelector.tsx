import React from 'react';
import { WPM } from '../types';
import { Gauge, Zap, Rocket } from 'lucide-react';

interface SpeedSelectorProps {
  selectedWpm: number;
  onSelect: (wpm: number) => void;
}

export const SpeedSelector: React.FC<SpeedSelectorProps> = ({ selectedWpm, onSelect }) => {
  const options = [
    { value: WPM.COMMON_TEST, label: '標準 (共通テスト級)', sub: 'Common Test', wpm: 120, icon: <Gauge size={20} /> },
    { value: WPM.DIFFICULT_UNIV, label: '難関 (難関大入試級)', sub: 'Difficult Univ', wpm: 150, icon: <Zap size={20} /> },
    { value: WPM.NATIVE, label: 'スパルタ (ネイティブ級)', sub: 'Native Level', wpm: 180, icon: <Rocket size={20} /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={`
            flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
            ${selectedWpm === opt.value 
              ? 'border-spartan-neon bg-spartan-neon/10 text-spartan-neon shadow-[0_0_15px_rgba(0,240,255,0.2)]' 
              : 'border-spartan-gray bg-spartan-gray/30 text-gray-400 hover:border-gray-500'
            }
          `}
        >
          <div className="mb-2">{opt.icon}</div>
          <div className="font-bold text-lg">{opt.label}</div>
          <div className="text-xs opacity-70">WPM {opt.wpm}</div>
        </button>
      ))}
    </div>
  );
};