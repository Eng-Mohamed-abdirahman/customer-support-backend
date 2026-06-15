import DesignHistory from "../models/DesignHistory";
import { processDesignGenerationJob } from "./design.pipeline.service";

export async function processDesignJob(data: any) {
  const {
    designHistoryId,
    designType,
    promptText,
    referenceImageUrl,
    orgId,
    brand,
    layoutAnalysis,
    rawUserIntention,
  } = data;

  try {
    return await processDesignGenerationJob({
      designHistoryId,
      designType,
      promptText,
      referenceImageUrl,
      orgId,
      brand,
      layoutAnalysis,
      rawUserIntention,
    });
  } catch (err) {
    console.error("Design job failed", err);
    await DesignHistory.findByIdAndUpdate(designHistoryId, { status: "failed" });
    throw err;
  }
}
