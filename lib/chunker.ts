export const CHUNK_SIZE = 500; // tokens (approximated as chars / 4)
export const CHUNK_OVERLAP = 50; // tokens

// ~4 chars per token and ~5 chars per English word (incl. the space),
// so 50 tokens ≈ 200 chars ≈ 40 words.
const OVERLAP_WORDS = Math.ceil((CHUNK_OVERLAP * 4) / 5);

// Hard-split size for text with no spaces: exactly CHUNK_SIZE estimated tokens.
const MAX_CHARS = CHUNK_SIZE * 4;

// A sentence ends at . ! or ? followed by whitespace. We split ON that whitespace
// instead of matching whole sentences, so no text can be dropped, and "3.14" or
// "U.S.A." stay intact because there is no whitespace inside them.
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;
const WORD_BOUNDARY = /\s+/;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface Unit {
  text: string;
  sep: string; // what joins this unit to the one before it
}

/**
 * Splits text into overlapping chunks of at most CHUNK_SIZE (estimated) tokens.
 * Splits on paragraph breaks first, then sentences, then words, then raw characters,
 * only going finer when a piece is still too big. Adjacent chunks share ~40 words.
 */
export function chunkText(text: string): string[] {
  // first replace "\r\n" which is windows style to just "\n"
  // second make it so only max of 2 newlines between text
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  const units: Unit[] = [];
  for (const para of cleaned.split(/\n\n+/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    splitUntilFits(trimmed).forEach((piece, i) =>
      units.push({ text: piece, sep: i === 0 ? "\n\n" : " " })
    );
  }

  return pack(units);
}

/** Splits at the coarsest boundary needed so that every piece fits in CHUNK_SIZE. */
function splitUntilFits(text: string): string[] {
  if (estimateTokens(text) <= CHUNK_SIZE) return [text];

  for (const boundary of [SENTENCE_BOUNDARY, WORD_BOUNDARY]) {
    const parts = text.split(boundary).filter(Boolean);
    if (parts.length > 1) return parts.flatMap(splitUntilFits);
  }

  // No sentence or word boundaries left (e.g. a long URL or base64 blob): cut by length
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHARS) {
    pieces.push(text.slice(i, i + MAX_CHARS));
  }
  return pieces;
}

function pack(units: Unit[]): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const { text, sep } of units) {
    const candidate = current ? current + sep + text : text;
    if (estimateTokens(candidate) <= CHUNK_SIZE) {
      current = candidate;
      continue;
    }

    chunks.push(current);
    // Only carry as much overlap as still fits next to the incoming unit,
    // so overlap can never push a chunk over the limit.
    const overlap = overlapTail(current, CHUNK_SIZE - estimateTokens(sep + text));
    current = overlap ? overlap + sep + text : text;
  }

  if (current) chunks.push(current);
  return chunks;
}

/** The last ~40 words of `text`, shortened from the front until it fits in `maxTokens`. */
function overlapTail(text: string, maxTokens: number): string {
  const tail = text.split(WORD_BOUNDARY).filter(Boolean).slice(-OVERLAP_WORDS);
  while (tail.length > 0 && estimateTokens(tail.join(" ")) > maxTokens) tail.shift();
  return tail.join(" ");
}

// Recursive char/token chunking.
// It tries a hierarchy of separators (paragraphs → sentences → words → characters)
// with a fixed size limit and overlap-the defining trait of recursive
// character/token splitting. It's not semantic because boundaries are
// structural/length-based, not based on meaning or embeddings.
