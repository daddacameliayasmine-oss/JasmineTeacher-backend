import type { Request, Response } from "express";
import { isEmail, isStringOfLength } from "../../utils/validation.js";
import * as contactRepository from "./contactRepository.js";

// POST /api/contact — depose un message depuis le formulaire de contact (public).
// Body : { email?: string, message: string }
export const add = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { email?: unknown; message?: unknown };

  if (!isStringOfLength(body.message, 5, 2000)) {
    res.status(400).json({ error: "Le message doit faire entre 5 et 2000 caracteres" });
    return;
  }

  // Email optionnel mais si fourni, doit etre valide.
  const email = isEmail(body.email) ? body.email : null;

  const id = await contactRepository.create(email, body.message);
  res.status(201).json({ id });
};

// GET /api/contact — liste les messages (admin uniquement).
export const browse = async (_req: Request, res: Response): Promise<void> => {
  const messages = await contactRepository.findAll();
  res.json(messages);
};
