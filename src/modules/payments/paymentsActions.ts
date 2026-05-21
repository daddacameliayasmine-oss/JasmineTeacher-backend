import type { Request, Response } from "express";
import { getStripeClient } from "../../utils/stripe.js";
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

// PUT /api/payments/:id — rembourse un paiement (admin uniquement).
// Le booking associe repasse en "cancelled" pour reflecter la situation.
export const refund = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Identifiant invalide" });
    return;
  }
  const payment = await paymentsRepository.findById(id);
  if (!payment) {
    res.status(404).json({ error: "Paiement introuvable" });
    return;
  }
  const affected = await paymentsRepository.refund(id);
  if (affected === 0) {
    res.status(409).json({ error: "Paiement deja rembourse ou non paye" });
    return;
  }
  await bookingsRepository.updateStatus(payment.booking_id, "cancelled");
  res.json({ id, status: "refunded", booking_id: payment.booking_id });
};

// POST /api/payments/checkout-session — cree une session Stripe Checkout (mode test).
// Body : { bookingId: number }
// Renvoie l'URL Stripe vers laquelle rediriger le navigateur de l'eleve.
// Necessite STRIPE_SECRET_KEY ; sinon utiliser le flux mock POST /api/payments.
export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({ error: "Stripe non configure (utilisez le mode mock)" });
    return;
  }

  const bookingId = Number((req.body as { bookingId?: unknown })?.bookingId);
  if (!Number.isInteger(bookingId) || bookingId < 1) {
    res.status(400).json({ error: "bookingId invalide" });
    return;
  }

  const booking = await bookingsRepository.findById(bookingId);
  if (!booking || booking.user_id !== req.auth!.userId) {
    res.status(404).json({ error: "Reservation introuvable" });
    return;
  }
  if (booking.status !== "pending") {
    res.status(409).json({ error: "Cette reservation n'est plus en attente" });
    return;
  }

  const course = await coursesRepository.findById(booking.course_id);
  if (!course) {
    res.status(404).json({ error: "Cours associe introuvable" });
    return;
  }

  // Session Checkout one-shot. Le booking est confirme cote serveur quand
  // le navigateur revient sur l'URL de succes (cf. POST /api/payments mock-finalize).
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: Math.round(Number(course.price) * 100),
          product_data: { name: course.title },
        },
        quantity: 1,
      },
    ],
    success_url: process.env.STRIPE_SUCCESS_URL ?? "http://localhost:5173/mon-espace?paid=1",
    cancel_url: process.env.STRIPE_CANCEL_URL ?? "http://localhost:5173/mon-espace?cancelled=1",
    metadata: { bookingId: String(bookingId) },
  });

  res.status(201).json({ url: session.url });
};
