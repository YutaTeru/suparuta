import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Languages, Pause, Play, RotateCcw, Settings2 } from 'lucide-react';
import type { Chunk } from '../types';
import { buildFrames, formatDuration, frameAtWord, frameDuration } from '../services/reading';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { Modal } from './Modal';
import { SpeedSelector } from './SpeedSelector';

interface ReaderCanvasProps {
  chunks: Chunk[];
  wpm: number;
  onBack: (wpm: number) => void;
  onExit: (wpm: number) => void;
}

function useFrameClock(key: string, running: boolean) {
  const [clock, setClock] = useState({ key, elapsed: 0 });
  if (clock.key !== key) setClock({ key, elapsed: 0 });
  useEffect(() => {
    if (!running) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - previous;
      previous = now;
      setClock(current => current.key === key ? { key, elapsed: current.elapsed + delta } : current);
    }, 40);
    return () => window.clearInterval(timer);
  }, [key, running]);
  return clock.key === key ? clock.elapsed : 0;
}

export function ReaderCanvas({ chunks, wpm, onBack, onExit }: ReaderCanvasProps) {
  const [wordOffset, setWordOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [countdown, setCountdown] = useState(2);
  const [isFinished, setIsFinished] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationDelay, setTranslationDelay] = useState(0);
  const [groupSize, setGroupSize] = useState(0);
  const [dynamicWpm, setDynamicWpm] = useState(wpm);
  const [revealMode, setRevealMode] = useState('fade');
  const [modal, setModal] = useState<'settings' | 'review' | null>(null);
  const [restartId, setRestartId] = useState(0);
  const frames = useMemo(() => buildFrames(chunks, groupSize), [chunks, groupSize]);
  const frameIndex = useMemo(() => frameAtWord(frames, wordOffset), [frames, wordOffset]);
  const frame = frames[frameIndex];
  const totalWords = frames.at(-1)?.end ?? 0;
  const hasTranslation = useMemo(() => chunks.some(chunk => chunk.jp.trim()), [chunks]);
  const remainingDurations = useMemo(() => {
    const values = new Array<number>(frames.length + 1).fill(0);
    for (let index = frames.length - 1; index >= 0; index--) {
      values[index] = values[index + 1] + frameDuration(frames[index], dynamicWpm, translationDelay, showTranslation);
    }
    return values;
  }, [frames, dynamicWpm, translationDelay, showTranslation]);
  const effectiveDelay = showTranslation && frame?.chunk.jp.trim() ? translationDelay : 0;
  const duration = frame ? frameDuration(frame, dynamicWpm, translationDelay, showTranslation) : 0;
  const elapsed = useFrameClock(`${frame?.start}:${frame?.end}:${dynamicWpm}:${effectiveDelay}:${restartId}`,
    isPlaying && !countdown && !modal && !isFinished);
  const remaining = (remainingDurations[frameIndex] ?? 0) - elapsed;

  const advance = useCallback(() => {
    if (frameIndex + 1 < frames.length) setWordOffset(frames[frameIndex + 1].start);
    else { setIsPlaying(false); setIsFinished(true); }
  }, [frameIndex, frames]);

  useEffect(() => {
    if (countdown <= 0 || !isPlaying) return;
    const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, isPlaying]);

  useEffect(() => {
    if (isPlaying && !countdown && !modal && !isFinished && elapsed >= duration) advance();
  }, [elapsed, duration, isPlaying, countdown, modal, isFinished, advance]);

  const pause = useCallback(() => { setIsPlaying(false); setCountdown(0); }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [pause]);

  const jump = useCallback((index: number) => {
    pause(); setWordOffset(frames[Math.max(0, Math.min(frames.length - 1, index))]?.start ?? 0);
    setIsFinished(false); setRestartId(value => value + 1);
  }, [frames, pause]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause(); else setIsPlaying(true);
  }, [isPlaying, pause]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || modal) return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.code === 'Escape') { event.preventDefault(); onBack(dynamicWpm); }
      if (isFinished) return;
      if (event.code === 'Space' && target.tagName !== 'BUTTON') { event.preventDefault(); togglePlay(); }
      if (event.code === 'ArrowLeft') { event.preventDefault(); jump(frameIndex - 1); }
      if (event.code === 'ArrowRight') { event.preventDefault(); pause(); advance(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modal, dynamicWpm, onBack, isFinished, togglePlay, jump, frameIndex, pause, advance]);

  function restart() {
    setWordOffset(0); setIsFinished(false); setRestartId(value => value + 1); setCountdown(2); setIsPlaying(true);
  }
  function openSettings() { pause(); setModal('settings'); }
  function changeGroup(value: number) {
    // Keep the word being read, rather than reusing an unrelated frame number.
    setWordOffset(frame?.start ?? 0); setGroupSize(value); setRestartId(value => value + 1);
  }

  return <main className="reader-shell">
    <ProgressBar progress={isFinished ? 100 : totalWords ? (frame?.start ?? 0) / totalWords * 100 : 0} />
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 sm:px-6">
      <button className="quiet-button whitespace-nowrap" onClick={() => onBack(dynamicWpm)}><ArrowLeft size={17} />入力へ</button>
      <div className="flex items-center gap-1">
        {hasTranslation && !isFinished && <button className="quiet-button whitespace-nowrap" aria-pressed={showTranslation} onClick={() => setShowTranslation(!showTranslation)}><Languages size={17} />訳 {showTranslation ? 'ON' : 'OFF'}</button>}
        <span className="hidden font-mono text-xs text-zinc-400 sm:block">{dynamicWpm} WPM</span>
        {!isFinished && <button className="quiet-button" aria-label="読書の設定" onClick={openSettings}><Settings2 size={19} /></button>}
      </div>
    </header>

    <section className="reader-stage" aria-label={isFinished ? '読了' : '読書'}>
      <div className="reader-content">
        {isFinished ? <div className="mx-auto max-w-sm">
          <Check size={36} className="mx-auto mb-6 text-spartan-neon" />
          <p className="mb-3 text-xs font-bold tracking-[.2em] text-zinc-400">READING COMPLETE</p>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">読了。</h1>
          <p className="mt-4 text-lg text-zinc-300">おつかれさま。</p>
          <p className="mt-5 text-sm text-zinc-400">{totalWords}語の英文を最後まで表示しました。</p>
          <button className="quiet-button mt-7 border border-zinc-700 px-5" onClick={() => setModal('review')}><BookOpen size={17} />英文をふりかえる</button>
        </div> : countdown > 0 ? <div role="status" aria-live="polite">
          <p className="text-sm text-zinc-400">前から、読んでいこう。</p>
          <p className="my-6 font-mono text-7xl font-bold">{countdown}</p>
          <p className="text-sm text-zinc-400">まもなくスタート</p>
        </div> : frame ? <div>
          {frame.chunk.speaker && <p className="mb-5 text-sm text-zinc-400">{frame.chunk.speaker}</p>}
          <h1 key={`${frameIndex}:${groupSize}:${revealMode}`} lang="en" data-length={frame.text.length > 55 ? 'long' : 'normal'}
            className={`reader-text ${isPlaying ? `reveal-${revealMode}` : ''}`}>{frame.text}</h1>
          {hasTranslation && <div className="mt-7 min-h-14">
            {showTranslation && elapsed >= effectiveDelay * 1000
              ? <p lang="ja" className="mx-auto max-w-2xl text-base leading-8 text-zinc-300 sm:text-xl">{frame.chunk.jp}</p>
              : showTranslation && effectiveDelay > 0 ? <p className="text-sm text-zinc-400">訳は{effectiveDelay}秒後に表示</p> : null}
          </div>}
          {!isPlaying && <p className="mt-5 text-xs text-zinc-400">一時停止中。自分のペースで確認できます。</p>}
        </div> : <p>表示できる英文がありません。</p>}
      </div>
    </section>

    <footer className="safe-bottom shrink-0 border-t border-zinc-800 px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        {isFinished ? <div className="space-y-2">
          <Button onClick={() => onExit(dynamicWpm)}>ここで終了 <Check size={18} /></Button>
          <button className="quiet-button w-full" onClick={restart}><RotateCcw size={16} />もう一度読む</button>
        </div> : <>
          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span>{frameIndex + 1} / {frames.length} {groupSize ? '表示' : 'チャンク'}</span>
            <span>残り 約{formatDuration(Math.max(0, remaining))}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-button h-14 w-12" aria-label="ひとつ戻る" disabled={frameIndex === 0} onClick={() => jump(frameIndex - 1)}><ArrowLeft size={21} /></button>
            <Button className="min-w-0 flex-1" onClick={togglePlay}>{isPlaying ? <><Pause size={20} />一時停止</> : <><Play size={20} />再開</>}</Button>
            <button className="icon-button h-14 w-12" aria-label={frameIndex === frames.length - 1 ? '読み終える' : 'ひとつ進む'} onClick={() => { pause(); advance(); }}><ArrowRight size={21} /></button>
          </div>
          <p className="keyboard-hint mt-3 hidden text-center text-xs text-zinc-400 sm:block">Space 再生 / 停止　← → 移動　Esc 入力へ</p>
        </>}
      </div>
    </footer>

    {modal === 'settings' && <Modal title="読書の設定" onClose={() => setModal(null)}>
      <div className="space-y-7">
        <SpeedSelector selectedWpm={dynamicWpm} onSelect={setDynamicWpm} />
        <fieldset className="space-y-3 border-t border-zinc-700 pt-5">
          <legend className="pt-5 text-sm font-bold">表示するかたまり</legend>
          <div className="grid grid-cols-3 gap-2">{[0, 1, 2, 3, 4, 5].map(size => <button key={size} className="choice" aria-pressed={groupSize === size} onClick={() => changeGroup(size)}>{size ? `${size}語` : 'チャンク'}</button>)}</div>
        </fieldset>
        {hasTranslation && <fieldset className="space-y-3 border-t border-zinc-700 pt-5">
          <legend className="pt-5 text-sm font-bold">日本語訳</legend>
          <button className="choice w-full" aria-pressed={showTranslation} onClick={() => setShowTranslation(!showTranslation)}>日本語訳：{showTranslation ? '表示する' : '表示しない'}</button>
          <p className="text-sm text-zinc-300">英文を見てから訳を出すまで</p>
          <div className="grid grid-cols-4 gap-2">{[0, 2, 3, 4, 5, 6, 7].map(seconds => <button key={seconds} className="choice" aria-pressed={translationDelay === seconds} onClick={() => { setTranslationDelay(seconds); setShowTranslation(true); }}>{seconds ? `${seconds}秒` : 'すぐ'}</button>)}</div>
          <p className="text-xs leading-6 text-zinc-400">訳を待つ時間は読了目安に含まれます。一時停止中はカウントも止まります。</p>
        </fieldset>}
        <fieldset className="space-y-3 border-t border-zinc-700 pt-5">
          <legend className="pt-5 text-sm font-bold">文字の切り替え</legend>
          <div className="grid grid-cols-2 gap-2">{[['fade', 'フェード'], ['flash', '色の変化'], ['blur', 'ぼかし'], ['zoom', 'ズーム']].map(([value, label]) => <button key={value} className="choice" aria-pressed={revealMode === value} onClick={() => setRevealMode(value)}>{label}</button>)}</div>
        </fieldset>
        <Button onClick={() => setModal(null)}>設定を閉じる</Button>
        <p className="text-center text-xs text-zinc-400">再開ボタンで続きから読めます。</p>
      </div>
    </Modal>}
    {modal === 'review' && <Modal title="英文をふりかえる" onClose={() => setModal(null)}>
      <p className="mb-4 text-sm leading-6 text-zinc-400">読み直したい位置を選び、再開ボタンで続けられます。</p>
      <ol className="space-y-2">{frames.map((item, index) => <li key={item.start}><button className="w-full rounded-xl border border-zinc-700 p-4 text-left hover:bg-white/5" onClick={() => { jump(index); setModal(null); }}>
        <span className="mb-2 block font-mono text-xs text-zinc-400">{index + 1} / {frames.length}</span>
        <span lang="en" className="block break-words font-medium leading-7 [overflow-wrap:anywhere]">{item.text}</span>
        {item.chunk.jp && <span className="mt-2 block text-sm leading-7 text-zinc-300">{item.chunk.jp}</span>}
      </button></li>)}</ol>
    </Modal>}
  </main>;
}
