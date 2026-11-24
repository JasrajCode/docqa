import { execSync } from "node:child_process";
import pg from "pg";
import { DEMO_DOCUMENT_ID, DEMO_USER_ID, E2E_DATABASE_URL } from "./env";
import fixtures from "./fixtures.json";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function vectorLiteral(hotIndex: number): string {
  const v = new Array(1536).fill(0);
  v[hotIndex] = 1;
  return `[${v.join(",")}]`;
}

export default async function globalSetup() {
  const url = new URL(E2E_DATABASE_URL);
  // Setup drops the database; refuse non-local hosts.
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`E2E_DATABASE_URL must point at a local database, got host "${url.hostname}"`);
  }
  const dbName = url.pathname.slice(1);

  const adminUrl = new URL(E2E_DATABASE_URL);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: "inherit",
  });

  const db = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await db.connect();
  try {
    await db.query(`INSERT INTO "User" (id, email) VALUES ($1, 'demo@e2e.test')`, [DEMO_USER_ID]);
    await db.query(
      `INSERT INTO "Document" (id, "userId", title, "s3Key", status)
       VALUES ($1, $2, $3, 'e2e/fixture.pdf', 'READY')`,
      [DEMO_DOCUMENT_ID, DEMO_USER_ID, fixtures.document.title]
    );
    // One-hot embeddings: the mock query vector matches exactly one chunk.
    for (const [index, content] of fixtures.chunks.entries()) {
      await db.query(
        `INSERT INTO "Chunk" (id, "documentId", content, "chunkIndex", embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [`e2e-chunk-${index}`, DEMO_DOCUMENT_ID, content, index, vectorLiteral(index)]
      );
    }
  } finally {
    await db.end();
  }
}
