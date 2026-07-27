import { processWordsInChunks } from "@/lib/services/wordChunkProcessor";
import type { ChunkPreset } from "@/lib/constants/chunking";

export async function processTextAsync(
  botId: string,
  text: string,
  chunkPreset: ChunkPreset = "long",
) {
  const words = text.split(/\s+/).filter(Boolean);

  await processWordsInChunks({
    botId,
    words,
    chunkPreset,
    participant: { name: "User", platform: "text" },
  });
}
