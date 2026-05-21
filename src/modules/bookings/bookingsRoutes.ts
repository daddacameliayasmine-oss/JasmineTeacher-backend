import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as bookingsActions from "./bookingsActions.js";

const bookingsRouter = Router();

// Toutes les routes de reservation necessitent une connexion.
bookingsRouter.use(requireAuth);

bookingsRouter.get("/me", bookingsActions.browseMine);
bookingsRouter.get("/all", requireAdmin, bookingsActions.browseAll);
bookingsRouter.post("/", bookingsActions.add);
bookingsRouter.put("/:id", requireAdmin, bookingsActions.editStatus);
bookingsRouter.delete("/:id", bookingsActions.cancel);

export default bookingsRouter;
