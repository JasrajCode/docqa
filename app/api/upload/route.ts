import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { s3, BUCKET } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, fileType } = await req.json();
  if (!fileName || !fileType) {
    return NextResponse.json(
      { error: "fileName and fileType are required" },
      { status: 400 }
    );
  }
  if (fileType !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are supported" },
      { status: 400 }
    );
  }

  const s3Key = `uploads/${session.user.id}/${randomUUID()}.pdf`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: fileType,
  });
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  // Create document record immediately so we can return its ID
  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      title: fileName.replace(/\.pdf$/i, ""),
      s3Key,
      status: "PROCESSING",
    },
  });

  return NextResponse.json({ presignedUrl, documentId: document.id, s3Key });
}
