// Lightweight Inngest client wrapper.
// For local dev this will call the processor directly; in production you'd configure
// the official Inngest SDK and send events to the Inngest API.

import { processDesignJob } from "./design.processor";
import { designLog } from "../utils/design.logger";
import { createLogger } from "../utils/logger";

const log = createLogger("Inngest");

export async function sendEvent(eventName: string, payload: any) {
  // Map event names to processors. For now, we handle `design.generate` and `design.regenerate`.
  try {
    if (eventName === "design.generate" || eventName === "design.regenerate") {
      return await processDesignJob(payload);
    }

    log.warn("Unknown event sent to Inngest client:", eventName);
    return null;
  } catch (err) {
    log.error("Inngest sendEvent error", err);
    throw err;
  }
}

/** Run design generation in the background without blocking the HTTP response. */
export function queueDesignJob(payload: any) {
  designLog.info("queue.start", {
    designHistoryId: payload?.designHistoryId,
    designType: payload?.designType,
    hasReference: Boolean(payload?.referenceImageUrl),
  });

  void processDesignJob(payload).catch((err) => {
    designLog.error("queue.failed", {
      designHistoryId: payload?.designHistoryId,
      message: err instanceof Error ? err.message : String(err),
    });
  });
}
