import { scanNearMisses, type ScanGhost, type ScanReply } from "../lib/near-misses";

self.onmessage = (event: MessageEvent<{ ghosts: ScanGhost[]; startedAt: number }>) => {
  let reply: ScanReply;
  try {
    reply = { result: scanNearMisses(event.data.ghosts, event.data.startedAt) };
  } catch {
    reply = { error: "The orbit scan failed. Try scanning again." };
  }
  self.postMessage(reply);
};