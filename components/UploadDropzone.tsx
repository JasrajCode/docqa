"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: string }
  | { status: "processing" }
  | { status: "done" }
  | { status: "error"; message: string };

interface UploadDropzoneProps {
  disabled?: boolean;
  disabledMessage?: string;
  signInHref?: string;
}

export function UploadDropzone({
  disabled = false,
  disabledMessage = "Sign in to upload your own documents.",
  signInHref = "/login",
}: UploadDropzoneProps = {}) {
  if (disabled) {
    return (
      <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 sm:p-10 text-center bg-zinc-900/40 opacity-80">
        <p className="text-3xl mb-2 select-none">🔒</p>
        <p className="font-medium text-zinc-400">{disabledMessage}</p>
        <Link
          href={signInHref}
          className="inline-block mt-4 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <ActiveUploadDropzone />;
}

function ActiveUploadDropzone() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setState({ status: "error", message: "Only PDF files are supported." });
      return;
    }

    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setState({ status: "error", message: `File too large — maximum size is ${MAX_SIZE_MB}MB.` });
      return;
    }

    try {
      setState({ status: "uploading", progress: "Getting upload URL…" });
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!uploadRes.ok) throw new Error("Failed to get upload URL");
      const { presignedUrl, documentId } = await uploadRes.json();

      setState({ status: "uploading", progress: "Uploading to S3…" });
      const s3Res = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!s3Res.ok) throw new Error("S3 upload failed");

      setState({ status: "processing" });
      const processRes = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!processRes.ok) throw new Error("Processing failed");

      setState({ status: "done" });
      setTimeout(() => {
        setState({ status: "idle" });
        router.refresh();
      }, 1500);
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const isLoading =
    state.status === "uploading" || state.status === "processing";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-colors
        ${dragging
          ? "border-zinc-400 bg-zinc-800"
          : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
        }
        ${isLoading ? "cursor-default opacity-80" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {state.status === "idle" && (
        <>
          <p className="text-3xl mb-2">📂</p>
          <p className="font-medium text-zinc-300">
            Drop a PDF here, or click to browse
          </p>
          <p className="text-sm text-zinc-600 mt-1">PDF files only · max 10MB</p>
        </>
      )}

      {state.status === "uploading" && (
        <p className="text-zinc-300 font-medium">{state.progress}</p>
      )}

      {state.status === "processing" && (
        <p className="text-zinc-300 font-medium">
          Chunking and indexing — this may take a moment…
        </p>
      )}

      {state.status === "done" && (
        <p className="text-emerald-400 font-medium">Done! Document is ready.</p>
      )}

      {state.status === "error" && (
        <p className="text-red-400 font-medium">{state.message}</p>
      )}
    </div>
  );
}
