import { YoutubeTranscript } from "youtube-transcript";
import { processWordsInChunks } from "@/lib/services/wordChunkProcessor";
import type { ChunkPreset } from "@/lib/constants/chunking";

const cancelledSessions = new Set<string>();

export function cancelYouTube(botId: string) {
  cancelledSessions.add(botId);
}

function extractVideoId(url: string): string {
  const patterns = [
    /[?&]v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw new Error("Could not extract video ID from URL");
}

export async function processYouTube(
  url: string,
  botId: string,
  chunkPreset: ChunkPreset = "long",
): Promise<void> {
  const videoId = extractVideoId(url);
  const segments = await YoutubeTranscript.fetchTranscript(videoId);

  const words = segments.flatMap((seg) =>
    seg.text.trim().split(/\s+/).filter(Boolean),
  );

  await processWordsInChunks({
    botId,
    words,
    chunkPreset,
    participant: { name: "YouTube", platform: "youtube" },
    isCancelled: (id) => cancelledSessions.has(id),
    clearCancelled: (id) => cancelledSessions.delete(id),
  });
}
