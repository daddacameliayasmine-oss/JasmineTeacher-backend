import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import { rateLimit } from "../../middlewares/rateLimiter.js";
import * as contactActions from "./contactActions.js";

const contactRouter = Router();

// Anti-spam : 5 messages max / IP / 10 min sur l'envoi public.
const contactLimiter = rateLimit({ windowMs: 10 * 60_000, max: 5 });

// Depot public d'un message.
contactRouter.post("/", contactLimiter, contactActions.add);

// Listing reserve a l'admin.
contactRouter.get("/", requireAuth, requireAdmin, contactActions.browse);

export default contactRouter;
