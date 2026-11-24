// Local stand-in for the OpenAI and Anthropic APIs used by the E2E suite.
// The app is pointed here via OPENAI_BASE_URL and ANTHROPIC_BASE_URL.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_LLM_PORT ?? 4010);
const fixtures = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));

let lastMessagesRequest = null;

function embeddings(body) {
  const inputs = Array.isArray(body.input) ? body.input : [body.input];
  const vector = new Array(body.dimensions ?? 1536).fill(0);
  vector[fixtures.queryVectorIndex] = 1;
  // The OpenAI SDK defaults to base64-encoded float32 when encoding_format is unset.
  const embedding =
    body.encoding_format === "base64"
      ? Buffer.from(new Float32Array(vector).buffer).toString("base64")
      : vector;
  return {
    object: "list",
    model: body.model,
    data: inputs.map((_, index) => ({ object: "embedding", index, embedding })),
    usage: { prompt_tokens: 1, total_tokens: 1 },
  };
}

function streamMessage(body, res) {
  lastMessagesRequest = body;
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const send = (event) => res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);

  send({
    type: "message_start",
    message: {
      id: "msg_e2e",
      type: "message",
      role: "assistant",
      model: body.model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 0 },
    },
  });
  send({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
  for (const piece of fixtures.answer.match(/\S+\s*/g)) {
    send({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: piece } });
  }
  send({ type: "content_block_stop", index: 0 });
  send({
    type: "message_delta",
    delta: { stop_reason: "end_turn", stop_sequence: null },
    usage: { output_tokens: 1 },
  });
  send({ type: "message_stop" });
  res.end();
}

function json(res, value) {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(value));
}

createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return res.end("ok");
  // Exposes the last /v1/messages request body for test assertions.
  if (req.method === "GET" && req.url === "/__last-messages-request") {
    return json(res, lastMessagesRequest);
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};

  if (req.method === "POST" && req.url === "/v1/embeddings") return json(res, embeddings(body));
  if (req.method === "POST" && req.url === "/v1/messages") return streamMessage(body, res);

  res.statusCode = 404;
  res.end(`mock LLM server has no route for ${req.method} ${req.url}`);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`mock LLM server listening on http://127.0.0.1:${PORT}`);
});
