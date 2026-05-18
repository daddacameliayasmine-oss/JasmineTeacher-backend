import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as paymentsActions from "./paymentsActions.js";

const paymentsRouter = Router();

// Tout paiement necessite une connexion.
// POST / : flux mock (confirme immediatement, pour dev sans Stripe).
paymentsRouter.post("/", requireAuth, paymentsActions.pay);

// POST /checkout-session : flux Stripe Checkout reel (mode test).
paymentsRouter.post("/checkout-session", requireAuth, paymentsActions.createCheckoutSession);

// Listing global pour l'admin (suivi des revenus).
paymentsRouter.get("/", requireAuth, requireAdmin, paymentsActions.browseAll);

export default paymentsRouter;
