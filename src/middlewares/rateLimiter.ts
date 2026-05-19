import type { NextFunction, Request, Response } from "express";

// Rate limiter en memoire (suffisant pour ce projet, single-instance).
// Limite : N requetes par IP sur une fenetre glissante.
// Pour de la prod multi-noeuds, on remplacerait par un store Redis.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

type Options = {
  // Fenetre en ms (par defaut 1 minute).
  windowMs?: number;
  // Nombre max de requetes par IP sur la fenetre.
  max?: number;
};

export const rateLimit = ({ windowMs = 60_000, max = 10 }: Options = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Echappatoire pour les tests E2E : la variable d'env DISABLE_RATE_LIMIT
    // permet de bypasser le rate limit (ne JAMAIS activer en production).
    if (process.env.DISABLE_RATE_LIMIT === "true") {
      next();
      return;
    }
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Trop de requetes, reessayez plus tard" });
      return;
    }

    bucket.count += 1;
    next();
  };
};
