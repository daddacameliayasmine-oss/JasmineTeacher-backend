import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";

// Tests de la route POST /api/payments/webhook.
// Pas de mocking de Stripe : on verifie le contrat de bordure (signature manquante / invalide).
// La verification de signature reelle est testee end-to-end via 'stripe trigger' + 'stripe listen'.

let request: typeof import("supertest").default;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy_for_init";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy_for_init";
  request = (await import("supertest")).default;
});

describe("POST /api/payments/webhook", () => {
  it("rejette 400 si le header stripe-signature est absent", async () => {
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .send({ id: "evt_test", type: "checkout.session.completed" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Signature/i);
  });

  it("rejette 400 si la signature est invalide", async () => {
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=123,v1=invalidesignature")
      .send({ id: "evt_test", type: "checkout.session.completed" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Webhook/i);
  });

  it("la route webhook n'est PAS protegee par requireAuth (Stripe ne passe pas de token)", async () => {
    const res = await request(app).post("/api/payments/webhook");
    // 400 (signature manquante), surtout pas 401.
    expect(res.status).toBe(400);
    expect(res.body.error).not.toMatch(/Token/i);
  });
});
