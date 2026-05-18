import type { Request, Response } from "express";
import { isStringOfLength } from "../../utils/validation.js";
import * as coursesRepository from "./coursesRepository.js";
import type { CourseInput } from "./coursesRepository.js";

// Types autorises pour un cours (correspond a l'ENUM SQL).
const ALLOWED_TYPES = ["collectif", "individuel", "enfant_collectif", "enfant_individuel"] as const;

// Parse et valide les donnees recues. Renvoie null si invalide.
const parseCourseInput = (body: unknown): CourseInput | null => {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  if (!isStringOfLength(b.title, 1, 200)) return null;
  if (!ALLOWED_TYPES.includes(b.type as (typeof ALLOWED_TYPES)[number])) return null;
  if (typeof b.price !== "number" || b.price < 0) return null;
  if (typeof b.capacity !== "number" || b.capacity < 1) return null;
  if (typeof b.start_at !== "string") return null;
  const startAt = new Date(b.start_at);
  if (Number.isNaN(startAt.getTime())) return null;
  if (typeof b.duration_minutes !== "number" || b.duration_minutes < 15) return null;

  return {
    title: b.title as string,
    description: typeof b.description === "string" ? b.description : null,
    type: b.type as CourseInput["type"],
    price: b.price,
    capacity: b.capacity,
    start_at: startAt,
    duration_minutes: b.duration_minutes,
    visio_url: typeof b.visio_url === "string" ? b.visio_url : null,
  };
};

// GET /api/courses — liste publique des cours.
export const browse = async (_req: Request, res: Response): Promise<void> => {
  const courses = await coursesRepository.findAll();
  res.json(courses);
};

// GET /api/courses/:id — detail d'un cours.
export const read = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }
  const course = await coursesRepository.findById(id);
  if (!course) {
    res.status(404).json({ error: "Cours introuvable" });
    return;
  }
  res.json(course);
};

// POST /api/courses — creation (admin uniquement).
export const add = async (req: Request, res: Response): Promise<void> => {
  const input = parseCourseInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Donnees invalides" });
    return;
  }
  const id = await coursesRepository.create(input, req.auth!.userId);
  res.status(201).json({ id, ...input, created_by: req.auth!.userId });
};

// PUT /api/courses/:id — mise a jour (admin uniquement).
export const edit = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }
  const input = parseCourseInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Donnees invalides" });
    return;
  }
  const affected = await coursesRepository.update(id, input);
  if (affected === 0) {
    res.status(404).json({ error: "Cours introuvable" });
    return;
  }
  res.json({ id, ...input });
};

// DELETE /api/courses/:id — suppression (admin uniquement).
export const destroy = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }
  const affected = await coursesRepository.remove(id);
  if (affected === 0) {
    res.status(404).json({ error: "Cours introuvable" });
    return;
  }
  res.status(204).send();
};
