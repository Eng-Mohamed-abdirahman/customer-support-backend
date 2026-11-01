type ChunkingOptions = {
  chunkSizeChars?: number;
  overlapChars?: number;
};

type ChunkedText = {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: {
    startChar: number;
    endChar: number;
    charCount: number;
    wordCount: number;
  };
};

const DEFAULT_CHUNK_SIZE_CHARS = 800;
const DEFAULT_CHUNK_OVERLAP_CHARS = 150;

const normalizeForChunking = (rawText: string): string => {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
};

const splitTextIntoChunks = (
  rawText: string,
  options: ChunkingOptions = {}
): ChunkedText[] => {
  const chunkSizeChars = options.chunkSizeChars ?? DEFAULT_CHUNK_SIZE_CHARS;
  const overlapChars = options.overlapChars ?? DEFAULT_CHUNK_OVERLAP_CHARS;

  if (chunkSizeChars <= overlapChars) {
    throw new Error("chunkSizeChars must be greater than overlapChars");
  }

  const normalizedText = normalizeForChunking(rawText);
  if (!normalizedText) {
    return [];
  }

  const textLength = normalizedText.length;
  if (textLength === 0) {
    return [];
  }

  const chunks: ChunkedText[] = [];
  let chunkIndex = 0;
  let startChar = 0;

  while (startChar < textLength) {
    const maxEndChar = Math.min(startChar + chunkSizeChars, textLength);
    let endChar = maxEndChar;

    if (maxEndChar < textLength) {
      const lastSpace = normalizedText.lastIndexOf(" ", maxEndChar);
      if (lastSpace > startChar + 100) {
        endChar = lastSpace;
      }
    }

    const content = normalizedText.slice(startChar, endChar).trim();
    if (content) {
      const wordCount = content.split(/\s+/).filter(Boolean).length;

      chunks.push({
        chunkIndex,
        content,
        tokenCount: wordCount,
        metadata: {
          startChar,
          endChar: Math.max(startChar, endChar - 1),
          charCount: Math.max(0, endChar - startChar),
          wordCount,
        },
      });

      chunkIndex += 1;
    }

    if (endChar >= textLength) {
      break;
    }

    startChar = Math.max(0, endChar - overlapChars);
  }

  return chunks;
};

export {
  splitTextIntoChunks,
  normalizeForChunking,
  DEFAULT_CHUNK_SIZE_CHARS,
  DEFAULT_CHUNK_OVERLAP_CHARS,
};

