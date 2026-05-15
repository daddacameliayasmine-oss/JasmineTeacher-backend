import type { NextFunction, Request, Response } from "express";

// Middleware d'erreur global : attrape toute exception non geree des handlers async
// et renvoie un 500 propre sans fuiter de stack au client.
// Doit etre monte EN DERNIER dans app.ts (apres tous les routers).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error("[errorHandler]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erreur interne du serveur" });
};
