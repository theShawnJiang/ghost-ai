import "server-only";

import type { Liveblocks } from "@liveblocks/node";

/**
 * Server-side publishing primitive for the room-scoped Liveblocks feeds.
 *
 * Both AI feeds (`ai-status-feed` and `ai-chat`) are written by background
 * tasks the same way: ensure the feed exists, then append a message. Publishing
 * is best-effort — a failed feed write must never abort the work the task is
 * actually doing — so callers get a boolean instead of a throw and decide how
 * loudly to complain.
 */

/**
 * What a feed message may carry, taken from the client rather than restated:
 * `liveblocks.config.ts` declares `FeedMessageData` globally as the union of
 * both AI feeds' shapes, and reading it back off `createFeedMessage` keeps this
 * helper in step with that declaration.
 */
type FeedMessageData = Parameters<Liveblocks["createFeedMessage"]>[0]["data"];

/** `roomId:feedId` pairs this process has already ensured, so we create once. */
const ensuredFeeds = new Set<string>();

/**
 * Create a room's feed if it doesn't exist yet. Creation races (two runs
 * starting at once) and "already exists" responses are both fine: either way
 * the feed is there afterwards.
 */
async function ensureFeed(
  liveblocks: Liveblocks,
  roomId: string,
  feedId: string,
): Promise<void> {
  const key = `${roomId}:${feedId}`;
  if (ensuredFeeds.has(key)) return;

  try {
    await liveblocks.createFeed({ roomId, feedId });
  } catch {
    // Already created (by an earlier run or a concurrent one) — nothing to do.
  }
  ensuredFeeds.add(key);
}

/**
 * Append a message to a room's feed, creating the feed first if needed.
 *
 * `createdAt` is passed explicitly so the feed's ordering key and any timestamp
 * carried inside the payload are the same number — clients sort on the feed's
 * `createdAt` and display the payload's, so the two must agree.
 */
export async function publishFeedMessage(
  liveblocks: Liveblocks,
  roomId: string,
  feedId: string,
  data: FeedMessageData,
  createdAt?: number,
): Promise<boolean> {
  try {
    await ensureFeed(liveblocks, roomId, feedId);
    await liveblocks.createFeedMessage({
      roomId,
      feedId,
      data,
      ...(createdAt !== undefined ? { createdAt } : {}),
    });
    return true;
  } catch {
    return false;
  }
}
