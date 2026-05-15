import type { Request, Response } from "express";
import { hashPassword, verifyPassword } from "../../utils/hash.js";
import { signToken } from "../../utils/jwt.js";
import { isEmail, isStringOfLength } from "../../utils/validation.js";
import * as authRepository from "./authRepository.js";

// POST /api/auth/register — cree un compte eleve.
// Renvoie le token JWT et les infos publiques de l'utilisateur.
export const register = async (req: Request, res: Response): Promise<void> => {
  const { lastname, firstname, email, password } = req.body ?? {};

  // Validation des champs (frontiere de l'API).
  if (
    !isStringOfLength(lastname, 1, 100) ||
    !isStringOfLength(firstname, 1, 100) ||
    !isEmail(email) ||
    !isStringOfLength(password, 8, 100)
  ) {
    res.status(400).json({ error: "Champs invalides ou mot de passe trop court (min 8)" });
    return;
  }

  // L'email doit etre unique.
  const existing = await authRepository.findByEmail(email);
  if (existing) {
    res.status(409).json({ error: "Email deja utilise" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const userId = await authRepository.create({ lastname, firstname, email, passwordHash });
  const token = signToken({ userId, role: "student" });

  res.status(201).json({ token, user: { id: userId, lastname, firstname, email, role: "student" } });
};

// POST /api/auth/login — connecte un utilisateur existant.
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!isEmail(email) || !isStringOfLength(password, 1, 100)) {
    res.status(400).json({ error: "Email ou mot de passe invalide" });
    return;
  }

  const user = await authRepository.findByEmail(email);
  // Meme message en cas d'utilisateur absent ou de mot de passe faux,
  // pour ne pas reveler si un email est inscrit ou non.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      lastname: user.lastname,
      firstname: user.firstname,
      email: user.email,
      role: user.role,
    },
  });
};
