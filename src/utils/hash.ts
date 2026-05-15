import bcrypt from "bcrypt";

// Coût bcrypt : 12 = bon compromis securite/perf (≈ 250 ms par hash).
const SALT_ROUNDS = 12;

// Hash un mot de passe en clair avant insertion en BDD.
export const hashPassword = (plain: string): Promise<string> => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

// Compare un mot de passe en clair au hash stocke en BDD.
export const verifyPassword = (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};
