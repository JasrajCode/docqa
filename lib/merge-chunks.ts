export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
}

// Merges two chunk lists, deduping by id. First-list entries appear first,
// and if a chunk is in both lists the first-list copy wins.
export function mergeChunks(
  primary: RetrievedChunk[],
  secondary: RetrievedChunk[]
): RetrievedChunk[] {
  const seen = new Set<string>();
  const out: RetrievedChunk[] = [];
  for (const c of [...primary, ...secondary]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}
