import type { Request, Response } from "express";
import * as itemsRepository from "./itemsRepository.js";

// Actions = controllers Express. Ils valident l'entrée, appellent le repository,
// et formatent la réponse. Aucun SQL ici.

// GET /api/items — renvoie tous les items.
export const browse = async (_req: Request, res: Response) => {
  const items = await itemsRepository.findAll();
  res.json(items);
};

// GET /api/items/:id — renvoie un item ou 404.
export const read = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await itemsRepository.findById(id);
  if (!item) {
    res.status(404).json({ error: "Item introuvable" });
    return;
  }
  res.json(item);
};

// POST /api/items — crée un item à partir du body { title }.
export const add = async (req: Request, res: Response) => {
  const { title } = req.body as { title?: string };
  if (!title || title.length < 1) {
    res.status(400).json({ error: "Le champ 'title' est requis" });
    return;
  }
  const id = await itemsRepository.create(title);
  res.status(201).json({ id, title });
};
