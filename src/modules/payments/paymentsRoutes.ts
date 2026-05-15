import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as paymentsActions from "./paymentsActions.js";

const paymentsRouter = Router();

// Tout paiement necessite une connexion.
paymentsRouter.post("/", requireAuth, paymentsActions.pay);

// Listing global pour l'admin (suivi des revenus).
paymentsRouter.get("/", requireAuth, requireAdmin, paymentsActions.browseAll);

export default paymentsRouter;
