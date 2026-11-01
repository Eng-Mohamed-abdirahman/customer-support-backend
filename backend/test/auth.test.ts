import jwt from "jsonwebtoken";
import request from "supertest";

import app from "../src/app";
import { TEST_PASSWORD, authHeader, createUser } from "./helpers/factories";

describe("Authentication", () => {
  it("logs in with valid credentials and returns a usable token", async () => {
    const user = await createUser({ email: "agent@example.com" });

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "Agent@Example.com", password: TEST_PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.data.token).toEqual(expect.any(String));
    expect(login.body.data.user.password).toBeUndefined();

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.data.token}`);
    expect(me.status).toBe(200);
    expect(JSON.stringify(me.body)).toContain(String(user._id));
  });

  it("rejects a wrong password with a generic message", async () => {
    await createUser({ email: "agent@example.com" });

    const res = await request(app).post("/api/auth/login").send({ email: "agent@example.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("validates the login payload", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("rejects missing, forged and expired tokens", async () => {
    const user = await createUser();

    expect((await request(app).get("/api/auth/me")).status).toBe(401);

    const forged = jwt.sign({ id: String(user._id) }, "some-other-secret", { issuer: "supportly-api", audience: "supportly-web" });
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${forged}`)).status).toBe(401);

    const expired = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET as string, {
      expiresIn: -10,
      issuer: "supportly-api",
      audience: "supportly-web",
    });
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`)).status).toBe(401);
  });

  it("accepts a token signed like the login endpoint", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/auth/me").set(authHeader(user));
    expect(res.status).toBe(200);
  });
});
