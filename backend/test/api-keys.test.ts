import request from "supertest";

import app from "../src/app";
import Organization from "../src/models/Organization";
import { generateApiKey } from "../src/utils/generateApiKey";
import { buildApiKeyRecord, createOrganization } from "./helpers/factories";

// /api/support/escalate is a cheap API-key route; 401 means the key was rejected.
const callWithKey = (apiKey: string) =>
  request(app).post("/api/support/escalate").set("x-api-key", apiKey).send({ customerPhone: "+252610000099" });

describe("API key authentication", () => {
  it("rejects missing and unknown keys", async () => {
    await createOrganization();

    expect((await request(app).post("/api/support/escalate").send({})).status).toBe(401);
    // A well-formed key that belongs to no organization.
    expect((await callWithKey(generateApiKey())).status).toBe(401);
  });

  it("keeps older keys working after a new key is created", async () => {
    const { organization, apiKey: firstKey } = await createOrganization();

    // Creating a key in the dashboard adds it to api_keys and makes it the primary key.
    const second = buildApiKeyRecord("Second");
    await Organization.updateOne(
      { _id: organization._id },
      {
        $push: { api_keys: second.record },
        $set: {
          "api_settings.key_prefix": second.record.key_prefix,
          "api_settings.encrypted_key": second.record.encrypted_key,
          "api_settings.iv": second.record.iv,
        },
      }
    );

    expect((await callWithKey(second.rawKey)).status).toBe(200);
    expect((await callWithKey(firstKey)).status).toBe(200);
  });

  it("rejects a revoked key", async () => {
    const { organization, apiKey } = await createOrganization();
    await Organization.updateOne({ _id: organization._id }, { $set: { "api_keys.0.revoked_at": new Date() } });

    expect((await callWithKey(apiKey)).status).toBe(401);
  });

  it("rejects keys of suspended organizations", async () => {
    const { organization, apiKey } = await createOrganization();
    await Organization.updateOne({ _id: organization._id }, { $set: { status: "suspended" } });

    expect((await callWithKey(apiKey)).status).toBe(403);
  });
});
