import { Chunk } from "../types";

/**
 * Parses English text locally.
 * Supports:
 * 1. JSON Array (strings or objects with 'en' property)
 * 2. Newline-separated chunks (1 chunk per line, automatically triggered when lines have a small average length)
 * 3. Intelligent rule-based natural phrase chunking (max 7 words per chunk, splitting at punctuation, conjunctions, prepositions, etc.)
 */
export const parseTextLocal = (text: string): Chunk[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // --- 1. Attempt JSON Parsing (JSON Array of strings or objects) ---
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const chunks: Chunk[] = [];
      for (const item of parsed) {
        if (typeof item === 'string' && item.trim()) {
          chunks.push({ en: item.trim(), jp: "", speaker: null });
        } else if (item && typeof item === 'object' && typeof item.en === 'string' && item.en.trim()) {
          chunks.push({
            en: item.en.trim(),
            jp: typeof item.jp === 'string' ? item.jp.trim() : "",
            speaker: typeof item.speaker === 'string' ? item.speaker.trim() : null
          });
        }
      }
      if (chunks.length > 0) {
        return chunks;
      }
    }
  } catch (e) {
    // Not a valid JSON, fallback to other parsing methods
  }

  // --- 2. Attempt Newline-separated chunks if there are multiple lines ---
  // If the user pasted chunks separated by newlines, we treat each non-empty line as a chunk.
  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length > 1) {
    const totalWords = lines.reduce((acc, line) => acc + line.split(/\s+/).length, 0);
    const avgWordsPerLine = totalWords / lines.length;
    // If average word count per line is small (<= 10 words), it's likely pre-chunked by the user
    if (avgWordsPerLine <= 10) {
      return lines.map(line => ({ en: line, jp: "", speaker: null }));
    }
  }

  // --- 3. Intelligent Rule-Based Local Chunking (Max 7 words) ---
  // We reconstruct chunks using grammar-based splitting points:
  const words = trimmed.replace(/\s+/g, ' ').split(' ');
  const chunks: Chunk[] = [];
  
  let currentWords: string[] = [];
  
  const conjunctions = new Set([
    'and', 'but', 'or', 'because', 'although', 'since', 'unless', 'while', 'when', 'if', 'so', 'yet', 'nor', 'as'
  ]);
  const prepositions = new Set([
    'in', 'on', 'at', 'for', 'with', 'by', 'from', 'of', 'about', 'between', 'through', 'during', 'under', 'into', 'with'
  ]);
  const relatives = new Set([
    'who', 'which', 'that', 'whom', 'whose', 'what', 'how', 'where', 'why'
  ]);
  const punctuationRegex = /[.,?!;:、。]/;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    const hasPunctuation = punctuationRegex.test(word);

    // Decision: should we start a new chunk before this word?
    const isSplitMarker = 
      conjunctions.has(cleanWord) || 
      prepositions.has(cleanWord) || 
      relatives.has(cleanWord) ||
      cleanWord === 'to';

    // We start a new chunk if:
    // 1. Current chunk is not empty, AND
    // 2. Either:
    //    a) We reached a split marker (preposition, conjunction, etc.) AND the current chunk already has at least 3 words (to avoid tiny 1-2 word chunks)
    //    b) The current chunk has reached the max of 7 words.
    if (currentWords.length > 0) {
      const isTooLong = currentWords.length >= 7;
      const isReasonableLength = currentWords.length >= 3;

      if (isTooLong || (isSplitMarker && isReasonableLength)) {
        chunks.push({
          en: currentWords.join(' '),
          jp: "",
          speaker: null
        });
        currentWords = [];
      }
    }

    currentWords.push(word);

    // If the word has a punctuation (like a period or comma), we always close the chunk immediately
    if (hasPunctuation && currentWords.length > 0) {
      chunks.push({
        en: currentWords.join(' '),
        jp: "",
        speaker: null
      });
      currentWords = [];
    }
  }

  // Push any remaining words
  if (currentWords.length > 0) {
    chunks.push({
      en: currentWords.join(' '),
      jp: "",
      speaker: null
    });
  }

  return chunks;
};
