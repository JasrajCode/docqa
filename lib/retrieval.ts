import { prisma } from "./prisma";
import { embedText } from "./embeddings";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
}

/**
 * Retrieves the top-k most similar chunks for a user.
 * Optionally scoped to a single document.
 */
export async function retrieveChunksForUser(
  query: string,
  userId: string,
  options: { documentId?: string; topK?: number } = {}
): Promise<RetrievedChunk[]> {
  const { documentId, topK = 5 } = options;

  const embedding = await embedText(query);
  const vectorLiteral = `[${embedding.join(",")}]`;

  if (documentId) {
    return prisma.$queryRaw<RetrievedChunk[]>`
      SELECT
        c.id,
        c."documentId",
        c.content,
        c."chunkIndex",
        1 - (c.embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "Chunk" c
      INNER JOIN "Document" d ON d.id = c."documentId"
      WHERE d."userId" = ${userId}
        AND c."documentId" = ${documentId}
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;
  }

  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      c.id,
      c."documentId",
      c.content,
      c."chunkIndex",
      1 - (c.embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "Chunk" c
    INNER JOIN "Document" d ON d.id = c."documentId"
    WHERE d."userId" = ${userId}
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `;
}

/**
 * Fetches the first N chunks of a document by chunkIndex. Useful for hybrid
 * retrieval: combining the document's lead context (typically the abstract /
 * intro) with semantic top-K, so summary-style queries always have the
 * high-level framing in the prompt regardless of what the embedding matches.
 */
export async function getDocumentLeadChunks(
  documentId: string,
  userId: string,
  n: number
): Promise<RetrievedChunk[]> {
  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      c.id,
      c."documentId",
      c.content,
      c."chunkIndex",
      1.0 AS similarity
    FROM "Chunk" c
    INNER JOIN "Document" d ON d.id = c."documentId"
    WHERE d."userId" = ${userId}
      AND c."documentId" = ${documentId}
    ORDER BY c."chunkIndex" ASC
    LIMIT ${n}
  `;
}

// Merges two chunk lists, deduping by id. First-list entries appear first.
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
