import type { AiStatusEvent } from "@/types/ai";
import type { AiChatFeedMessage, AiStatusFeedMessage } from "@/types/tasks";

// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Realtime cursor coordinates on the canvas (null when off-canvas).
      cursor: { x: number; y: number } | null;
      // Whether this user is currently waiting on / running an AI action.
      thinking: boolean;
    };

    // Broadcast room events. The design agent publishes its ephemeral canvas
    // presence (the moving AI cursor) here — high frequency, never persisted.
    RoomEvent: AiStatusEvent;

    // Payload of every feed message. Unlike the broadcast above, feed messages
    // persist, so a participant who joins mid-run still sees the current AI
    // status. Liveblocks types feed data globally rather than per feed, so this
    // is the union of the room's two feeds — `ai-status-feed` (AI progress) and
    // `ai-chat` (human chat). Readers of either feed narrow the union by
    // parsing the payload (`parseAiStatusFeedMessage` / `parseAiChatFeedMessage`)
    // before rendering it.
    FeedMessageData: AiStatusFeedMessage | AiChatFeedMessage;

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      // Clerk user id — the stable identifier for the session.
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };
  }
}

export {};
