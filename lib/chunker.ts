const CHUNK_SIZE = 500; // tokens (approximated as chars / 4)
const CHUNK_OVERLAP = 50;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits text into overlapping chunks of approximately CHUNK_SIZE tokens.
 * Tries to split on paragraph breaks, then sentence breaks, then words.
 */
export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  // First split on double newlines (paragraph boundaries)
  const paragraphs = cleaned.split(/\n\n+/);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? current + "\n\n" + para : para;

    if (estimateTokens(candidate) <= CHUNK_SIZE) {
      current = candidate;
    } else {
      // Current paragraph alone exceeds chunk size — split it by sentences
      if (current) {
        chunks.push(current.trim());
        // Carry overlap: last N tokens of previous chunk
        current = getOverlap(current);
      }

      if (estimateTokens(para) <= CHUNK_SIZE) {
        current = current ? current + "\n\n" + para : para;
      } else {
        // Paragraph itself too long — split by sentences
        const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
        for (const sentence of sentences) {
          const next = current ? current + " " + sentence : sentence;
          if (estimateTokens(next) <= CHUNK_SIZE) {
            current = next;
          } else {
            if (current) chunks.push(current.trim());
            current = getOverlap(current) + sentence;
          }
        }
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 0);
}

function getOverlap(text: string): string {
  const words = text.split(" ");
  const overlapWords = Math.ceil((CHUNK_OVERLAP * 4) / 5); // rough word count
  return words.slice(-overlapWords).join(" ") + " ";
}
