import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chunk } from '../types';
import { 
  Play, Pause, RotateCcw, CheckCircle, Languages, 
  Sparkles, ScanEye, Ghost, Zap,
  Settings2, X, Layers, Gauge, BookOpen, Clock
} from 'lucide-react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

interface ReaderCanvasProps {
  chunks: Chunk[];
  wpm: number;
  onFinish: () => void;
  onReset: () => void;
}

type RevealMode = 'fade' | 'flash' | 'blur' | 'zoom';

interface DisplayFrame {
  text: string;
  chunk: Chunk; // Reference to original chunk for JP/Speaker data
  wordCount: number;
}

export const ReaderCanvas: React.FC<ReaderCanvasProps> = ({ chunks, wpm: initialWpm, onFinish, onReset }) => {
  // State
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Settings
  const [showTranslation, setShowTranslation] = useState(false);
  const [revealMode, setRevealMode] = useState<RevealMode>('fade');
  const [wordGroupSize, setWordGroupSize] = useState<number>(0); // 0 = Meaning Chunk Mode
  const [dynamicWpm, setDynamicWpm] = useState<number>(initialWpm);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [translationDelay, setTranslationDelay] = useState<number>(0); // 0 = Instant, 2-7 = Delay seconds
  const [isDelayFinished, setIsDelayFinished] = useState<boolean>(true);
  const [prevFrameIndex, setPrevFrameIndex] = useState<number>(frameIndex);
  const [prevTranslationDelay, setPrevTranslationDelay] = useState<number>(translationDelay);

  // Render-phase synchronization to immediately and synchronously hide translation
  // before the browser paints the new frame, completely eliminating any flickering/flashing.
  if (frameIndex !== prevFrameIndex || translationDelay !== prevTranslationDelay) {
    setPrevFrameIndex(frameIndex);
    setPrevTranslationDelay(translationDelay);
    if (translationDelay > 0) {
      setIsDelayFinished(false);
    } else {
      setIsDelayFinished(true);
    }
  }
  
  const handleCycleDelay = () => {
    setTranslationDelay((prev) => {
      if (prev === 0) {
        setShowTranslation(true);
        return 2;
      }
      if (prev === 2) return 3;
      if (prev === 3) return 4;
      if (prev === 4) return 5;
      if (prev === 5) return 6;
      if (prev === 6) return 7;
      return 0;
    });
  };
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-calculate all "Frames" (Display Units) based on chunks and wordGroupSize
  const frames = useMemo(() => {
    const f: DisplayFrame[] = [];
    chunks.forEach((chunk) => {
      const words = chunk.en.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) return;

      if (wordGroupSize === 0) {
        // CHUNK Mode: Use the whole chunk text as is (meaning-based)
        f.push({
          text: chunk.en,
          chunk: chunk,
          wordCount: words.length
        });
      } else {
        // Word Group Mode
        for (let i = 0; i < words.length; i += wordGroupSize) {
          const group = words.slice(i, i + wordGroupSize);
          f.push({
            text: group.join(' '),
            chunk: chunk,
            wordCount: group.length
          });
        }
      }
    });
    return f;
  }, [chunks, wordGroupSize]);

  // Handle Playback Tick
  useEffect(() => {
    if (isPlaying && frameIndex < frames.length) {
      const currentFrame = frames[frameIndex];
      // Calculate duration:
      let duration: number;
      if (translationDelay > 0) {
        // Delay Mode: Keep English displayed for translationDelay seconds, then display translation for exactly 3 seconds
        duration = (translationDelay * 1000) + 3000;
      } else {
        // Normal Mode: (Words / WPM) * 60 * 1000
        // Enforce a minimum duration of 150ms to prevent unreadable flashes
        duration = Math.max(150, (currentFrame.wordCount / dynamicWpm) * 60 * 1000);
      }
      
      timerRef.current = setTimeout(() => {
        if (frameIndex + 1 < frames.length) {
          setFrameIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
          setIsFinished(true);
          onFinish();
        }
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, frameIndex, frames, dynamicWpm, translationDelay, onFinish]);

  // 日本語訳の表示遅延制御
  useEffect(() => {
    if (translationDelay === 0) {
      setIsDelayFinished(true);
      return;
    }

    setIsDelayFinished(false);
    const delayTimer = setTimeout(() => {
      setIsDelayFinished(true);
    }, translationDelay * 1000);

    return () => {
      clearTimeout(delayTimer);
    };
  }, [frameIndex, translationDelay]);

  // Keybindings for full keyboard-only controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setIsPlaying(false);
          setFrameIndex(prev => Math.max(0, prev - 1));
          setIsFinished(false);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setIsPlaying(false);
          setFrameIndex(prev => {
            if (prev + 1 < frames.length) {
              return prev + 1;
            } else {
              setIsFinished(true);
              onFinish();
              return prev;
            }
          });
          break;
        case 'Escape':
          e.preventDefault();
          if (isReviewOpen) {
            setIsReviewOpen(false);
          } else {
            onReset();
          }
          break;
        case 'KeyR':
          e.preventDefault();
          onReset();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, frameIndex, frames, onFinish, onReset, isReviewOpen]);

  // When group size changes, we need to reset or try to map position
  useEffect(() => {
    if (frameIndex >= frames.length && frames.length > 0 && !isFinished) {
      setFrameIndex(0);
    }
  }, [frames, frameIndex, isFinished]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const handleRestart = () => {
    setIsPlaying(false);
    setFrameIndex(0);
    setIsFinished(false);
  };

  const jumpToFrame = (index: number) => {
    setFrameIndex(index);
    setIsFinished(false);
    setIsPlaying(false);
  };
  
  const toggleSettings = () => setIsSettingsOpen(!isSettingsOpen);
  const toggleTranslation = () => setShowTranslation(!showTranslation);

  const cycleRevealMode = () => {
    const modes: RevealMode[] = ['fade', 'flash', 'blur', 'zoom'];
    const nextIndex = (modes.indexOf(revealMode) + 1) % modes.length;
    setRevealMode(modes[nextIndex]);
  };

  const getAnimClass = () => {
    switch (revealMode) {
      case 'fade': return 'animate-reveal-fade';
      case 'flash': return 'animate-reveal-flash';
      case 'blur': return 'animate-reveal-blur';
      case 'zoom': return 'animate-reveal-zoom';
      default: return 'animate-reveal-fade';
    }
  };

  const getModeIcon = () => {
    switch (revealMode) {
      case 'fade': return <Ghost size={18} />;
      case 'flash': return <Zap size={18} />;
      case 'blur': return <Sparkles size={18} />;
      case 'zoom': return <ScanEye size={18} />;
    }
  };

  // Dynamic Font Scaling
  const getFontSize = (text: string) => {
    const len = text.length;
    if (len < 10) return 'text-5xl md:text-7xl';
    if (len < 20) return 'text-4xl md:text-6xl';
    if (len < 35) return 'text-3xl md:text-5xl';
    return 'text-2xl md:text-4xl'; 
  };

  const currentFrame = frames[frameIndex];
  const progress = frames.length > 0 ? ((frameIndex + 1) / frames.length) * 100 : 0;
  
  // Check if translation is available in the current chunks
  const hasTranslation = useMemo(() => chunks.some(c => c.jp && c.jp.trim() !== ""), [chunks]);

  return (
    <div className="fixed inset-0 bg-spartan-black flex flex-col h-screen overflow-hidden">
      <ProgressBar progress={isFinished ? 100 : progress} />

      {/* Upper Navigation Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-900/40 bg-spartan-black/80 backdrop-blur-md z-50">
        <button
          onClick={onReset}
          className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white flex items-center gap-2 transition-all"
        >
          <X size={16} /> 戻る (Esc)
        </button>
        
        <div className="flex items-center gap-2.5">
          {/* Quick Translation Toggle */}
          {hasTranslation && (
            <>
              <button
                onClick={toggleTranslation}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  showTranslation 
                    ? 'bg-spartan-neon/20 border-spartan-neon/40 text-spartan-neon shadow-[0_0_10px_rgba(0,240,255,0.15)]' 
                    : 'bg-gray-800/40 border-gray-800 text-gray-500 hover:text-gray-300'
                }`}
                title="日本語訳表示のON/OFF"
              >
                <Languages size={14} />
                <span>日本語訳: {showTranslation ? 'ON' : 'OFF'}</span>
              </button>

              {/* Translation Delay Selector Button */}
              <button
                onClick={handleCycleDelay}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  translationDelay > 0
                    ? 'bg-spartan-neon/20 border-spartan-neon/40 text-spartan-neon shadow-[0_0_10px_rgba(0,240,255,0.15)]' 
                    : 'bg-gray-800/40 border-gray-800 text-gray-500 hover:text-gray-300'
                }`}
                title="日本語訳が表示されるまでの遅延秒数を選択（2秒〜7秒/遅延なし）"
              >
                <Clock size={14} />
                <span>{translationDelay > 0 ? `翻訳遅延: ${translationDelay}秒` : '翻訳遅延: なし'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Display Area */}
      <div 
        className="flex-1 flex flex-col items-center justify-center p-6 pb-32 w-full max-w-5xl mx-auto"
        onClick={() => setIsSettingsOpen(false)}
      >
        {!isFinished && currentFrame ? (
          <div className="w-full text-center flex flex-col items-center justify-center min-h-[300px]">
            
            {/* Speaker Tag */}
            <div className="h-8 mb-6">
              {currentFrame.chunk.speaker && (
                <span className="text-sm font-mono uppercase tracking-widest text-spartan-neon animate-in fade-in duration-300 bg-spartan-neon/10 px-2 py-1 rounded">
                  {currentFrame.chunk.speaker}
                </span>
              )}
            </div>
            
            {/* Main RSVP Text - STRICT SINGLE LINE */}
            <div className="relative w-full overflow-visible flex justify-center items-center h-24 md:h-32">
              <h1 
                key={`${frameIndex}-${revealMode}`} 
                className={`
                  font-sans font-bold text-white tracking-tight whitespace-nowrap
                  ${getFontSize(currentFrame.text)}
                  ${isPlaying ? getAnimClass() : ''}
                `}
              >
                {currentFrame.text}
              </h1>
            </div>

            {/* Japanese Translation (Context Awareness) - Only if available */}
            {hasTranslation && (
              <div className={`
                mt-12 h-16 flex items-start justify-center px-4
                ${(showTranslation && isDelayFinished) 
                  ? 'opacity-100 transform translate-y-0 transition-all duration-300 ease-out' 
                  : 'opacity-0 transform translate-y-4 transition-none duration-0'}
              `}>
                <p className="font-sans text-lg md:text-xl text-gray-500 font-medium max-w-2xl text-center leading-relaxed">
                  {currentFrame.chunk.jp}
                </p>
              </div>
            )}

          </div>
        ) : isFinished && (
           <div className="text-center animate-in zoom-in duration-500 w-full max-w-2xl px-4 flex flex-col items-center">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-spartan-neon/20 text-spartan-neon mb-6">
                 <CheckCircle size={48} />
              </div>
              <h2 className="text-4xl font-bold text-white mb-3">トレーニング完了！</h2>
              <p className="text-gray-400 text-lg mb-8">英語脳の情報処理スピードが向上しています！</p>
              
              {/* 「📖 チャンク復習リストを開く」ボタン */}
              <button
                type="button"
                onClick={() => setIsReviewOpen(true)}
                className="flex items-center justify-center gap-2.5 px-6 py-4 bg-spartan-gray hover:bg-gray-800/50 border-2 border-spartan-neon/30 hover:border-spartan-neon/80 text-spartan-neon hover:text-white rounded-xl font-bold text-base transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] scale-100 hover:scale-[1.02]"
              >
                <BookOpen size={20} />
                チャンク復習リストを開く
              </button>
           </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-spartan-black via-spartan-black/95 to-transparent pt-12 pb-8 px-6 z-40 fixed bottom-0 w-full">
        
        {/* Settings Popup Background Overlay for closing on outside click */}
        {isSettingsOpen && (
          <div 
            className="fixed inset-0 z-40 cursor-default bg-black/10" 
            onClick={() => setIsSettingsOpen(false)}
          />
        )}

        {/* Settings Popup */}
        {isSettingsOpen && (
          <div className="absolute bottom-32 left-6 right-6 md:left-auto md:right-auto md:w-80 md:mx-auto md:relative bg-spartan-gray/95 backdrop-blur-xl border border-gray-700 p-5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 mb-4 z-50">
             <div className="flex justify-between items-center mb-5">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">表示・動作設定</span>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white"><X size={16}/></button>
             </div>
             
             <div className="space-y-5">
                {/* Mode & Translation */}
                <div className={`grid ${hasTranslation ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                   {hasTranslation && (
                     <button 
                      onClick={toggleTranslation}
                      className={`h-12 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${showTranslation ? 'bg-spartan-neon/20 border-spartan-neon text-spartan-neon' : 'bg-gray-800/50 border-gray-600 text-gray-400'}`}
                     >
                       <Languages size={18} /> 日本語訳表示
                     </button>
                   )}
                   <button 
                    onClick={cycleRevealMode}
                    className="h-12 rounded-lg border border-gray-600 bg-gray-800/50 text-gray-400 hover:text-white hover:border-gray-400 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                   >
                     {getModeIcon()} {revealMode}
                   </button>
                </div>

                {/* Group Size */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Layers size={14}/> 表示単位</span>
                    <span className="text-spartan-neon font-bold">
                      {wordGroupSize === 0 ? '意味のかたまり (チャンク)' : `${wordGroupSize}単語`}
                    </span>
                  </div>
                  <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg">
                    {[0, 1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        onClick={() => setWordGroupSize(num)}
                        className={`flex-1 h-9 rounded text-xs font-bold transition-all ${wordGroupSize === num ? 'bg-spartan-neon text-spartan-black shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {num === 0 ? 'チャンク' : `${num}語`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Translation Delay Option */}
                {hasTranslation && (
                  <div className="space-y-2 pt-2 border-t border-gray-800/60">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={14}/> 日本語訳の表示ディレイ</span>
                      <span className="text-spartan-neon font-bold">
                        {translationDelay === 0 ? '遅延なし (即時)' : `${translationDelay}秒遅れ`}
                      </span>
                    </div>
                    <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg">
                      {[0, 2, 3, 4, 5, 6, 7].map(sec => (
                        <button
                          key={sec}
                          onClick={() => {
                            setTranslationDelay(sec);
                            if (sec > 0) setShowTranslation(true);
                          }}
                          className={`flex-1 h-9 rounded text-xs font-bold transition-all ${translationDelay === sec ? 'bg-spartan-neon text-spartan-black shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          {sec === 0 ? '即時' : `${sec}秒`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Speed */}
                 <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Gauge size={14}/> 表示速度 (WPM)</span>
                    <span className="text-spartan-neon font-bold text-lg">{dynamicWpm}</span>
                  </div>
                  <input 
                    type="range" 
                    min="60" 
                    max="600" 
                    step="10" 
                    value={dynamicWpm}
                    onChange={(e) => setDynamicWpm(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-spartan-neon"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 font-mono uppercase">
                    <span>ゆっくり</span>
                    <span>標準</span>
                    <span>超高速</span>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Main Buttons */}
        <div className="max-w-xl mx-auto flex items-center gap-3">
          
          {!isFinished ? (
            <>
              <button 
                onClick={toggleSettings}
                className={`
                  w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all shrink-0
                  ${isSettingsOpen
                    ? 'bg-spartan-gray border-gray-500 text-white' 
                    : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-white'}
                `}
              >
                <Settings2 size={24} />
              </button>

              <Button 
                variant="neon" 
                onClick={togglePlay}
                className="h-14 text-xl flex-1 tracking-widest"
              >
                {isPlaying ? (
                  <>
                    <Pause fill="currentColor" size={24} /> 一時停止
                  </>
                ) : (
                  <>
                    <Play fill="currentColor" size={24} /> {frameIndex === 0 ? 'スタート' : '再開'}
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="w-full flex gap-4">
              <Button variant="secondary" onClick={handleRestart}>
                <RotateCcw size={20} /> もう一度読む
              </Button>
              <Button variant="primary" onClick={onReset}>
                <CheckCircle size={20} /> 別の英文を入力
              </Button>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-center text-[10px] text-gray-600 mt-4 font-sans tracking-wide uppercase select-none">
          [Space] 再生/一時停止 &nbsp;•&nbsp; [← / →] 1チャンク戻る/進む &nbsp;•&nbsp; [Esc] 入力に戻る
        </div>
      </div>

      {/* チャンク復習モーダル（全画面オーバーレイ） */}
      {isReviewOpen && (
        <div 
          className="fixed inset-0 bg-spartan-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"
          onClick={() => setIsReviewOpen(false)}
        >
          <div 
            className="w-full max-w-3xl bg-spartan-gray border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800/80 bg-spartan-black/40">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-spartan-neon" />
                <h3 className="text-lg font-bold text-white">📖 チャンクふりかえり（全 {frames.length} チャンク）</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                title="閉じる"
              >
                <X size={20} />
              </button>
            </div>

            {/* モーダルコンテンツ（スクロールエリア） */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar bg-spartan-black/20">
              <div className="text-xs text-gray-500 font-medium pb-2 select-none">
                💡 任意のチャンクをクリックすると、その位置から再生を開始できます。
              </div>
              {frames.map((frame, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    jumpToFrame(idx);
                    setIsReviewOpen(false);
                  }}
                  className="p-4 bg-spartan-black/40 hover:bg-spartan-neon/10 border border-gray-800/60 hover:border-spartan-neon/40 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group duration-200"
                >
                  <div className="space-y-1.5 flex-1">
                    <p className="text-base font-semibold text-white group-hover:text-spartan-neon transition-colors font-sans leading-relaxed">
                      {frame.text}
                    </p>
                    {frame.chunk.jp && (
                      <p className="text-sm text-gray-400 font-medium font-sans">
                        {frame.chunk.jp}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center text-xs text-gray-500 group-hover:text-spartan-neon font-bold uppercase tracking-wider gap-1 select-none">
                    <span>チャンク {idx + 1}</span>
                    <span>➜</span>
                  </div>
                </div>
              ))}
            </div>

            {/* モーダルフッター */}
            <div className="p-4 border-t border-gray-800/80 bg-spartan-black/40 text-center select-none">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-semibold transition-all"
              >
                閉じる (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};