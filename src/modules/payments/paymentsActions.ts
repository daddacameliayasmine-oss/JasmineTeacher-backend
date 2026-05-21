import type { Request, Response } from "express";
import type Stripe from "stripe";
import { getStripeClient, verifyWebhookEvent } from "../../utils/stripe.js";
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

  // Session Checkout. Le booking sera confirme cote serveur via le webhook
  // 'checkout.session.completed' (signature verifiee) — pas via le success_url
  // (jamais fiable car l'eleve peut ne pas revenir).
  // Idempotency key : evite les sessions en double si l'eleve double-clique.
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
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
      // Metadata indispensables : on les retrouve dans le webhook pour
      // identifier la booking sans faire confiance au client.
      metadata: { bookingId: String(bookingId), userId: String(req.auth!.userId) },
    },
    { idempotencyKey: `checkout-booking-${bookingId}` },
  );

  res.status(201).json({ url: session.url });
};

// POST /api/payments/webhook — receveur des events Stripe.
// IMPORTANT : route configuree avec express.raw() pour preserver le body
// exact recu de Stripe (sinon la verification de signature echoue).
// Documentation officielle : https://docs.stripe.com/webhooks/signatures
export const webhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).json({ error: "Signature Stripe manquante" });
    return;
  }

  let event: Stripe.Event;
  try {
    // req.body est un Buffer ici grace au middleware express.raw sur la route.
    event = verifyWebhookEvent(req.body as Buffer, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide";
    res.status(400).json({ error: `Webhook: ${message}` });
    return;
  }

  // On ne traite que les events pertinents pour notre flow de paiement.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = Number(session.metadata?.bookingId);
    if (!Number.isInteger(bookingId) || bookingId < 1) {
      res.status(400).json({ error: "Metadata bookingId manquant ou invalide" });
      return;
    }
    const booking = await bookingsRepository.findById(bookingId);
    if (!booking) {
      // Booking introuvable : on renvoie 200 pour eviter que Stripe retry indefiniment.
      res.json({ received: true, ignored: "booking introuvable" });
      return;
    }
    // Idempotent : si deja confirme, on ne refait pas le travail.
    if (booking.status !== "confirmed") {
      const amount = (session.amount_total ?? 0) / 100;
      await paymentsRepository.createPaid(bookingId, amount);
      await bookingsRepository.updateStatus(bookingId, "confirmed");
    }
  }

  // Toujours repondre 200 sinon Stripe va re-essayer pendant 3 jours.
  res.json({ received: true });
};
