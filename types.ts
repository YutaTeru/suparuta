export interface Chunk {
  en: string;
  jp: string;
  speaker?: string | null;
}

export enum WPM {
  SLOW = 70,
  NORMAL = 110,
  FAST = 160,
}

export type AppState = 'INPUT' | 'PROCESSING' | 'READING' | 'RESULT';

export interface ReadingConfig {
  wpm: number;
  text: string;
}
