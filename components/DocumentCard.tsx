"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentStatus } from "@prisma/client";

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    status: DocumentStatus;
    createdAt: Date;
    _count: { chunks: number };
  };
}

const STATUS_STYLES: Record<DocumentStatus, string> = {
  PROCESSING: "bg-yellow-900/40 text-yellow-400",
  READY: "bg-emerald-900/40 text-emerald-400",
  FAILED: "bg-red-900/40 text-red-400",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  PROCESSING: "Processing…",
  READY: "Ready",
  FAILED: "Failed",
};

export function DocumentCard({ document }: DocumentCardProps) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${document.title}"?`)) return;
    setDeleting(true);
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    });
    router.refresh();
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-2xl select-none">📄</div>
        <div className="min-w-0">
          <p className="font-medium text-zinc-100 truncate">{document.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {document._count.chunks > 0
              ? `${document._count.chunks} chunks`
              : "No chunks yet"}
            {" · "}
            {new Date(document.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[document.status]}`}
        >
          {STATUS_LABELS[document.status]}
        </span>
        {document.status === "READY" && (
          <Link
            href={`/documents/${document.id}/chat`}
            className="px-3 py-1.5 bg-zinc-100 text-zinc-900 text-sm rounded-lg hover:bg-white transition-colors font-medium"
          >
            Chat
          </Link>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50 text-sm"
          aria-label="Delete document"
        >
          {deleting ? "…" : "✕"}
        </button>
      </div>
    </div>
  );
}
