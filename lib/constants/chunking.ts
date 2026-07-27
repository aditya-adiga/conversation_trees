export type ChunkPreset = "short" | "medium" | "long";

// Smaller chunks mean the 12-chunk LLM window (MIN_CHUNKS_FOR_SEGMENTATION in
// windowBuffer.ts) covers fewer words before firing, producing more, finer-grained
// nodes — important for short pasted texts that would otherwise collapse into 2-3 nodes.
export const CHUNK_PRESETS: Record<ChunkPreset, { label: string; wordsPerChunk: number }> = {
  short: { label: "Short (for text with < 1,000 words)", wordsPerChunk: 25 },
  medium: { label: "Medium (for text with 1,000–5,000 words)", wordsPerChunk: 60 },
  long: { label: "Long (for text with 5,000+ words)", wordsPerChunk: 100 },
};

export function recommendChunkPreset(wordCount: number): ChunkPreset {
  if (wordCount < 1000) return "short";
  if (wordCount < 5000) return "medium";
  return "long";
}
