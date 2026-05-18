import type { Request, Response } from "express";
import * as coursesRepository from "../courses/coursesRepository.js";
import * as bookingsRepository from "./bookingsRepository.js";

// Reservation minimum N jours avant le cours (règle métier WCS / Jasmine).
const MIN_DAYS_BEFORE = 7;

// GET /api/bookings/me — liste les reservations de l'utilisateur connecte.
export const browseMine = async (req: Request, res: Response): Promise<void> => {
  const bookings = await bookingsRepository.findByUserWithCourse(req.auth!.userId);
  res.json(bookings);
};

// GET /api/bookings/all — toutes les reservations avec details (admin uniquement).
export const browseAll = async (_req: Request, res: Response): Promise<void> => {
  const bookings = await bookingsRepository.findAllWithDetails();
  res.json(bookings);
};

// POST /api/bookings — l'eleve reserve un cours.
// Body attendu : { courseId: number }
export const add = async (req: Request, res: Response): Promise<void> => {
  const courseId = Number((req.body as { courseId?: unknown })?.courseId);
  if (!Number.isInteger(courseId) || courseId < 1) {
    res.status(400).json({ error: "courseId invalide" });
    return;
  }

  // Le cours doit exister.
  const course = await coursesRepository.findById(courseId);
  if (!course) {
    res.status(404).json({ error: "Cours introuvable" });
    return;
  }

  // Reservation possible uniquement si on est a +7 jours du cours.
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + MIN_DAYS_BEFORE);
  if (new Date(course.start_at) < minDate) {
    res.status(400).json({ error: `Reservation a minimum ${MIN_DAYS_BEFORE} jours d'avance` });
    return;
  }

  // L'eleve ne peut pas reserver 2 fois le meme cours.
  const existing = await bookingsRepository.findActiveByUserAndCourse(req.auth!.userId, courseId);
  if (existing) {
    res.status(409).json({ error: "Vous avez deja une reservation pour ce cours" });
    return;
  }

  // Capacite du cours.
  const taken = await bookingsRepository.countActiveByCourse(courseId);
  if (taken >= course.capacity) {
    res.status(409).json({ error: "Cours complet" });
    return;
  }

  const id = await bookingsRepository.create(req.auth!.userId, courseId);
  res.status(201).json({ id, user_id: req.auth!.userId, course_id: courseId, status: "pending" });
};

// DELETE /api/bookings/:id — annule la reservation (status = cancelled).
// L'eleve ne peut annuler QUE ses propres reservations. L'admin peut tout annuler.
export const cancel = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }

  const booking = await bookingsRepository.findById(id);
  if (!booking) {
    res.status(404).json({ error: "Reservation introuvable" });
    return;
  }

  if (req.auth!.role !== "admin" && booking.user_id !== req.auth!.userId) {
    res.status(403).json({ error: "Vous ne pouvez annuler que vos propres reservations" });
    return;
  }

  await bookingsRepository.updateStatus(id, "cancelled");
  res.status(204).send();
};
