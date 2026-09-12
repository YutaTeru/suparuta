import { useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronDown, Clock, Copy, History, Star, Trash2, Upload } from 'lucide-react';
import type { Chunk } from './types';
import { parseTextLocal } from './services/localParser';
import { buildFrames, formatDuration, frameDuration } from './services/reading';
import { HISTORY_KEY, readHistory, saveReading, trimHistory, type SavedItem } from './services/history';
import { ReaderCanvas } from './components/ReaderCanvas';
import { SpeedSelector } from './components/SpeedSelector';
import { Button } from './components/Button';

function loadInitialHistory() {
  try { return { items: readHistory(localStorage.getItem(HISTORY_KEY)), error: '' }; }
  catch { return { items: [] as SavedItem[], error: '履歴を読み込めませんでした。既存データを保護するため、この画面では保存を停止しています。' }; }
}

export default function App() {
  const [initialHistory] = useState(loadInitialHistory);
  const [savedItems, setSavedItems] = useState(initialHistory.items);
  const [storageError, setStorageError] = useState(initialHistory.error);
  const [inputText, setInputText] = useState('');
  const [wpm, setWpm] = useState(110);
  const [chunks, setChunks] = useState<Chunk[] | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [ended, setEnded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    try {
      const parsed = parseTextLocal(inputText);
      const frames = buildFrames(parsed);
      return { parsed, words: frames.reduce((sum, frame) => sum + frame.wordCount, 0),
        duration: frames.reduce((sum, frame) => sum + frameDuration(frame, wpm), 0) };
    } catch { return null; }
  }, [inputText, wpm]);

  function updateHistory(next: SavedItem[]) {
    setSavedItems(next);
    if (initialHistory.error) return;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); setStorageError(''); }
    catch { setStorageError('履歴を保存できませんでした。端末の空き容量やブラウザの保存設定をご確認ください。'); }
  }

  function start() {
    try {
      const result = parseTextLocal(inputText);
      if (!result.length) throw new Error('読む英文を貼り付けてください。');
      updateHistory(saveReading(savedItems, inputText, wpm));
      setError(''); setEnded(false); setChunks(result);
    } catch (err) { setError(err instanceof Error ? err.message : '英文を読み込めませんでした。'); }
  }

  async function readFile(file?: File) {
    if (!file) return;
    if (!/\.(txt|json)$/i.test(file.name)) { setError('テキスト（.txt）またはJSON（.json）ファイルを選んでください。'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('ファイルは2MB以内で選んでください。'); return; }
    setFileLoading(true);
    try { setInputText(await file.text()); setError(''); setEnded(false); }
    catch { setError('ファイルを読み込めませんでした。もう一度選んでください。'); }
    finally { setFileLoading(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  async function copyPrompt() {
    const prompt = `以下の英文を意味のかたまり（1〜7単語程度）に分割し、日本語訳を付けてください。
純粋なJSON配列のみ出力し、説明やマークダウン装飾は付けないでください。
形式: [{"en":"英文のかたまり","jp":"その部分の日本語訳","speaker":null}]
英文の単語を省略・変更せず、元の順序を保ってください。
熟語のまとまり、接続詞、前置詞、関係代名詞、句読点を考慮し、機械的に途中で切らず自然に区切ってください。
日本語訳は各部分に対応する、前から理解できる訳にしてください。

【対象の英文】
${inputText.trim() || '[ここに英文を貼り付けてください]'}`;
    try { await navigator.clipboard.writeText(prompt); setCopied(true); }
    catch { setCopied(false); setError('コピーできませんでした。ブラウザのクリップボード権限をご確認ください。'); }
  }

  function loadItem(item: SavedItem) {
    setInputText(item.text); setWpm(item.wpm); setEnded(false); setError('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  if (chunks) return <ReaderCanvas chunks={chunks} wpm={wpm}
    onBack={currentWpm => { setWpm(currentWpm); setChunks(null); }}
    onExit={currentWpm => { setWpm(currentWpm); setChunks(null); setInputText(''); setEnded(true); }} />;

  const visibleHistory = favoritesOnly ? savedItems.filter(item => item.isFavorite) : savedItems;
  return <main className="mx-auto min-h-screen w-full max-w-xl px-5 pb-10 pt-10 sm:px-6 sm:pt-14">
    <header className="mb-9">
      <div className="mb-7 flex items-center gap-2 text-sm font-extrabold tracking-wider">
        <span className="h-4 w-1 bg-spartan-red" aria-hidden="true" /> SPARTAN <span className="text-zinc-400">READER</span>
      </div>
      <h1 className="text-[clamp(1.8rem,6vw,2.6rem)] font-extrabold leading-snug tracking-tight">英語は、前から読んで<br /><span className="text-spartan-neon">終わらせる。</span></h1>
      <p className="mt-4 text-sm leading-7 text-zinc-400">英文を貼る。かたまりごとに読む。読み切る。</p>
    </header>

    {ended && <div role="status" className="mb-6 rounded-xl border border-zinc-700 bg-spartan-gray p-4 text-sm leading-6"><span className="font-bold text-white">今日は、ここまで。</span><br /><span className="text-zinc-300">読んだ英文は履歴から開けます。</span></div>}
    <section aria-label="読む英文" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="reading-text" className="flex items-center gap-2 text-sm font-bold"><BookOpen size={17} className="text-zinc-400" />読む英文</label>
        <button className="quiet-button" onClick={() => fileInput.current?.click()} disabled={fileLoading}><Upload size={15} />ファイルから</button>
        <input type="file" ref={fileInput} accept=".txt,.json" className="hidden" onChange={e => void readFile(e.target.files?.[0])} />
      </div>
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); void readFile(e.dataTransfer.files[0]); }}
        className={`rounded-xl border transition-colors ${dragging ? 'border-spartan-neon bg-spartan-red/10' : 'border-zinc-700 bg-spartan-gray focus-within:border-zinc-400'}`}>
        <textarea id="reading-text" value={inputText} disabled={fileLoading} spellCheck={false}
          aria-describedby="input-help" aria-invalid={Boolean(error)} onChange={e => { setInputText(e.target.value); setError(''); setCopied(false); }}
          placeholder="ここに読みたい英文を貼り付ける"
          className="block min-h-40 w-full resize-y rounded-xl bg-transparent p-4 text-base leading-7 text-white placeholder:text-zinc-500 focus-visible:outline-offset-0" />
      </div>
      <p id="input-help" className="text-xs leading-6 text-zinc-400">英文だけですぐ読めます。日本語訳は、訳付き教材を読み込むと表示できます。</p>
      <details className="rounded-xl border border-zinc-800">
        <summary className="cursor-pointer px-4 py-3 text-sm text-zinc-300">速度：{wpm === 110 ? '標準 ' : ''}<span className="font-mono">{wpm} WPM</span><span className="ml-2 text-zinc-400">変更</span></summary>
        <div className="border-t border-zinc-800 p-4"><SpeedSelector selectedWpm={wpm} onSelect={setWpm} /></div>
      </details>

      {inputText.trim() && preview && preview.words > 0 && <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm text-zinc-300">
        <span className="font-mono">{preview.words} words</span><span className="flex items-center gap-1.5"><Clock size={15} />読了まで 約{formatDuration(preview.duration)}</span>
      </div>}
      {error && <p role="alert" className="rounded-lg border border-spartan-neon/40 bg-spartan-red/10 p-3 text-sm leading-6 text-rose-200">{error}</p>}
      <Button disabled={!inputText.trim() || fileLoading} onClick={start}>読み始める <ArrowRight size={19} /></Button>
      <p className="text-center text-xs text-zinc-400">2秒後にスタート。途中で止めても大丈夫。</p>
    </section>

    <details className="mt-7 border-t border-zinc-800 pt-3">
      <summary className="cursor-pointer py-3 text-sm text-zinc-400">日本語訳付きで読むには</summary>
      <div className="space-y-3 pb-4 text-sm leading-7 text-zinc-300">
        <p>① 英文を貼って、下のボタンで依頼文をコピー。<br />② ChatGPTなどのAIに貼り付ける。<br />③ 返ってきた教材データを、この入力欄に貼り付ける。</p>
        <button className="quiet-button border border-zinc-700" onClick={() => void copyPrompt()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'コピーしました' : '訳付き教材を作る依頼文をコピー'}</button>
        <p role="status" className="text-xs text-zinc-400">{copied ? 'AIに貼り付けて、教材データを作成してください。' : 'このアプリ内では自動翻訳しません。AIの訳や区切りは確認して使ってください。'}</p>
      </div>
    </details>

    {savedItems.length > 0 && <section className="mt-3 border-t border-zinc-800 pt-2">
      <button className="quiet-button w-full justify-between px-0" aria-expanded={showHistory} aria-controls="reading-history" onClick={() => setShowHistory(!showHistory)}>
        <span className="flex items-center gap-2"><History size={16} />履歴・お気に入り <span className="text-zinc-500">{savedItems.length}</span></span><ChevronDown size={16} className={showHistory ? 'rotate-180' : ''} />
      </button>
      {showHistory && <div id="reading-history" className="mt-3 space-y-3">
        <div className="flex gap-2"><button className="choice px-4" aria-pressed={!favoritesOnly} onClick={() => setFavoritesOnly(false)}>すべて</button><button className="choice px-4" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(true)}>お気に入り</button></div>
        <p className="text-xs text-zinc-400">このブラウザに保存。通常の履歴は15件、お気に入りは件数制限なし。</p>
        {visibleHistory.length === 0 && <p className="py-3 text-sm text-zinc-400">星を押すと、ここに残せます。</p>}
        {visibleHistory.map(item => {
          let title = item.text;
          try { title = parseTextLocal(item.text).slice(0, 2).map(chunk => chunk.en).join(' '); } catch { /* Preserve access to old, invalid entries for editing. */ }
          return <div key={item.id} className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-spartan-gray p-2">
            <button className="min-w-0 flex-1 rounded-lg p-2 text-left hover:bg-white/5" onClick={() => loadItem(item)}>
              <span className="block truncate text-sm font-medium">{title}</span>
              <span className="mt-1 block text-xs text-zinc-400">{item.wpm} WPM · {new Date(item.timestamp).toLocaleDateString('ja-JP')}</span>
            </button>
            <button className="quiet-button shrink-0 px-3" aria-label={item.isFavorite ? 'お気に入りを解除' : 'お気に入りに登録'} aria-pressed={item.isFavorite}
              onClick={() => updateHistory(trimHistory(savedItems.map(saved => saved.id === item.id ? { ...saved, isFavorite: !saved.isFavorite } : saved)))}>
              <Star size={18} className={item.isFavorite ? 'text-spartan-neon' : ''} fill={item.isFavorite ? 'currentColor' : 'none'} /></button>
            <button className="quiet-button shrink-0 px-3" aria-label="この履歴を削除" onClick={() => updateHistory(savedItems.filter(saved => saved.id !== item.id))}><Trash2 size={17} /></button>
          </div>;
        })}
      </div>}
    </section>}
    {storageError && <p role="alert" className="mt-4 text-sm leading-6 text-rose-200">{storageError}</p>}
    <footer className="mt-9 text-xs text-zinc-500">英語に使う時間を、前に進む時間に。</footer>
  </main>;
}
