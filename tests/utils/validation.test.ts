import { describe, expect, it } from "vitest";
import { isEmail, isStringOfLength } from "../../src/utils/validation.js";

// Validations utilisees aux frontieres de l'API : on teste les golden paths
// et plusieurs edge cases pour eviter les regressions silencieuses.
describe("isEmail", () => {
  it("accepte un email standard", () => {
    expect(isEmail("jasmine@example.com")).toBe(true);
  });

  it("rejette une chaine sans @", () => {
    expect(isEmail("jasmineexample.com")).toBe(false);
  });

  it("rejette une chaine vide", () => {
    expect(isEmail("")).toBe(false);
  });

  it("rejette un non-string", () => {
    expect(isEmail(42)).toBe(false);
    expect(isEmail(null)).toBe(false);
    expect(isEmail(undefined)).toBe(false);
  });

  it("rejette un email avec espaces", () => {
    expect(isEmail("a b@example.com")).toBe(false);
  });
});

describe("isStringOfLength", () => {
  it("accepte une chaine dans la fourchette", () => {
    expect(isStringOfLength("jasmine", 3, 20)).toBe(true);
  });

  it("accepte les bornes inclusives", () => {
    expect(isStringOfLength("abc", 3, 3)).toBe(true);
  });

  it("rejette trop court", () => {
    expect(isStringOfLength("ab", 3, 10)).toBe(false);
  });

  it("rejette trop long", () => {
    expect(isStringOfLength("abcdef", 1, 3)).toBe(false);
  });

  it("rejette un non-string", () => {
    expect(isStringOfLength(123, 1, 10)).toBe(false);
  });
});
