import type { Request, Response } from "express";
import { isStringOfLength } from "../../utils/validation.js";
import * as videosRepository from "./videosRepository.js";

// Verifie une URL minimaliste (http/https).
const isHttpUrl = (value: unknown): value is string => {
  return typeof value === "string" && /^https?:\/\/\S+$/.test(value);
};

// GET /api/videos — vitrine publique pour les visiteurs.
export const browsePublic = async (_req: Request, res: Response): Promise<void> => {
  const videos = await videosRepository.findPublic();
  res.json(videos);
};

// GET /api/videos/all — toutes les videos (auth requise).
// Sert aux eleves (vidéos de cours) ET aux admins.
export const browseAll = async (_req: Request, res: Response): Promise<void> => {
  const videos = await videosRepository.findAll();
  res.json(videos);
};

// POST /api/videos — ajout d'une vidéo (admin uniquement).
export const add = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { title?: unknown; url?: unknown; is_public?: unknown };
  if (!isStringOfLength(body.title, 1, 200) || !isHttpUrl(body.url)) {
    res.status(400).json({ error: "Titre et URL http(s) requis" });
    return;
  }
  const id = await videosRepository.create({
    title: body.title,
    url: body.url,
    is_public: body.is_public !== false,
  });
  res.status(201).json({ id, title: body.title, url: body.url, is_public: body.is_public !== false });
};

// DELETE /api/videos/:id — suppression (admin uniquement).
export const destroy = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }
  const affected = await videosRepository.remove(id);
  if (affected === 0) {
    res.status(404).json({ error: "Video introuvable" });
    return;
  }
  res.status(204).send();
};
