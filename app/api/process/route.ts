import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3, BUCKET } from "@/lib/s3";
import { chunkText } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await req.json();
  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 }
    );
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId: session.user.id },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    // 1. Fetch PDF from S3
    const s3Response = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: document.s3Key })
    );
    const pdfBuffer = Buffer.from(
      await s3Response.Body!.transformToByteArray()
    );

    // 2. Extract text — lazy require keeps pdf-parse out of the build-time bundle
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require("pdf-parse");
    const pdfParse = (pdfParseModule.default ?? pdfParseModule) as (
      buffer: Buffer
    ) => Promise<{ text: string; numpages: number }>;
    const { text } = await pdfParse(pdfBuffer);
    if (!text.trim()) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        {
          error:
            "Could not extract text from PDF. The file may be a scanned image — only PDFs with selectable text are supported.",
        },
        { status: 422 }
      );
    }

    // 3. Chunk
    const chunks = chunkText(text);

    // 4. Embed in batches of 100 (OpenAI limit)
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch);
      allEmbeddings.push(...embeddings);
    }

    // 5. Store chunks + embeddings via raw SQL (pgvector requires cast)
    await prisma.chunk.deleteMany({ where: { documentId } }); // idempotent
    for (let i = 0; i < chunks.length; i++) {
      const vectorLiteral = `[${allEmbeddings[i].join(",")}]`;
      await prisma.$executeRaw`
        INSERT INTO "Chunk" (id, "documentId", content, "chunkIndex", embedding)
        VALUES (
          gen_random_uuid()::text,
          ${documentId},
          ${chunks[i]},
          ${i},
          ${vectorLiteral}::vector
        )
      `;
    }

    // 6. Mark ready
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });

    return NextResponse.json({ success: true, chunkCount: chunks.length });
  } catch (error) {
    console.error("Processing error:", error);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
