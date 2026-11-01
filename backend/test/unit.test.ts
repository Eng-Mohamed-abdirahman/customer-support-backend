import { splitTextIntoChunks } from "../src/services/chunkText.service";
import { detectIntent, getConversationalResponse } from "../src/services/intentDetection.service";
import { decryptApiKey, encryptApiKey } from "../src/utils/cryptoApiKey";
import { getErrorCode, getErrorMessage } from "../src/utils/errors";
import { generateApiKey, getApiKeyPrefix } from "../src/utils/generateApiKey";

describe("detectIntent", () => {
  it.each([
    ["hello", "greeting"],
    ["Good morning!", "greeting"],
    ["thank you so much", "thanks"],
    ["I want to talk to a human", "human_handoff"],
    ["What are your delivery fees to Hargeisa?", "support_question"],
    ["What are your opening hours?", "support_question"],
    ["Who are you?", "identity"],
    ["what are you", "identity"],
    ["Are you a bot?", "identity"],
  ])("classifies %p as %p", (message, intent) => {
    expect(detectIntent(message).intent).toBe(intent);
  });

  it("only sends real questions to retrieval", () => {
    expect(detectIntent("hi").shouldRetrieve).toBe(false);
    expect(detectIntent("How much does the premium plan cost?").shouldRetrieve).toBe(true);
  });

  it("introduces the organization by name", () => {
    expect(getConversationalResponse("identity", "Acme")).toContain("Acme");
  });
});

describe("splitTextIntoChunks", () => {
  it("splits long text into overlapping chunks that cover the input", () => {
    const text = Array.from({ length: 400 }, (_, i) => `Sentence number ${i}.`).join(" ");
    const chunks = splitTextIntoChunks(text, { chunkSizeChars: 500, overlapChars: 100 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, index) => {
      expect(chunk.chunkIndex).toBe(index);
      expect(chunk.content.length).toBeLessThanOrEqual(500);
    });
    expect(chunks[0].content).toContain("Sentence number 0.");
    expect(chunks[chunks.length - 1].content).toContain("Sentence number 399.");
  });

  it("returns no chunks for empty text", () => {
    expect(splitTextIntoChunks("   ")).toEqual([]);
  });
});

describe("API key helpers", () => {
  it("round-trips encryption", () => {
    const key = generateApiKey();
    const { encryptedKey, iv } = encryptApiKey(key);

    expect(encryptedKey).not.toContain(key);
    expect(decryptApiKey(encryptedKey, iv)).toBe(key);
  });

  it("uses a short public prefix", () => {
    const key = generateApiKey();
    expect(key.startsWith("sk_live_")).toBe(true);
    expect(getApiKeyPrefix(key)).toHaveLength(16);
  });
});

describe("error helpers", () => {
  it("reads messages and codes safely from unknown values", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage("plain")).toBe("plain");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(getErrorCode({ code: 11000 })).toBe(11000);
    expect(getErrorCode(null)).toBeUndefined();
  });
});
