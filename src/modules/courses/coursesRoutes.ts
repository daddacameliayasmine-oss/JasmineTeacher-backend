import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as coursesActions from "./coursesActions.js";

const coursesRouter = Router();

// Lecture publique : tous les visiteurs peuvent voir les cours proposes.
coursesRouter.get("/", coursesActions.browse);
coursesRouter.get("/:id", coursesActions.read);

// Ecriture reservee aux admins (Jasmine).
coursesRouter.post("/", requireAuth, requireAdmin, coursesActions.add);
coursesRouter.put("/:id", requireAuth, requireAdmin, coursesActions.edit);
coursesRouter.delete("/:id", requireAuth, requireAdmin, coursesActions.destroy);

export default coursesRouter;
