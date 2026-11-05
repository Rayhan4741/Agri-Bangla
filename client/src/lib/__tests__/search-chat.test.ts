import { describe, expect, it } from 'vitest';
import { normalize, search, stem, tokenize } from '../search';
import { answer, detectCrop, detectIntents, DEFAULT_FOLLOWUPS } from '../chatEngine';
import { redactSecrets } from '../aiProvider';

describe('Bangla text processing', () => {
  it('strips common inflections', () => {
    expect(stem('ধানের'.normalize('NFC'))).toBe('ধান');
    expect(stem('টমেটোর'.normalize('NFC'))).toBe('টমেটো');
    expect(stem('পাতায়'.normalize('NFC'))).toBe('পাতা'.normalize('NFC'));
  });
  it('drops punctuation and stop words', () => {
    expect(tokenize('আমার ধানের পাতা হলুদ হচ্ছে কেন?')).toEqual(['ধান', 'পাতা', 'হলুদ'].map((s) => s.normalize('NFC')));
    expect(normalize('  Hello,  World! ')).toBe('hello world');
  });
});

describe('search', () => {
  it('finds rice blast from symptoms', () => {
    const hits = search('ধানের পাতায় চোখের মতো দাগ');
    expect(hits.slice(0, 5).map((h) => h.doc.id)).toContain('rice-blast');
  });
  it('filters by kind', () => {
    const hits = search('পুকুর', { kinds: ['fisheries'] });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.doc.kind === 'fisheries')).toBe(true);
  });
  it('returns nothing for empty query', () => {
    expect(search('   ')).toEqual([]);
  });
});

describe('chat engine', () => {
  it('detects crops and intents', () => {
    expect(detectCrop('টমেটোর পাতায় দাগ')).toBe('tomato');
    // 'হলুদ' (yellow) must not be mistaken for the turmeric crop
    expect(detectCrop('আমার ধানের পাতা হলুদ হচ্ছে')).toMatch(/rice/);
    expect(detectCrop('হলুদ চাষ কীভাবে করব')).toBe('turmeric');
    expect(detectIntents('গরু খাবার খাচ্ছে না')).toContain('livestock');
    expect(detectIntents('পুকুরের মাছ')).toContain('fisheries');
  });

  it.each(DEFAULT_FOLLOWUPS)('answers suggested question: %s', (q) => {
    const a = answer(q);
    expect(a.matched).toBe(true);
    expect(a.text.length).toBeGreaterThan(40);
    expect(a.status).toBe('illustrative');
  });

  it('yellow rice leaves → FAQ with steps, uncertainty and BRRI/DAE sources', () => {
    const a = answer('আমার ধানের পাতা হলুদ হচ্ছে কেন?');
    expect(a.steps?.length).toBeGreaterThan(2);
    expect(a.uncertainty).toBeTruthy();
    expect(a.sources.map((s) => s.id)).toEqual(expect.arrayContaining(['brri']));
  });

  it('veterinary question carries a vet disclaimer and DLS', () => {
    const a = answer('গরু খাবার খাচ্ছে না, কী করব?');
    expect(a.uncertainty).toMatch(/পশু চিকিৎসক/);
    expect(a.sources.map((s) => s.id)).toContain('dls');
  });

  it('fertilizer question does not invent a dose', () => {
    const a = answer('এক বিঘা জমিতে কী পরিমাণ সার প্রয়োজন?');
    expect(a.text).toMatch(/সুপারিশ করে না/);
    expect(a.text).not.toMatch(/\d+\s*কেজি/);
  });

  it('falls back gracefully for unknown questions', () => {
    const a = answer('xyzzy qwerty');
    expect(a.matched).toBe(false);
    expect(a.sources.length).toBeGreaterThan(0);
  });

  it('responds to greetings', () => {
    expect(answer('হ্যালো').text).toMatch(/কৃষকবন্ধু/);
  });
});

describe('secret redaction', () => {
  it('removes key-looking strings', () => {
    expect(redactSecrets('my key sk-abcdefghijklmnop123')).not.toMatch(/sk-abc/);
  });
});
