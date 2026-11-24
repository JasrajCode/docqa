// Records DocQA's retrieval results for docqa-agent's parity test.
// Usage: npx tsx scripts/capture-retrieval.ts ../docqa-agent/tests/fixtures/parity.json
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { prisma } from "../lib/prisma";
import { retrieveChunksForUser } from "../lib/retrieval";

const QUERIES = [
  "What problem does retrieval-augmented generation solve?",
  "Which datasets were used in the experiments?",
  "How is the retriever trained?",
];
const TOP_K = 8;

interface ParityCase {
  query: string;
  user_id: string;
  document_id: string;
  top_k: number;
  results: { id: string; similarity: number }[];
}

async function main() {
  const userId = process.env.DEMO_USER_ID;
  const documentId = process.env.DEMO_DOCUMENT_ID;
  const outPath = process.argv[2];
  if (!userId || !documentId || !outPath) {
    throw new Error("Set DEMO_USER_ID and DEMO_DOCUMENT_ID in .env and pass an output path");
  }

  const cases: ParityCase[] = [];
  for (const query of QUERIES) {
    const chunks = await retrieveChunksForUser(query, userId, { documentId, topK: TOP_K });
    cases.push({
      query,
      user_id: userId,
      document_id: documentId,
      top_k: TOP_K,
      results: chunks.map((c) => ({ id: c.id, similarity: Number(c.similarity) })),
    });
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(cases, null, 2) + "\n");
  console.log(`Wrote ${cases.length} cases to ${outPath}`);
}

main().finally(() => prisma.$disconnect());
