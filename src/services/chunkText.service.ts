type ChunkingOptions = {
  chunkSizeWords?: number;
  overlapWords?: number;
};

type ChunkedText = {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: {
    startWord: number;
    endWord: number;
    wordCount: number;
  };
};

const DEFAULT_CHUNK_SIZE_WORDS = 900;
const DEFAULT_CHUNK_OVERLAP_WORDS = 120;

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
  const chunkSizeWords = options.chunkSizeWords ?? DEFAULT_CHUNK_SIZE_WORDS;
  const overlapWords = options.overlapWords ?? DEFAULT_CHUNK_OVERLAP_WORDS;

  if (chunkSizeWords <= overlapWords) {
    throw new Error("chunkSizeWords must be greater than overlapWords");
  }

  const normalizedText = normalizeForChunking(rawText);
  if (!normalizedText) {
    return [];
  }

  const words = normalizedText.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const chunks: ChunkedText[] = [];
  let chunkIndex = 0;
  let startWord = 0;

  while (startWord < words.length) {
    const endWordExclusive = Math.min(startWord + chunkSizeWords, words.length);
    const chunkWords = words.slice(startWord, endWordExclusive);

    chunks.push({
      chunkIndex,
      content: chunkWords.join(" "),
      tokenCount: chunkWords.length,
      metadata: {
        startWord,
        endWord: Math.max(startWord, endWordExclusive - 1),
        wordCount: chunkWords.length,
      },
    });

    if (endWordExclusive >= words.length) {
      break;
    }

    startWord = Math.max(0, endWordExclusive - overlapWords);
    chunkIndex += 1;
  }

  return chunks;
};

module.exports = {
  splitTextIntoChunks,
  normalizeForChunking,
  DEFAULT_CHUNK_SIZE_WORDS,
  DEFAULT_CHUNK_OVERLAP_WORDS,
};

export {};
