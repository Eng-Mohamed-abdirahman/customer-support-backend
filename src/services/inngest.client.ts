// Lightweight Inngest client wrapper.
// For local dev this will call the processor directly; in production you'd configure
// the official Inngest SDK and send events to the Inngest API.

import { processDesignJob } from "./design.processor";

export async function sendEvent(eventName: string, payload: any) {
  // Map event names to processors. For now, we handle `design.generate` and `design.regenerate`.
  try {
    if (eventName === "design.generate" || eventName === "design.regenerate") {
      return await processDesignJob(payload);
    }

    console.warn("Unknown event sent to Inngest client:", eventName);
    return null;
  } catch (err) {
    console.error("Inngest sendEvent error", err);
    throw err;
  }
}
