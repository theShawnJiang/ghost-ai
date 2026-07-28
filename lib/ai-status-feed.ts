import "server-only";

import type { Liveblocks } from "@liveblocks/node";

import { AI_STATUS_FEED_ID, type AiStatusFeedMessage } from "@/types/tasks";

/**
 * Server-side producer for the shared `ai-status-feed`.
 *
 * Background tasks call `publishAiStatus` at each meaningful step; every
 * participant in the room reads the latest message through `useAiStatusFeed`.
 * Publishing is best-effort — a failed status write must never abort the work
 * the task is actually doing — so callers get a boolean instead of a throw.
 */

/** Rooms whose feed this process has already ensured, so we create it once. */
const ensuredRooms = new Set<string>();

/**
 * Create the room's status feed if it doesn't exist yet. Creation races (two
 * runs starting at once) and "already exists" responses are both fine: either
 * way the feed is there afterwards.
 */
async function ensureAiStatusFeed(
  liveblocks: Liveblocks,
  roomId: string,
): Promise<void> {
  if (ensuredRooms.has(roomId)) return;

  try {
    await liveblocks.createFeed({ roomId, feedId: AI_STATUS_FEED_ID });
  } catch {
    // Already created (by an earlier run or a concurrent one) — nothing to do.
  }
  ensuredRooms.add(roomId);
}

/**
 * Append a status message to the room's `ai-status-feed`.
 *
 * Returns whether the message was published. Publish only on real phase
 * changes: feed messages persist, so this is the coarse "what is happening"
 * channel, not a per-frame one.
 */
export async function publishAiStatus(
  liveblocks: Liveblocks,
  roomId: string,
  message: AiStatusFeedMessage,
): Promise<boolean> {
  try {
    await ensureAiStatusFeed(liveblocks, roomId);
    await liveblocks.createFeedMessage({
      roomId,
      feedId: AI_STATUS_FEED_ID,
      data: message,
    });
    return true;
  } catch {
    return false;
  }
}
