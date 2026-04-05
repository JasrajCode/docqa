# DocQA — Document Q&A Platform

Upload PDF documents and ask natural language questions about them. Answers are grounded in the actual document content using semantic search.

**Live demo:** https://docqa-vnac.onrender.com

---

## How it works

1. User uploads a PDF → stored in AWS S3
2. Text is extracted, split into chunks, and embedded using OpenAI's `text-embedding-3-small`
3. Embeddings are stored in PostgreSQL using pgvector
4. When a question is asked, the query is embedded and the most semantically similar chunks are retrieved via cosine similarity search
5. Retrieved chunks are passed as context to Anthropic Claude, which streams back a grounded answer

---

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Auth:** NextAuth.js with GitHub OAuth
- **Database:** PostgreSQL + pgvector (Neon)
- **ORM:** Prisma 7
- **File storage:** AWS S3 (presigned URLs for direct browser uploads)
- **Embeddings:** OpenAI `text-embedding-3-small`
- **LLM:** Anthropic Claude Haiku (streaming responses via AI SDK)
- **Deployment:** Docker, Render
- **CI/CD:** GitHub Actions (lint, typecheck, auto-deploy on push to main)

---

## Architecture

```
Browser → Next.js API Routes → AWS S3 (file storage)
                             → Neon Postgres + pgvector (embeddings)
                             → OpenAI API (embeddings)
                             → Anthropic API (chat completions)
```

Upload flow:
```
Browser → POST /api/upload → S3 presigned URL → PUT directly to S3
       → POST /api/process → extract text → chunk → embed → store in pgvector
```

Query flow:
```
Browser → POST /api/chat → embed query → cosine similarity search → retrieve top-k chunks
                        → build prompt with context → stream response from Claude
```

---

## Running locally

**Prerequisites:** Node.js 20+, Docker

1. Clone the repo
   ```bash
   git clone https://github.com/JasrajCode/docqa
   cd docqa
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables — create a `.env` file with:
   - `DATABASE_URL` — PostgreSQL connection string
   - `NEXTAUTH_SECRET` — random secret string
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth app credentials
   - `OPENAI_API_KEY` — OpenAI API key
   - `ANTHROPIC_API_KEY` — Anthropic API key
   - `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `S3_BUCKET_NAME` — AWS credentials

4. Start the database
   ```bash
   docker compose up -d db
   ```

5. Run migrations
   ```bash
   npx prisma migrate deploy
   ```

6. Start the dev server
   ```bash
   npm run dev
   ```

---

## Deployment

The app is containerized with Docker and deployed to Render. GitHub Actions runs lint and type checks on every push, then triggers an automatic redeploy on merge to `main`.
