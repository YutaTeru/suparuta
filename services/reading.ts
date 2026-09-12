import type { Chunk } from '../types';

export interface DisplayFrame {
  text: string;
  chunk: Chunk;
  wordCount: number;
  start: number;
  end: number;
}

export function buildFrames(chunks: Chunk[], groupSize = 0): DisplayFrame[] {
  const frames: DisplayFrame[] = [];
  let offset = 0;
  for (const chunk of chunks) {
    const words = chunk.en.trim().split(/\s+/).filter(Boolean);
    const size = groupSize || words.length;
    if (!size) continue;
    for (let i = 0; i < words.length; i += size) {
      const group = words.slice(i, i + size);
      frames.push({ text: group.join(' '), chunk, wordCount: group.length, start: offset, end: offset + group.length });
      offset += group.length;
    }
  }
  return frames;
}

export function frameAtWord(frames: DisplayFrame[], word: number) {
  const index = frames.findIndex(frame => word < frame.end);
  return index < 0 ? Math.max(0, frames.length - 1) : index;
}

export function frameDuration(frame: DisplayFrame, wpm: number, translationDelay = 0, showTranslation = false) {
  return Math.max(300, frame.wordCount / wpm * 60000) +
    (showTranslation && frame.chunk.jp.trim() ? translationDelay * 1000 : 0);
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  return seconds < 60 ? `${seconds}秒` : `${Math.floor(seconds / 60)}分${seconds % 60 ? `${seconds % 60}秒` : ''}`;
}
