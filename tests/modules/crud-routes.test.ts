import { beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { signToken } from "../../src/utils/jwt.js";

// On utilise supertest pour appeler l'app sans la binder a un port.
// Ces tests verifient le cablage des endpoints (auth + roles + validation des params).
// Ils ne touchent volontairement PAS la BDD :
// - sans token → 401 attendu (rejet avant SQL)
// - avec token student → 403 attendu (rejet avant SQL)
// - avec token admin + param invalide → 400 attendu (rejet avant SQL)
//
// L'import dynamique evite que supertest tente de binder un port avant la config Express.

let request: typeof import("supertest").default;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  request = (await import("supertest")).default;
});

const adminToken = () => signToken({ userId: 1, role: "admin" });
const studentToken = () => signToken({ userId: 2, role: "student" });

describe("CRUD endpoints — cablage routes", () => {
  describe("PUT /api/videos/:id", () => {
    it("sans token → 401", async () => {
      const res = await request(app).put("/api/videos/1").send({ title: "x", url: "https://x.com" });
      expect(res.status).toBe(401);
    });

    it("avec token student → 403", async () => {
      const res = await request(app)
        .put("/api/videos/1")
        .set("Authorization", `Bearer ${studentToken()}`)
        .send({ title: "x", url: "https://x.com" });
      expect(res.status).toBe(403);
    });

    it("avec admin mais payload invalide → 400", async () => {
      const res = await request(app)
        .put("/api/videos/1")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ title: "", url: "pas-une-url" });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/users/:id", () => {
    it("sans token → 401", async () => {
      const res = await request(app).put("/api/users/2").send({ role: "admin" });
      expect(res.status).toBe(401);
    });

    it("avec admin + role invalide → 400", async () => {
      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ role: "superadmin" });
      expect(res.status).toBe(400);
    });

    it("admin se retrogradant lui-meme → 403", async () => {
      const res = await request(app)
        .put("/api/users/1")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ role: "student" });
      expect(res.status).toBe(403);
    });

    it("avec admin + body vide → 400", async () => {
      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("avec admin + firstname seul (sans lastname) → 400", async () => {
      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ firstname: "Bob" });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/users/me", () => {
    it("sans token → 401", async () => {
      const res = await request(app)
        .put("/api/users/me")
        .send({ firstname: "Bob", lastname: "Martin" });
      expect(res.status).toBe(401);
    });

    it("avec token mais payload invalide → 400", async () => {
      const res = await request(app)
        .put("/api/users/me")
        .set("Authorization", `Bearer ${studentToken()}`)
        .send({ firstname: "" });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("admin se supprimant lui-meme → 403", async () => {
      const res = await request(app)
        .delete("/api/users/1")
        .set("Authorization", `Bearer ${adminToken()}`);
      expect(res.status).toBe(403);
    });

    it("token student → 403", async () => {
      const res = await request(app)
        .delete("/api/users/2")
        .set("Authorization", `Bearer ${studentToken()}`);
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/bookings/:id (admin status)", () => {
    it("sans token → 401", async () => {
      const res = await request(app).put("/api/bookings/1").send({ status: "confirmed" });
      expect(res.status).toBe(401);
    });

    it("avec student → 403", async () => {
      const res = await request(app)
        .put("/api/bookings/1")
        .set("Authorization", `Bearer ${studentToken()}`)
        .send({ status: "confirmed" });
      expect(res.status).toBe(403);
    });

    it("status non autorise → 400", async () => {
      const res = await request(app)
        .put("/api/bookings/1")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ status: "completed" });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/payments/:id/refund", () => {
    it("sans token → 401", async () => {
      const res = await request(app).put("/api/payments/1/refund");
      expect(res.status).toBe(401);
    });

    it("avec student → 403", async () => {
      const res = await request(app)
        .put("/api/payments/1/refund")
        .set("Authorization", `Bearer ${studentToken()}`);
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/contact/:id", () => {
    it("sans token → 401", async () => {
      const res = await request(app).delete("/api/contact/1");
      expect(res.status).toBe(401);
    });

    it("avec student → 403", async () => {
      const res = await request(app)
        .delete("/api/contact/1")
        .set("Authorization", `Bearer ${studentToken()}`);
      expect(res.status).toBe(403);
    });
  });
});
