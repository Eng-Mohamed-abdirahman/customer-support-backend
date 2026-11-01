import express from "express";
import bodyParser from "body-parser";
import { processDesignJob } from "./services/design.processor";
import { createLogger } from "./utils/logger";

const log = createLogger("InngestRunner");

const PORT = process.env.INNGEST_LOCAL_PORT ? Number(process.env.INNGEST_LOCAL_PORT) : 4001;

const app = express();
app.use(bodyParser.json({ limit: "2mb" }));

app.post("/event", async (req, res) => {
  try {
    const { name, data } = req.body;
    log.info("[Inngest Runner] Received event", name);

    if (!name) return res.status(400).json({ success: false, message: "Missing event name" });

    if (name === "design.generate" || name === "design.regenerate") {
      await processDesignJob(data);
      return res.status(200).json({ success: true });
    }

    log.warn("[Inngest Runner] Unhandled event", name);
    return res.status(200).json({ success: true, message: "ignored" });
  } catch (err) {
    log.error("[Inngest Runner] event handler error", err);
    return res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  log.info(`[Inngest Runner] Listening on http://localhost:${PORT}/event`);
});
