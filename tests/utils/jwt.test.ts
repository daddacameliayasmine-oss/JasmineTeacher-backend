import { beforeAll, describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../../src/utils/jwt.js";

// On force un secret connu avant tout pour avoir des resultats deterministes.
beforeAll(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "1h";
});

describe("signToken / verifyToken", () => {
  it("signe et verifie un payload student", () => {
    const token = signToken({ userId: 42, role: "student" });
    const payload = verifyToken(token);
    expect(payload?.userId).toBe(42);
    expect(payload?.role).toBe("student");
  });

  it("signe et verifie un payload admin", () => {
    const token = signToken({ userId: 1, role: "admin" });
    expect(verifyToken(token)?.role).toBe("admin");
  });

  it("renvoie null pour un token corrompu", () => {
    expect(verifyToken("not.a.real.jwt")).toBeNull();
  });

  it("renvoie null pour un token signe avec un autre secret", () => {
    const token = signToken({ userId: 1, role: "student" });
    process.env.JWT_SECRET = "autre-secret";
    expect(verifyToken(token)).toBeNull();
    process.env.JWT_SECRET = "test-secret";
  });
});
