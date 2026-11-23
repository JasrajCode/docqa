import { describe, expect, it } from "vitest";
import { CHUNK_SIZE, chunkText, estimateTokens } from "@/lib/chunker";

const words = (s: string) => s.split(/\s+/).filter(Boolean);

/** How many words at the end of `a` are repeated at the start of `b`. */
function overlapWordCount(a: string, b: string): number {
  const aw = words(a);
  const bw = words(b);
  for (let k = Math.min(aw.length, bw.length); k > 0; k--) {
    if (aw.slice(-k).join(" ") === bw.slice(0, k).join(" ")) return k;
  }
  return 0;
}

/** `n` paragraphs of `wordsPer` unique words (p0w0, p0w1, ...). */
function makeParagraphs(n: number, wordsPer: number): string[] {
  return Array.from({ length: n }, (_, p) =>
    Array.from({ length: wordsPer }, (_, w) => `p${p}w${w}`).join(" ")
  );
}

/** One paragraph of `n` numbered sentences (~29 chars each). */
function makeSentences(n: number): string {
  return Array.from({ length: n }, (_, i) => `Sentence number ${i} is here.`).join(" ");
}

describe("chunkText", () => {
  describe("basic behaviour", () => {
    it("returns no chunks for empty or whitespace-only input", () => {
      expect(chunkText("")).toEqual([]);
      expect(chunkText("  \n\n  \n")).toEqual([]);
    });

    it("returns short text as a single trimmed chunk", () => {
      expect(chunkText("  Hello world. Short doc.  ")).toEqual(["Hello world. Short doc."]);
    });

    it("keeps small paragraphs together in one chunk", () => {
      expect(chunkText("First para.\n\nSecond para.")).toEqual(["First para.\n\nSecond para."]);
    });

    it("treats Windows line endings and extra blank lines as one paragraph break", () => {
      expect(chunkText("A.\r\n\r\n\r\nB.")).toEqual(["A.\n\nB."]);
    });
  });

  describe("size limit", () => {
    it("splits long multi-paragraph text into chunks within the limit", () => {
      const chunks = chunkText(makeParagraphs(12, 50).join("\n\n"));
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) expect(estimateTokens(c)).toBeLessThanOrEqual(CHUNK_SIZE);
    });

    it("stays within the limit when a near-limit paragraph follows another chunk", () => {
      // Each paragraph fits on its own (~463 tokens), but not once the
      // ~40-word overlap from the previous chunk is prepended to it.
      const chunks = chunkText(makeParagraphs(3, 280).join("\n\n"));
      for (const c of chunks) expect(estimateTokens(c)).toBeLessThanOrEqual(CHUNK_SIZE);
    });

    it("splits a single sentence that is longer than the limit", () => {
      const longSentence = Array(700).fill("word").join(" "); // ~875 tokens, no . ! ?
      const chunks = chunkText(longSentence);
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) expect(estimateTokens(c)).toBeLessThanOrEqual(CHUNK_SIZE);
    });

    it("hard-splits an unbroken string longer than the limit (e.g. a URL or base64 blob)", () => {
      const blob = "x".repeat(3000); // ~750 tokens, no spaces at all
      const chunks = chunkText(blob);
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) expect(estimateTokens(c)).toBeLessThanOrEqual(CHUNK_SIZE);
    });
  });

  describe("overlap", () => {
    // Overlap is the last ~40 words (≈50 tokens for typical English).
    it("repeats ~40 words from the end of each chunk at the start of the next (paragraph split)", () => {
      const chunks = chunkText(makeParagraphs(12, 50).join("\n\n"));
      expect(chunks.length).toBeGreaterThan(1);
      for (let i = 1; i < chunks.length; i++) {
        const k = overlapWordCount(chunks[i - 1], chunks[i]);
        expect(k).toBeGreaterThanOrEqual(30);
        expect(k).toBeLessThanOrEqual(45);
      }
    });

    it("also overlaps when one long paragraph is split by sentences", () => {
      const chunks = chunkText(makeSentences(150));
      expect(chunks.length).toBeGreaterThan(1);
      for (let i = 1; i < chunks.length; i++) {
        const k = overlapWordCount(chunks[i - 1], chunks[i]);
        expect(k).toBeGreaterThanOrEqual(30);
        expect(k).toBeLessThanOrEqual(45);
      }
    });
  });

  describe("content preservation", () => {
    it("keeps every word of a long multi-paragraph document", () => {
      const input = makeParagraphs(12, 50).join("\n\n");
      const output = new Set(words(chunkText(input).join(" ")));
      for (const w of words(input)) expect(output.has(w)).toBe(true);
    });

    it("keeps trailing text with no closing punctuation in a long paragraph", () => {
      const text = makeSentences(100) + " and this trailing clause has no full stop";
      expect(chunkText(text).join(" ")).toContain("this trailing clause has no full stop");
    });

    it("does not alter decimals or abbreviations when splitting by sentence", () => {
      const text =
        makeSentences(40) +
        " The spec moved to version 3.14 in the U.S.A. last year. " +
        makeSentences(40);
      const joined = chunkText(text).join(" ");
      expect(joined).toContain("version 3.14");
      expect(joined).toContain("U.S.A.");
    });
  });
});
