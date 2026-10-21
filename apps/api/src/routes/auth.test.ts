import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { buildTestApp, type RecordingEmailAdapter } from "../test/testApp";
import type { Express } from "express";

let ctx: Awaited<ReturnType<typeof buildTestApp>>;
let app: Express;
let emailAdapter: RecordingEmailAdapter;

beforeAll(async () => {
  ctx = await buildTestApp();
  app = ctx.app;
  emailAdapter = ctx.emailAdapter;
});
afterAll(() => ctx.teardown());
beforeEach(async () => {
  await ctx.clear();
  emailAdapter.sent = [];
});

describe("POST /auth/signup", () => {
  it("creates a user, starts a session, and reports the choose_bot flow stage", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "new@example.com", password: "correcthorsebattery", fullName: "New User" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("new@example.com");
    expect(res.body.flow.stage).toBe("choose_bot");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects a password shorter than 10 characters", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "short@example.com", password: "short", fullName: "Short Pw" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/auth/signup").send({ email: "dup@example.com", password: "correcthorsebattery", fullName: "Dup" });
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "dup@example.com", password: "anotherpassword1", fullName: "Dup 2" });
    expect(res.status).toBe(409);
  });

  it("never returns the password or its hash", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "safe@example.com", password: "correcthorsebattery", fullName: "Safe User" });
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("correcthorsebattery");
    expect(serialized.toLowerCase()).not.toContain("passwordhash");
  });

  it("requires fullName", async () => {
    const res = await request(app).post("/auth/signup").send({ email: "no-name@example.com", password: "correcthorsebattery" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("logs in with correct credentials", async () => {
    await request(app).post("/auth/signup").send({ email: "login@example.com", password: "correcthorsebattery", fullName: "Login User" });
    const res = await request(app).post("/auth/login").send({ email: "login@example.com", password: "correcthorsebattery" });
    expect(res.status).toBe(200);
    expect(res.body.flow.stage).toBe("choose_bot");
  });

  it("rejects an incorrect password without revealing whether the email exists", async () => {
    const res = await request(app).post("/auth/login").send({ email: "nobody@example.com", password: "whatever12345" });
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/session", () => {
  it("reports unauthenticated with no session", async () => {
    const res = await request(app).get("/auth/session");
    expect(res.body.authenticated).toBe(false);
  });

  it("reports authenticated after signup, using the same agent's cookie", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/signup").send({ email: "sess@example.com", password: "correcthorsebattery", fullName: "Sess User" });
    const res = await agent.get("/auth/session");
    expect(res.body.authenticated).toBe(true);
  });
});

describe("password reset", () => {
  it("sends a reset email for a registered address and lets the user set a new password", async () => {
    await request(app).post("/auth/signup").send({ email: "reset@example.com", password: "correcthorsebattery", fullName: "Reset User" });
    const reqRes = await request(app).post("/auth/password-reset/request").send({ email: "reset@example.com" });
    expect(reqRes.status).toBe(200);
    expect(emailAdapter.sent).toHaveLength(1);

    const link = emailAdapter.sent[0]!.text;
    const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

    const confirmRes = await request(app).post("/auth/password-reset/confirm").send({ token, newPassword: "brandnewpassword1" });
    expect(confirmRes.status).toBe(200);

    const loginRes = await request(app).post("/auth/login").send({ email: "reset@example.com", password: "brandnewpassword1" });
    expect(loginRes.status).toBe(200);
  });

  it("gives the same response for an unregistered email, without sending anything", async () => {
    const res = await request(app).post("/auth/password-reset/request").send({ email: "nobody@example.com" });
    expect(res.status).toBe(200);
    expect(emailAdapter.sent).toHaveLength(0);
  });
});
