import type { Request, Response } from "express";
import * as usersRepository from "./usersRepository.js";

// GET /api/users — liste de tous les utilisateurs (admin uniquement).
export const browse = async (_req: Request, res: Response): Promise<void> => {
  const users = await usersRepository.findAll();
  res.json(users);
};
