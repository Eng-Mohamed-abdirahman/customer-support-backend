import Replicate from "replicate";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function runPromptRefiner(systemPrompt: string, userQuery: string) {
  const model = "meta/meta-llama-3-70b-instruct";
  const input = {
    prompt: userQuery,
    system_prompt: systemPrompt,
    max_new_tokens: 250,
    temperature: 0.7,
  };

  const output = await replicate.run(model as unknown as `${string}/${string}`, { input });
  const optimized = Array.isArray(output) ? output.join("").trim() : String(output).trim();
  return optimized;
}

export async function runImageGeneration(model: string, inputPayload: any) {
  const output = await replicate.run(model as unknown as `${string}/${string}`, { input: inputPayload });
  const imageUrl = Array.isArray(output) ? output[0] : output;
  return imageUrl;
}
