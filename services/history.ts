export const HISTORY_KEY = 'spartan_reader_history';
export interface SavedItem {
  id: string; text: string; wpm: number; mode: 'ai' | 'local'; timestamp: number; isFavorite: boolean;
}

export function readHistory(raw: string | null): SavedItem[] {
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('保存された履歴の形式を確認できません。');
  const result: SavedItem[] = [];
  for (const item of data) {
    if (!item || typeof item.id !== 'string' || typeof item.text !== 'string' ||
      typeof item.wpm !== 'number' || !Number.isFinite(item.wpm) ||
      typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp)) {
      throw new Error('保存された履歴の形式を確認できません。');
    }
    result.push({ ...item, wpm: Math.min(160, Math.max(70, Math.round(item.wpm / 10) * 10)),
      mode: item.mode === 'ai' ? 'ai' : 'local', isFavorite: item.isFavorite === true });
  }
  return result;
}

export function trimHistory(items: SavedItem[]) {
  let recent = 0;
  return items.filter(item => item.isFavorite || ++recent <= 15);
}

export function saveReading(items: SavedItem[], text: string, wpm: number, now = Date.now()): SavedItem[] {
  const existing = items.find(item => item.text.trim() === text.trim());
  return trimHistory([{ id: existing?.id ?? crypto.randomUUID(), text: text.trim(), wpm,
    mode: 'local', timestamp: now, isFavorite: existing?.isFavorite ?? false },
    ...items.filter(item => item !== existing)]);
}
