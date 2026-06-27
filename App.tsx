import React, { useState, useEffect, useRef } from 'react';
import { Chunk, WPM, AppState } from './types';
import { parseTextToChunks } from './services/geminiService';
import { parseTextLocal } from './services/localParser';
import { ReaderCanvas } from './components/ReaderCanvas';
import { SpeedSelector } from './components/SpeedSelector';
import { Button } from './components/Button';
import { BrainCircuit, BookOpen, AlertTriangle, Zap, Cpu, Upload, History, Star, Trash2, FileText, Check } from 'lucide-react';

interface SavedItem {
  id: string;
  text: string;
  wpm: number;
  mode: 'ai' | 'local';
  timestamp: number;
  isFavorite: boolean;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('INPUT');
  const [inputText, setInputText] = useState('');
  const [wpm, setWpm] = useState<number>(WPM.DIFFICULT_UNIV);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 'ai' | 'local'
  const [mode, setMode] = useState<'ai' | 'local'>('local');

  // History & Favorites from LocalStorage
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const saved = localStorage.getItem('spartan_reader_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('spartan_reader_history', JSON.stringify(savedItems));
  }, [savedItems]);

  const copyAIPrompt = () => {
    const textToEmbed = inputText.trim() || "[ここにあなたの英文を貼り付けてください]";
    const promptText = `以下の英文を、意味の固まり（1〜7単語程度）に分割し、JSON形式の配列で出力してください。余計な説明や\`\`\`jsonなどのマークダウン装飾は一切含めず、純粋なJSON配列データのみを出力してください。

【出力フォーマット】
[
  { "en": "意味の固まりの英文", "jp": "その部分の日本語訳（可能であれば直訳に近い形で）", "speaker": null },
  ...
]

【分割ルール】
- 1つの要素（en）は最大7単語までにしてください。
- 接続詞、前置詞、関係代名詞、カンマやピリオドなどの区切りを意識して、自然な意味の固まりに分割してください。
- 日本語訳（jp）は、その部分だけの直訳に近い、戻り読みをしない自然な訳にしてください。

【対象の英文】
${textToEmbed}`;

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const saveToHistory = (text: string, currentWpm: number, currentMode: 'ai' | 'local') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    setSavedItems(prev => {
      const existing = prev.find(item => item.text.trim() === trimmed);
      const isFavorite = existing ? existing.isFavorite : false;
      const filtered = prev.filter(item => item.text.trim() !== trimmed);
      
      const newItem: SavedItem = {
        id: existing?.id || Math.random().toString(36).substring(2, 9),
        text: trimmed,
        wpm: currentWpm,
        mode: currentMode,
        timestamp: Date.now(),
        isFavorite
      };
      
      const updated = [newItem, ...filtered];
      return updated.slice(0, 15); // limit to 15 items
    });
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedItems(prev => prev.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  const deleteSavedItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedItems(prev => prev.filter(item => item.id !== id));
  };

  const loadSavedItem = (item: SavedItem) => {
    setInputText(item.text);
    setWpm(item.wpm);
    setMode(item.mode);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setInputText(content);
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) {
      setError("英文を入力してください。");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAppState('PROCESSING');

    try {
      let result: Chunk[];
      
      if (mode === 'ai') {
        // Use Gemini API
        result = await parseTextToChunks(inputText);
      } else {
        // Use Local Parser (Instant)
        // Simulate a tiny delay for UX feels
        await new Promise(resolve => setTimeout(resolve, 500)); 
        result = parseTextLocal(inputText);
      }

      saveToHistory(inputText, wpm, mode);
      setChunks(result);
      setAppState('READING');
    } catch (err) {
      console.error(err);
      setError("処理に失敗しました。入力データ（JSONやテキスト）に誤りがないかご確認ください。");
      setAppState('INPUT');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAppState('INPUT');
    setInputText('');
    setChunks([]);
  };

  if (appState === 'READING' || appState === 'RESULT') {
    return (
      <ReaderCanvas 
        chunks={chunks} 
        wpm={wpm} 
        onFinish={() => setAppState('RESULT')}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="min-h-screen bg-spartan-black text-white p-6 flex flex-col items-center justify-center font-sans">
      <div className="max-w-xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-spartan-neon/10 text-spartan-neon mb-4">
            <BrainCircuit size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white">
            SPARTAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-spartan-neon to-purple-500">READER</span>
          </h1>
          <p className="text-gray-400 font-medium">
            戻り読みを撲滅し、英語脳を鍛える。
          </p>
        </div>

        {/* Configuration Section */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Mode Selector */}
          <div className="bg-spartan-gray p-1 rounded-xl flex">
            <button 
              onClick={() => setMode('local')}
              className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'local' ? 'bg-spartan-neon text-spartan-black shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Zap size={16} fill={mode === 'local' ? 'currentColor' : 'none'} />
              スマート・チャンカー (ローカル)
            </button>
            <button 
              onClick={() => setMode('ai')}
              className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'ai' ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Cpu size={16} />
              AI 拡張モード (Gemini API)
            </button>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
               <label className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                 <BookOpen size={16} /> 英文テキスト
               </label>
               <div className="flex items-center gap-3">
                 <button
                   type="button"
                   onClick={() => fileInputRef.current?.click()}
                   className="text-xs text-gray-400 hover:text-spartan-neon flex items-center gap-1 transition-all"
                   title="JSON形式、または通常のテキストファイルをアップロード"
                 >
                   <Upload size={12} /> ファイル選択
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   accept=".json,.txt" 
                   className="hidden" 
                 />
                 <button
                   type="button"
                   onClick={copyAIPrompt}
                   className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all duration-300 ${
                     copiedPrompt
                       ? 'bg-green-500/20 border-green-400/50 text-green-400 shadow-[0_0_8px_rgba(74,222,128,0.2)]'
                       : 'bg-purple-500/10 border-purple-500/30 hover:border-purple-400 text-purple-400 hover:text-white hover:bg-purple-500/20 shadow-sm'
                   }`}
                 >
                   <Cpu size={12} className={copiedPrompt ? 'animate-bounce' : ''} />
                   {copiedPrompt ? 'コピー完了！ ✓' : '他AI用分割プロンプトをコピー'}
                 </button>
                 {mode === 'local' && (
                   <span className="text-xs bg-spartan-neon/10 border border-spartan-neon/20 px-2 py-1 rounded text-spartan-neon font-mono uppercase">
                     JSON・改行対応
                   </span>
                 )}
               </div>
            </div>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 transition-all duration-300 ${
                isDragging 
                  ? 'border-spartan-neon bg-spartan-neon/5 scale-[1.01]' 
                  : 'border-transparent bg-spartan-gray'
              }`}
            >
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="英語の文章、改行区切りのテキスト、またはJSON配列を貼り付けてください。&#10;&#10;【入力例1：通常の英文（自動でチャンク分割されます）】&#10;I have a dream that one day...&#10;&#10;【入力例2：自分で改行した英文】&#10;In the morning,&#10;I go to school.&#10;&#10;【入力例3：日本語訳つきのJSON形式（推奨：APIを使わず完璧に動作します）】&#10;[&#10;  { &quot;en&quot;: &quot;In the morning,&quot;, &quot;jp&quot;: &quot;朝に、&quot; },&#10;  { &quot;en&quot;: &quot;I go to school.&quot;, &quot;jp&quot;: &quot;私は学校に行きます。&quot; }&#10;]"
                className="w-full h-48 bg-transparent rounded-xl p-4 text-base text-white placeholder-gray-600 outline-none resize-none font-sans"
                disabled={isLoading}
              />
              
              {isDragging && (
                <div className="absolute inset-0 bg-spartan-black/85 flex flex-col items-center justify-center rounded-xl border border-dashed border-spartan-neon pointer-events-none animate-in fade-in duration-200">
                  <Upload className="text-spartan-neon mb-2 animate-bounce" size={32} />
                  <p className="text-spartan-neon font-bold text-sm">ここにドロップしてJSON/テキストを読み込む</p>
                </div>
              )}
            </div>
          </div>
 
          {/* Speed Selector */}
          <div className="space-y-2">
             <label className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <AlertTriangle size={16} /> ターゲット表示速度 (WPM)
            </label>
            <SpeedSelector selectedWpm={wpm} onSelect={setWpm} />
          </div>
 
          {/* Error Message */}
          {error && (
            <div className="bg-spartan-red/10 border border-spartan-red/50 text-spartan-red p-4 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
 
          {/* Action Button */}
          <Button 
            variant={mode === 'ai' ? 'primary' : 'neon'} 
            onClick={handleProcess} 
            isLoading={isLoading}
            disabled={!inputText.trim()}
          >
            {isLoading ? '処理中...' : (mode === 'ai' ? 'AIで解析してスタート' : 'チャンク読みを開始')}
          </Button>
 
          <div className="text-center text-xs text-gray-600">
             {mode === 'ai' ? 'Gemini 2.5 Flash を使用 • 自動翻訳および話者検出が含まれます' : 'ローカル実行中 • 賢い自動分割 / 改行分割 / 日本語訳付きJSON形式に対応 (API不要)'}
          </div>

          {/* Local History & Favorites Section */}
          {savedItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-800/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <History size={14} /> 学習履歴とお気に入り
                </h3>
                <span className="text-[10px] text-gray-600">最大15件保存</span>
              </div>
              
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {savedItems.map((item) => {
                  // Preview text extraction
                  let preview = item.text.trim();
                  if (preview.startsWith('[') || preview.startsWith('{')) {
                    try {
                      const parsed = JSON.parse(preview);
                      if (Array.isArray(parsed) && parsed.length > 0) {
                        preview = typeof parsed[0] === 'string' 
                          ? parsed[0] 
                          : (parsed[0].en || parsed[0].text || preview);
                      }
                    } catch(e) {}
                  }
                  if (preview.length > 60) {
                    preview = preview.substring(0, 60) + '...';
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => loadSavedItem(item)}
                      className="group flex items-center justify-between p-3 bg-spartan-gray/40 hover:bg-spartan-gray border border-gray-800/40 hover:border-gray-700/80 rounded-xl cursor-pointer transition-all text-left duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          <FileText size={16} className="text-gray-500 group-hover:text-spartan-neon transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
                            {preview || '空のテキスト'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-mono">
                            <span>{item.wpm} WPM</span>
                            <span>•</span>
                            <span>{item.mode === 'ai' ? 'AI' : 'LOCAL'}</span>
                            <span>•</span>
                            <span>{new Date(item.timestamp).toLocaleDateString('ja-JP')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(item.id, e)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-gray-800/50 transition-all"
                          title="お気に入りに登録"
                        >
                          <Star 
                            size={14} 
                            fill={item.isFavorite ? 'currentColor' : 'none'} 
                            className={item.isFavorite ? 'text-yellow-400' : ''} 
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteSavedItem(item.id, e)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-spartan-red hover:bg-gray-800/50 transition-all"
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;