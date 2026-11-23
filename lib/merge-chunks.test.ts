import { describe, expect, it } from "vitest";
import { mergeChunks, type RetrievedChunk } from "@/lib/merge-chunks";

const chunk = (id: string, similarity = 0.5): RetrievedChunk => ({
  id,
  documentId: "doc1",
  content: `content of ${id}`,
  chunkIndex: 0,
  similarity,
});
const ids = (chunks: RetrievedChunk[]) => chunks.map((c) => c.id);

describe("mergeChunks (hybrid retrieval: lead chunks + top-K)", () => {
  it("puts lead chunks first, then semantic chunks, keeping each list's order", () => {
    const lead = [chunk("a"), chunk("b"), chunk("c")];
    const semantic = [chunk("x"), chunk("y")];
    expect(ids(mergeChunks(lead, semantic))).toEqual(["a", "b", "c", "x", "y"]);
  });

  it("drops a semantic chunk that is already one of the lead chunks", () => {
    const lead = [chunk("a"), chunk("b"), chunk("c")];
    const semantic = [chunk("x"), chunk("b"), chunk("y")];
    expect(ids(mergeChunks(lead, semantic))).toEqual(["a", "b", "c", "x", "y"]);
  });

  it("keeps the lead copy when a chunk appears in both lists", () => {
    // Lead chunks carry a placeholder similarity of 1.0; the semantic copy has the real score.
    const merged = mergeChunks([chunk("a", 1.0)], [chunk("a", 0.83)]);
    expect(merged).toHaveLength(1);
    expect(merged[0].similarity).toBe(1.0);
  });

  it("never returns duplicate ids, even with heavy overlap", () => {
    const lead = [chunk("c0"), chunk("c1"), chunk("c2")];
    const semantic = [chunk("c2"), chunk("c5"), chunk("c1"), chunk("c9"), chunk("c0")];
    const result = ids(mergeChunks(lead, semantic));
    expect(result).toEqual(["c0", "c1", "c2", "c5", "c9"]);
    expect(new Set(result).size).toBe(result.length);
  });

  it("returns at most 3 + 8 = 11 chunks, fewer when the lists overlap", () => {
    const lead = ["L0", "L1", "L2"].map((id) => chunk(id));
    const disjoint = Array.from({ length: 8 }, (_, i) => chunk(`S${i}`));
    expect(mergeChunks(lead, disjoint)).toHaveLength(11);

    const overlapping = [...lead, ...disjoint.slice(0, 5)]; // top-K also found all 3 lead chunks
    expect(mergeChunks(lead, overlapping)).toHaveLength(8);
  });

  it("handles empty lists", () => {
    expect(mergeChunks([], [])).toEqual([]);
    expect(ids(mergeChunks([], [chunk("x")]))).toEqual(["x"]);
    expect(ids(mergeChunks([chunk("a")], []))).toEqual(["a"]);
  });

  it("does not mutate its inputs", () => {
    const lead = [chunk("a"), chunk("b")];
    const semantic = [chunk("b"), chunk("c")];
    const before = JSON.stringify([lead, semantic]);
    mergeChunks(lead, semantic);
    expect(JSON.stringify([lead, semantic])).toBe(before);
  });
});
