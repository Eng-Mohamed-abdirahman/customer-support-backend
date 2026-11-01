import request from "supertest";

import app from "../src/app";
import Conversation from "../src/models/Conversation";
import { authHeader, createConversation, createOrganization } from "./helpers/factories";

describe("Tenant isolation for conversations", () => {
  it("lists only the signed-in user's organization conversations", async () => {
    const acme = await createOrganization("Acme");
    const globex = await createOrganization("Globex");
    const own = await createConversation(acme.organization._id);
    await createConversation(globex.organization._id);

    const res = await request(app).get("/api/conversations").set(authHeader(acme.owner));

    expect(res.status).toBe(200);
    const ids = res.body.data.conversations.map((c: { _id?: string; id?: string }) => String(c._id ?? c.id));
    expect(ids).toEqual([String(own._id)]);
  });

  it("returns 404 when taking over another organization's conversation", async () => {
    const acme = await createOrganization("Acme");
    const globex = await createOrganization("Globex");
    const foreign = await createConversation(globex.organization._id);

    const res = await request(app)
      .put(`/api/conversations/${foreign._id}/takeover`)
      .set(authHeader(acme.owner));

    expect(res.status).toBe(404);
    const unchanged = await Conversation.findById(foreign._id).lean();
    expect(unchanged?.responderType).toBe("ai");
  });

  it("takeover assigns the agent and return-to-AI clears it", async () => {
    const { organization, owner } = await createOrganization();
    const conversation = await createConversation(organization._id);

    const takeover = await request(app)
      .put(`/api/conversations/${conversation._id}/takeover`)
      .set(authHeader(owner));
    expect(takeover.status).toBe(200);

    let stored = await Conversation.findById(conversation._id).lean();
    expect(stored?.responderType).toBe("agent");
    expect(String(stored?.assignedAgent)).toBe(String(owner._id));

    const handBack = await request(app)
      .put(`/api/conversations/${conversation._id}/return-to-ai`)
      .set(authHeader(owner));
    expect(handBack.status).toBe(200);

    stored = await Conversation.findById(conversation._id).lean();
    expect(stored?.responderType).toBe("ai");
    expect(stored?.assignedAgent ?? null).toBeNull();
  });
});
