import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="w-full h-1 bg-spartan-gray fixed top-0 left-0 z-50">
      <div 
        className="h-full bg-spartan-neon shadow-[0_0_10px_#00f0ff] transition-all duration-300 ease-linear"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};