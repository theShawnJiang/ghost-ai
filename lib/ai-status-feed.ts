import "server-only";

import type { Liveblocks } from "@liveblocks/node";

import { publishFeedMessage } from "@/lib/liveblocks-feed";
import { AI_STATUS_FEED_ID, type AiStatusFeedMessage } from "@/types/tasks";

/**
 * Server-side producer for the shared `ai-status-feed`.
 *
 * Background tasks call `publishAiStatus` at each meaningful step; every
 * participant in the room reads the latest message through `useAiStatusFeed`.
 * Publishing is best-effort — a failed status write must never abort the work
 * the task is actually doing — so callers get a boolean instead of a throw.
 */

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
  return publishFeedMessage(liveblocks, roomId, AI_STATUS_FEED_ID, message);
}
