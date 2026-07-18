import type { AiStatusEvent } from "@/types/ai";

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

    // Broadcast room events. The design agent publishes its presence + status
    // feed here so every participant sees AI activity in real time.
    RoomEvent: AiStatusEvent;

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
