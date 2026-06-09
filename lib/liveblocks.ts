import "server-only";

import { Liveblocks } from "@liveblocks/node";

// Cache the node client on `globalThis` so hot reloads (and repeated requests)
// reuse one instance — mirrors the `lib/prisma.ts` pattern. Construction is
// lazy: the `Liveblocks` constructor validates the secret key format, so doing
// it at module load would break `next build` when the key isn't present.
const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined;
};

export function getLiveblocks(): Liveblocks {
  if (!globalForLiveblocks.liveblocks) {
    globalForLiveblocks.liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
    });
  }
  return globalForLiveblocks.liveblocks;
}

// Fixed palette of distinct cursor colors. A user always maps to the same
// entry, so their cursor color stays stable across sessions and rooms.
const CURSOR_COLORS = [
  "#E57373", // red
  "#F06292", // pink
  "#BA68C8", // purple
  "#7986CB", // indigo
  "#64B5F6", // blue
  "#4DD0E1", // cyan
  "#4DB6AC", // teal
  "#81C784", // green
  "#FFB74D", // orange
  "#A1887F", // brown
] as const;

/**
 * Deterministically maps a user id to a consistent color from a fixed palette.
 * The same id always returns the same color.
 */
export function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
