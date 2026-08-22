import "server-only";

import type { Liveblocks } from "@liveblocks/node";

import { publishFeedMessage } from "@/lib/liveblocks-feed";
import {
  AI_CHAT_FEED_ID,
  AI_CHAT_SENDER,
  type AiChatFeedMessage,
} from "@/types/tasks";

/**
 * Server-side producer for Ghost AI's own messages in the shared `ai-chat`
 * feed.
 *
 * The AI's replies are published by the task that produced them, not by the
 * client that started the run. A client-side publish only lands if that
 * particular browser tab is still mounted and subscribed when the run ends, so
 * a reload — or a closed tab, or a dropped socket — would silently swallow the
 * reply for the whole room. The task is the one participant guaranteed to be
 * present at the moment there is something to say.
 *
 * People's messages still come from the client: they originate there and carry
 * that user's identity.
 */

/**
 * Append one of Ghost AI's replies (a run summary or a failure notice) to the
 * room's `ai-chat` feed. Best-effort, like every other feed write — a run that
 * has already written to the canvas must not fail over an undelivered message.
 */
export async function publishAiChatMessage(
  liveblocks: Liveblocks,
  roomId: string,
  content: string,
): Promise<boolean> {
  const trimmed = content.trim();
  if (!trimmed) return false;

  const message: AiChatFeedMessage = {
    sender: { ...AI_CHAT_SENDER },
    role: "assistant",
    content: trimmed,
    timestamp: Date.now(),
  };

  return publishFeedMessage(
    liveblocks,
    roomId,
    AI_CHAT_FEED_ID,
    message,
    message.timestamp,
  );
}
