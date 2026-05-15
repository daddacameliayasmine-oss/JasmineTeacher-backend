import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as videosActions from "./videosActions.js";

const videosRouter = Router();

// Vitrine publique : liste des videos is_public = TRUE.
videosRouter.get("/", videosActions.browsePublic);

// Toutes les videos (incluant celles reservees aux eleves).
videosRouter.get("/all", requireAuth, videosActions.browseAll);

// Gestion admin.
videosRouter.post("/", requireAuth, requireAdmin, videosActions.add);
videosRouter.delete("/:id", requireAuth, requireAdmin, videosActions.destroy);

export default videosRouter;
