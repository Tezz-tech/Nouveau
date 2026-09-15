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
  emailAdapter.sent = []; // the adapter instance is shared across the whole file — the DB clear above doesn't touch it
});

describe("POST /auth/signup", () => {
  it("creates a user and starts a session", async () => {
    const res = await request(app).post("/auth/signup").send({ email: "new@example.com", password: "correcthorsebattery" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("new@example.com");
    expect(res.body.onboarding.completedSteps).toEqual(["account"]);
    expect(res.body.onboarding.nextStep).toBe("identity");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects a password shorter than 10 characters", async () => {
    const res = await request(app).post("/auth/signup").send({ email: "short@example.com", password: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email without revealing which check failed differently", async () => {
    await request(app).post("/auth/signup").send({ email: "dup@example.com", password: "correcthorsebattery" });
    const res = await request(app).post("/auth/signup").send({ email: "dup@example.com", password: "anotherpassword1" });
    expect(res.status).toBe(409);
  });

  it("never returns the password or its hash", async () => {
    const res = await request(app).post("/auth/signup").send({ email: "safe@example.com", password: "correcthorsebattery" });
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("correcthorsebattery");
    expect(serialized.toLowerCase()).not.toContain("passwordhash");
  });
});

describe("POST /auth/login and session lifecycle", () => {
  it("logs in with correct credentials and the session persists across requests", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/signup").send({ email: "loginflow@example.com", password: "correcthorsebattery" });
    await agent.post("/auth/logout");

    const loginRes = await agent.post("/auth/login").send({ email: "loginflow@example.com", password: "correcthorsebattery" });
    expect(loginRes.status).toBe(200);

    const sessionRes = await agent.get("/auth/session");
    expect(sessionRes.body.authenticated).toBe(true);
  });

  it("rejects the wrong password", async () => {
    await request(app).post("/auth/signup").send({ email: "wrongpass@example.com", password: "correcthorsebattery" });
    const res = await request(app).post("/auth/login").send({ email: "wrongpass@example.com", password: "wrongpassword1" });
    expect(res.status).toBe(401);
  });

  it("rejects login for a nonexistent email with the same status as a wrong password", async () => {
    const res = await request(app).post("/auth/login").send({ email: "doesnotexist@example.com", password: "whatever12345" });
    expect(res.status).toBe(401);
  });

  it("logout ends the session", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/signup").send({ email: "logout@example.com", password: "correcthorsebattery" });
    await agent.post("/auth/logout");
    const res = await agent.get("/auth/session");
    expect(res.body.authenticated).toBe(false);
  });
});

describe("password reset flow", () => {
  it("requesting a reset for a real email sends an email containing a usable token, which then works", async () => {
    await request(app).post("/auth/signup").send({ email: "reset@example.com", password: "originalPassword1" });

    const reqRes = await request(app).post("/auth/password-reset/request").send({ email: "reset@example.com" });
    expect(reqRes.status).toBe(200);
    expect(emailAdapter.sent).toHaveLength(1);
    expect(emailAdapter.sent[0]!.to).toBe("reset@example.com");

    const link = emailAdapter.sent[0]!.text;
    const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
    expect(token).toBeTruthy();

    const confirmRes = await request(app).post("/auth/password-reset/confirm").send({ token, newPassword: "brandNewPassword1" });
    expect(confirmRes.status).toBe(200);

    const loginRes = await request(app).post("/auth/login").send({ email: "reset@example.com", password: "brandNewPassword1" });
    expect(loginRes.status).toBe(200);

    // old password no longer works
    const oldLoginRes = await request(app).post("/auth/login").send({ email: "reset@example.com", password: "originalPassword1" });
    expect(oldLoginRes.status).toBe(401);
  });

  it("requesting a reset for an unregistered email returns the same success response and sends no email", async () => {
    const res = await request(app).post("/auth/password-reset/request").send({ email: "ghost@example.com" });
    expect(res.status).toBe(200);
    expect(emailAdapter.sent).toHaveLength(0);
  });

  it("a used or malformed token is rejected", async () => {
    const res = await request(app).post("/auth/password-reset/confirm").send({ token: "not-a-real-token", newPassword: "whatever1234" });
    expect(res.status).toBe(400);
  });

  it("a token cannot be reused after a successful reset", async () => {
    await request(app).post("/auth/signup").send({ email: "reuse@example.com", password: "originalPassword1" });
    await request(app).post("/auth/password-reset/request").send({ email: "reuse@example.com" });
    const link = emailAdapter.sent.at(-1)!.text;
    const token = new URL(link.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

    const first = await request(app).post("/auth/password-reset/confirm").send({ token, newPassword: "firstNewPassword1" });
    expect(first.status).toBe(200);

    const second = await request(app).post("/auth/password-reset/confirm").send({ token, newPassword: "secondNewPassword1" });
    expect(second.status).toBe(400);
  });
});
