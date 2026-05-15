import jwt from "jsonwebtoken";

// Payload minimal embarque dans le token : id utilisateur + role.
// Pas d'info sensible (le JWT n'est pas chiffre, juste signe).
export type TokenPayload = {
  userId: number;
  role: "student" | "admin";
};

// Signe un token JWT avec une duree fixe (defaut 2h).
export const signToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET ?? "dev-only-secret";
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "2h";
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

// Verifie un token et renvoie son payload, ou null si invalide.
export const verifyToken = (token: string): TokenPayload | null => {
  const secret = process.env.JWT_SECRET ?? "dev-only-secret";
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
};
