import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTextLocal } from '../services/localParser.ts';
import { buildFrames, frameAtWord, frameDuration } from '../services/reading.ts';
import { readHistory, saveReading, trimHistory, type SavedItem } from '../services/history.ts';

test('invalid JSON is rejected without silently losing individual entries', () => {
  for (const input of ['[]', '{"en":"Hello"}', '[{"en":"Hello"},{"en":12}]', '[{"en":"Hello","jp":9}]', '[{"en":"Hello"}']) {
    assert.throws(() => parseTextLocal(input));
  }
});

test('prepared chunks, translations, and speaker labels round-trip without dropping words', () => {
  const chunks = [{ en: 'Life is short.', jp: '人生は短い。', speaker: 'Yuta' }, { en: 'Keep moving forward.', jp: '前に進もう。', speaker: null }];
  assert.deepEqual(parseTextLocal(JSON.stringify(chunks)), chunks);
  assert.deepEqual(parseTextLocal('```json\n' + JSON.stringify(chunks) + '\n```'), chunks);
  assert.equal(buildFrames(chunks, 1).map(frame => frame.text).join(' '), chunks.map(chunk => chunk.en).join(' '));
});

test('ordinary English keeps words and does not split the title Dr. from its name', () => {
  const text = 'Dr. Smith reads English every day. He reads with his students.';
  const chunks = parseTextLocal(text);
  assert.equal(chunks.map(chunk => chunk.en).join(' '), text);
  assert.ok(chunks[0].en.startsWith('Dr. Smith'));
  assert.ok(chunks.every(chunk => chunk.en.split(/\s+/).length <= 7));
});

test('changing display grouping locates the same word rather than the old frame index', () => {
  const chunks = [{ en: 'One two three four.', jp: '' }, { en: 'Five six seven.', jp: '' }];
  for (const size of [0, 1, 2, 3, 4, 5]) {
    const frames = buildFrames(chunks, size);
    const current = frames[frameAtWord(frames, 5)];
    assert.ok(current.start <= 5 && current.end > 5);
  }
});

test('translation wait contributes time only for a visible translation', () => {
  const frame = buildFrames([{ en: 'Life is short.', jp: '人生は短い。' }])[0];
  assert.equal(frameDuration(frame, 120, 3, true), 4500);
  assert.equal(frameDuration(frame, 120, 3, false), 1500);
  assert.equal(frameDuration({ ...frame, chunk: { en: frame.text, jp: '' } }, 120, 3, true), 1500);
});

function entry(id: number, favorite = false): SavedItem {
  return { id: String(id), text: `Text ${id}`, wpm: 110, mode: 'local', timestamp: id, isFavorite: favorite };
}

test('favorites survive more than fifteen new readings and deduplication', () => {
  let items = [entry(0, true)];
  for (let i = 1; i <= 25; i++) items = saveReading(items, `Text ${i}`, 110, i);
  assert.equal(items.length, 16);
  assert.equal(items.filter(item => !item.isFavorite).length, 15);
  assert.equal(items.find(item => item.id === '0')?.isFavorite, true);
  items = saveReading(items, ' Text 0 ', 160, 26);
  assert.equal(items[0].id, '0');
  assert.equal(items[0].isFavorite, true);
  assert.equal(items[0].wpm, 160);
  assert.equal(trimHistory(items).length, 16);
});

test('legacy local history remains readable; malformed storage is never silently overwritten', () => {
  assert.deepEqual(readHistory(JSON.stringify([entry(1)])), [entry(1)]);
  assert.equal(readHistory(JSON.stringify([{ ...entry(1), wpm: 999 }]))[0].wpm, 160);
  assert.throws(() => readHistory('{}'));
  assert.throws(() => readHistory('[{"text":"recover me"}]'));
});
