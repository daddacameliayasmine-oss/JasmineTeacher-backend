import type { Request, Response } from "express";
import * as bookingsRepository from "../bookings/bookingsRepository.js";
import * as coursesRepository from "../courses/coursesRepository.js";
import * as paymentsRepository from "./paymentsRepository.js";

// POST /api/payments — paye une reservation en attente (mode mock).
// Body : { bookingId: number }
// Effet : cree un Payment status=paid + passe le booking en status=confirmed.
export const pay = async (req: Request, res: Response): Promise<void> => {
  const bookingId = Number((req.body as { bookingId?: unknown })?.bookingId);
  if (!Number.isInteger(bookingId) || bookingId < 1) {
    res.status(400).json({ error: "bookingId invalide" });
    return;
  }

  const booking = await bookingsRepository.findById(bookingId);
  if (!booking) {
    res.status(404).json({ error: "Reservation introuvable" });
    return;
  }

  // Seul le proprietaire de la reservation peut la payer.
  if (booking.user_id !== req.auth!.userId) {
    res.status(403).json({ error: "Vous ne pouvez payer que vos propres reservations" });
    return;
  }

  if (booking.status !== "pending") {
    res.status(409).json({ error: "Cette reservation n'est plus en attente" });
    return;
  }

  // On retrouve le prix via le cours (source de verite, jamais via le body client).
  const course = await coursesRepository.findById(booking.course_id);
  if (!course) {
    res.status(404).json({ error: "Cours associe introuvable" });
    return;
  }

  const paymentId = await paymentsRepository.createPaid(bookingId, course.price);
  await bookingsRepository.updateStatus(bookingId, "confirmed");

  res.status(201).json({
    id: paymentId,
    booking_id: bookingId,
    amount: course.price,
    status: "paid",
  });
};

// GET /api/payments — liste tous les paiements (admin uniquement).
export const browseAll = async (_req: Request, res: Response): Promise<void> => {
  const payments = await paymentsRepository.findAll();
  res.json(payments);
};
