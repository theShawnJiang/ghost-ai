import { logger, task } from "@trigger.dev/sdk";

/**
 * `design-agent` — the design generation task triggered by `POST /api/ai/design`.
 *
 * This unit only wires up the background flow: the request handler triggers this
 * task, a `TaskRun` record is stored, and the client polls the run through a
 * run-scoped public token. There is no AI logic yet — the task echoes its input
 * so the run registers and the plumbing can be verified end to end.
 */
export interface DesignAgentPayload {
  /** The natural-language design prompt from the user. */
  prompt: string;
  /** Liveblocks room id (the project id) the design targets. */
  roomId: string;
}

export const designAgent = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload) => {
    const { prompt, roomId } = payload;

    logger.info("design-agent received input", {
      roomId,
      promptLength: prompt.length,
      prompt,
    });

    // TODO: generate structured node/edge updates and write them into the
    // shared Liveblocks room (room id === projectId). No AI logic yet.

    return { roomId, prompt };
  },
});
