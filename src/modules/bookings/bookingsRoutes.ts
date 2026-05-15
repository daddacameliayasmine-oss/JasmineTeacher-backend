import { Router } from "express";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import * as bookingsActions from "./bookingsActions.js";

const bookingsRouter = Router();

// Toutes les routes de reservation necessitent une connexion.
bookingsRouter.use(requireAuth);

bookingsRouter.get("/me", bookingsActions.browseMine);
bookingsRouter.post("/", bookingsActions.add);
bookingsRouter.delete("/:id", bookingsActions.cancel);

export default bookingsRouter;
