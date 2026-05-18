import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/utils/hash.js";

// Tests bcrypt : on verifie surtout que le hash n'est jamais le mot de passe en clair
// et que verify renvoie le bon booleen. bcrypt est lent (~250 ms) donc on limite a 3 cas.
describe("hashPassword / verifyPassword", () => {
  it("hash differe du mot de passe en clair", async () => {
    const hash = await hashPassword("monMotDePasse123");
    expect(hash).not.toBe("monMotDePasse123");
    expect(hash.length).toBeGreaterThan(50);
  });

  it("verifie correctement le mot de passe original", async () => {
    const hash = await hashPassword("secret-jasmine");
    expect(await verifyPassword("secret-jasmine", hash)).toBe(true);
  });

  it("rejette un mot de passe incorrect", async () => {
    const hash = await hashPassword("bon-mot-de-passe");
    expect(await verifyPassword("mauvais-mot-de-passe", hash)).toBe(false);
  });
});
