import request from "supertest";

import app from "../src/app";

describe("App basics", () => {
  it("reports health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("echoes or generates a request id", async () => {
    const generated = await request(app).get("/api/health");
    expect(generated.headers["x-request-id"]).toEqual(expect.any(String));

    const echoed = await request(app).get("/api/health").set("x-request-id", "trace-123");
    expect(echoed.headers["x-request-id"]).toBe("trace-123");
  });

  it("allows any origin on public API-key endpoints", async () => {
    const res = await request(app)
      .options("/api/conversations/ask")
      .set("Origin", "https://customer-shop.example")
      .set("Access-Control-Request-Method", "POST");

    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("sets security headers", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
