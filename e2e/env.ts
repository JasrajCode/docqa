export const APP_PORT = 3100;
export const MOCK_LLM_PORT = 4010;
export const APP_URL = `http://127.0.0.1:${APP_PORT}`;
export const MOCK_LLM_URL = `http://127.0.0.1:${MOCK_LLM_PORT}`;

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/docqa_e2e";

export const DEMO_USER_ID = "e2e-demo-user";
export const DEMO_DOCUMENT_ID = "e2e-demo-document";

// All app env vars are set explicitly so none fall back to values from a local .env.
export const APP_ENV: Record<string, string> = {
  PORT: String(APP_PORT),
  HOSTNAME: "127.0.0.1",
  DATABASE_URL: E2E_DATABASE_URL,
  NEXTAUTH_URL: APP_URL,
  NEXTAUTH_SECRET: "e2e-only-secret",
  GITHUB_CLIENT_ID: "e2e",
  GITHUB_CLIENT_SECRET: "e2e",
  OPENAI_API_KEY: "e2e-fake-key",
  OPENAI_BASE_URL: `${MOCK_LLM_URL}/v1`,
  ANTHROPIC_API_KEY: "e2e-fake-key",
  ANTHROPIC_BASE_URL: `${MOCK_LLM_URL}/v1`,
  AWS_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "e2e",
  AWS_SECRET_ACCESS_KEY: "e2e",
  S3_BUCKET_NAME: "e2e-bucket",
  DEMO_USER_ID,
  DEMO_DOCUMENT_ID,
};
