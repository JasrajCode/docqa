import { expect, test } from "@playwright/test";
import { MOCK_LLM_URL } from "./env";
import fixtures from "./fixtures.json";

test("a visitor can try the demo and get an answer with its sources", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Try the live demo" }).click();

  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText(fixtures.document.title)).toBeVisible();
  await expect(page.getByText("Sign in to upload your own documents.")).toBeVisible();

  await page.getByRole("link", { name: "Chat" }).click();
  await expect(page).toHaveURL(/\/demo\/chat$/);
  // Interactive elements are inert until hydration completes.
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Summarize this paper in plain English" }).click();

  await expect(page.locator("strong", { hasText: "Retrieval-augmented generation" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "external index" })).toBeVisible();
  await expect(page.getByText("Demo mode · 9 of 10 questions left")).toBeVisible();

  // 3 lead chunks + top-K semantic matches, deduplicated (6-chunk fixture).
  const sources = page.getByText("6 sources used");
  await expect(sources).toBeVisible();
  await sources.click();
  await expect(page.getByText(fixtures.chunks[4])).toBeVisible();

  // Retrieved chunks must be included in the model's context.
  const sent = await (await request.get(`${MOCK_LLM_URL}/__last-messages-request`)).json();
  const systemPrompt = JSON.stringify(sent.system);
  expect(systemPrompt).toContain(fixtures.chunks[0]);
  expect(systemPrompt).toContain(fixtures.chunks[4]);
});

test("the demo chat stops at the question limit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("docqa.demoQuestionCount", "9"));
  await page.goto("/demo/chat");
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Demo mode · 1 of 10 questions left")).toBeVisible();
  await page.getByPlaceholder("Ask a question about this document…").fill("What is RAG?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("You've used all 10 demo questions.")).toBeVisible();
  await expect(page.getByPlaceholder("Ask a question about this document…")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in" }).last()).toHaveAttribute("href", "/login");
});
