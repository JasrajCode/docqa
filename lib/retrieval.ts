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
