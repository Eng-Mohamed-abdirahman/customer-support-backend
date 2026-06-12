import DesignHistory from "../models/DesignHistory";
import { runImageGeneration } from "./replicate.service";
import { uploadStreamToBackblaze } from "./backblaze.service";

export async function processDesignJob(data: any) {
  const { designHistoryId, designType, promptText, referenceImageUrl, orgId } = data;

  try {
    await DesignHistory.findByIdAndUpdate(designHistoryId, { status: "processing" });

    const model = "black-forest-labs/flux-schnell";
    const inputPayload: any = {
      prompt: promptText,
      aspect_ratio: designType === "poster" ? "3:4" : designType === "flyer" ? "2:3" : "1:1",
      num_outputs: 1,
      output_format: "png",
    };

    if (referenceImageUrl) {
      inputPayload.image = referenceImageUrl;
      inputPayload.prompt_strength = 0.65;
    }

    const prediction = await runImageGeneration(model, inputPayload);
    const imageCdnUrl = Array.isArray(prediction) ? prediction[0] : prediction;

    const resp = await fetch(imageCdnUrl);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const targetFilename = `outputs/design_${orgId}_${Date.now()}.png`;
    const finalB2Url = await uploadStreamToBackblaze(buffer, targetFilename, "image/png");

    await DesignHistory.findByIdAndUpdate(designHistoryId, { generatedImageUrl: finalB2Url, status: "completed" });
    return { finalB2Url };
  } catch (err) {
    console.error("Design job failed", err);
    await DesignHistory.findByIdAndUpdate(designHistoryId, { status: "failed" });
    throw err;
  }
}
