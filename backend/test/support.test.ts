import request from "supertest";

import app from "../src/app";
import Conversation from "../src/models/Conversation";
import Ticket from "../src/models/Ticket";
import { authHeader, createConversation, createOrganization } from "./helpers/factories";

describe("POST /api/support/escalate", () => {
  it("rejects requests without an API key", async () => {
    const { organization } = await createOrganization();

    const res = await request(app)
      .post("/api/support/escalate")
      .send({ organizationId: String(organization._id), customerPhone: "+252610000000" });

    expect(res.status).toBe(401);
    expect(await Ticket.countDocuments()).toBe(0);
  });

  it("escalates within the API key's organization and ignores organizationId in the body", async () => {
    const { organization, apiKey } = await createOrganization("Acme");
    const { organization: otherOrganization } = await createOrganization("Globex");

    const res = await request(app)
      .post("/api/support/escalate")
      .set("x-api-key", apiKey)
      .send({
        organizationId: String(otherOrganization._id),
        customerPhone: "+252610000001",
        lastUserMessage: "I want to talk to a human",
      });

    expect(res.status).toBe(200);

    const tickets = await Ticket.find().lean();
    expect(tickets).toHaveLength(1);
    expect(String(tickets[0].organizationId)).toBe(String(organization._id));

    const conversation = await Conversation.findById(res.body.data.conversationId).lean();
    expect(String(conversation?.organizationId)).toBe(String(organization._id));
    expect(conversation?.status).toBe("pending");
    expect(conversation?.aiEnabled).toBe(false);
  });
});

describe("POST /api/support/accept-chat", () => {
  it("rejects unauthenticated requests", async () => {
    const { organization } = await createOrganization();
    const conversation = await createConversation(organization._id, { status: "pending" });

    const res = await request(app)
      .post("/api/support/accept-chat")
      .send({ conversationId: String(conversation._id), agentId: "attacker" });

    expect(res.status).toBe(401);
    const unchanged = await Conversation.findById(conversation._id).lean();
    expect(unchanged?.status).toBe("pending");
  });

  it("does not let an agent claim another organization's conversation", async () => {
    const { organization } = await createOrganization("Acme");
    const { owner: otherAgent } = await createOrganization("Globex");
    const conversation = await createConversation(organization._id, { status: "pending" });

    const res = await request(app)
      .post("/api/support/accept-chat")
      .set(authHeader(otherAgent))
      .send({ conversationId: String(conversation._id) });

    expect(res.status).toBe(409);
    const unchanged = await Conversation.findById(conversation._id).lean();
    expect(unchanged?.status).toBe("pending");
    expect(unchanged?.assignedAgent ?? null).toBeNull();
  });

  it("assigns the conversation to the signed-in agent, not an agentId from the body", async () => {
    const { organization, owner } = await createOrganization();
    const conversation = await createConversation(organization._id, { status: "pending" });

    const res = await request(app)
      .post("/api/support/accept-chat")
      .set(authHeader(owner))
      .send({ conversationId: String(conversation._id), agentId: "someone-else" });

    expect(res.status).toBe(200);
    const accepted = await Conversation.findById(conversation._id).lean();
    expect(accepted?.status).toBe("open");
    expect(accepted?.responderType).toBe("agent");
    expect(String(accepted?.assignedAgent)).toBe(String(owner._id));
  });

  it("returns 409 when the chat was already claimed", async () => {
    const { organization, owner } = await createOrganization();
    const conversation = await createConversation(organization._id, { status: "open" });

    const res = await request(app)
      .post("/api/support/accept-chat")
      .set(authHeader(owner))
      .send({ conversationId: String(conversation._id) });

    expect(res.status).toBe(409);
  });
});
