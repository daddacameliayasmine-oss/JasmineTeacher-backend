import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as usersActions from "./usersActions.js";

const usersRouter = Router();

// Listing reserve a l'admin (Jasmine voit la liste des eleves inscrits).
usersRouter.get("/", requireAuth, requireAdmin, usersActions.browse);

// Modification et suppression : admin uniquement.
usersRouter.put("/:id", requireAuth, requireAdmin, usersActions.editRole);
usersRouter.delete("/:id", requireAuth, requireAdmin, usersActions.destroy);

export default usersRouter;
