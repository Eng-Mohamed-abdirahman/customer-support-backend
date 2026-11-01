import { Request, Response } from "express";
import { processDesignJob } from "../services/design.processor";

export async function inngestWebhookHandler(req: Request, res: Response) {
  try {
    const event = req.body;
    // Basic validation: expect { event: { name, data } } or { name, data }
    const name = event?.event?.name || event?.name;
    const data = event?.event?.data || event?.data || event;

    if (!name) return res.status(400).json({ success: false, message: "Missing event name" });

    if (name === "design.generate" || name === "design.regenerate") {
      await processDesignJob(data);
      return res.status(200).json({ success: true });
    }

    console.warn("Unhandled inngest event:", name);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Inngest webhook error", err);
    return res.status(500).json({ success: false });
  }
}
