import type { Request, Response } from "express";
import * as statsRepository from "./statsRepository.js";

// GET /api/stats — renvoie un objet de KPIs pour le dashboard admin.
export const browse = async (_req: Request, res: Response): Promise<void> => {
  const stats = await statsRepository.computeAdminStats();
  res.json(stats);
};
