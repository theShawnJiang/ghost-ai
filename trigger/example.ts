import { logger, task, wait } from "@trigger.dev/sdk";

/**
 * Example task — safe to delete once real background jobs (AI design
 * generation, spec generation) are added. Kept so `trigger dev` has a
 * task to register and to document the task pattern for this project.
 */
export const exampleTask = task({
  id: "example-task",
  run: async (payload: { name: string }) => {
    logger.info("Running example task", { name: payload.name });

    await wait.for({ seconds: 1 });

    return { message: `Hello, ${payload.name}!` };
  },
});
