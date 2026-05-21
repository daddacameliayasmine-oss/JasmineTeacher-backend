import type { Request, Response } from "express";
import { isStringOfLength } from "../../utils/validation.js";
import * as usersRepository from "./usersRepository.js";

// GET /api/users — liste de tous les utilisateurs (admin uniquement).
export const browse = async (_req: Request, res: Response): Promise<void> => {
  const users = await usersRepository.findAll();
  res.json(users);
};

// PUT /api/users/:id — met a jour firstname / lastname / role (admin uniquement).
// Au moins un des champs doit etre present. Empeche l'admin de se retrograder.
export const editUser = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const hasFirstname = body.firstname !== undefined;
  const hasLastname = body.lastname !== undefined;
  const hasRole = body.role !== undefined;
  if (!hasFirstname && !hasLastname && !hasRole) {
    res.status(400).json({ error: "Aucun champ a mettre a jour" });
    return;
  }

  // Si on met a jour le prenom OU le nom, les DEUX doivent etre fournis valides
  // (la requete SQL met les deux a la fois pour rester simple).
  if (hasFirstname || hasLastname) {
    if (!isStringOfLength(body.firstname, 1, 100) || !isStringOfLength(body.lastname, 1, 100)) {
      res.status(400).json({ error: "firstname et lastname requis (1-100 caracteres)" });
      return;
    }
    const affected = await usersRepository.updateProfile(
      id,
      body.firstname as string,
      body.lastname as string,
    );
    if (affected === 0) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }
  }

  if (hasRole) {
    if (body.role !== "student" && body.role !== "admin") {
      res.status(400).json({ error: "role invalide" });
      return;
    }
    if (id === req.auth!.userId && body.role !== "admin") {
      res.status(403).json({ error: "Vous ne pouvez pas vous retrograder vous-meme" });
      return;
    }
    const affected = await usersRepository.updateRole(id, body.role);
    if (affected === 0) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }
  }

  const updated = await usersRepository.findPublicById(id);
  res.json(updated);
};

// PUT /api/users/me — l'utilisateur connecte met a jour SON prenom et SON nom.
// Volontairement restreint : pas d'email ni de role (eviterait escalation).
export const editMe = async (req: Request, res: Response): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!isStringOfLength(body.firstname, 1, 100) || !isStringOfLength(body.lastname, 1, 100)) {
    res.status(400).json({ error: "firstname et lastname requis (1-100 caracteres)" });
    return;
  }
  await usersRepository.updateProfile(
    req.auth!.userId,
    body.firstname as string,
    body.lastname as string,
  );
  const updated = await usersRepository.findPublicById(req.auth!.userId);
  res.json(updated);
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
