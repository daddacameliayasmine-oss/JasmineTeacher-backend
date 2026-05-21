import type { Request, Response } from "express";
import * as usersRepository from "./usersRepository.js";

// GET /api/users — liste de tous les utilisateurs (admin uniquement).
export const browse = async (_req: Request, res: Response): Promise<void> => {
  const users = await usersRepository.findAll();
  res.json(users);
};

// PUT /api/users/:id — modifie le role d'un utilisateur (admin uniquement).
// Empeche l'admin courant de se retrograder lui-meme (eviterait l'absence d'admin).
export const editRole = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const role = (req.body as { role?: unknown })?.role;
  if (!Number.isInteger(id) || id < 1 || (role !== "student" && role !== "admin")) {
    res.status(400).json({ error: "id ou role invalide" });
    return;
  }
  if (id === req.auth!.userId && role !== "admin") {
    res.status(403).json({ error: "Vous ne pouvez pas vous retrograder vous-meme" });
    return;
  }
  const affected = await usersRepository.updateRole(id, role);
  if (affected === 0) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.json({ id, role });
};

// DELETE /api/users/:id — supprime un utilisateur (admin uniquement).
// Empeche l'admin de se supprimer lui-meme.
export const destroy = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }
  if (id === req.auth!.userId) {
    res.status(403).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    return;
  }
  const affected = await usersRepository.remove(id);
  if (affected === 0) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.status(204).send();
};
