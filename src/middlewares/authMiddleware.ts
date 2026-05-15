import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";

// On etend Express.Request pour pouvoir attacher l'utilisateur authentifie.
declare module "express-serve-static-core" {
  interface Request {
    auth?: { userId: number; role: "student" | "admin" };
  }
}

// Verifie la presence et la validite du JWT dans l'en-tete Authorization: Bearer <token>.
// Renvoie 401 si absent ou invalide. Sinon, attache req.auth et passe la main.
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }
  const token = header.slice("Bearer ".length);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Token invalide ou expire" });
    return;
  }
  req.auth = payload;
  next();
};

// Doit etre place APRES requireAuth. Bloque les non-admins (403).
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.auth?.role !== "admin") {
    res.status(403).json({ error: "Acces reserve aux administrateurs" });
    return;
  }
  next();
};
