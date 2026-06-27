export interface Chunk {
  en: string;
  jp: string;
  speaker?: string | null;
}

export enum WPM {
  COMMON_TEST = 120,
  DIFFICULT_UNIV = 150,
  NATIVE = 180,
}

export type AppState = 'INPUT' | 'PROCESSING' | 'READING' | 'RESULT';

export interface ReadingConfig {
  wpm: number;
  text: string;
}
