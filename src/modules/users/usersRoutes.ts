import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as usersActions from "./usersActions.js";

const usersRouter = Router();

// Listing reserve a l'admin (Jasmine voit la liste des eleves inscrits).
usersRouter.get("/", requireAuth, requireAdmin, usersActions.browse);

// Self profile : l'utilisateur connecte modifie SON prenom et SON nom.
// IMPORTANT : doit etre declare AVANT "/:id" sinon Express matcherait "me" comme un id.
usersRouter.put("/me", requireAuth, usersActions.editMe);

// Modification et suppression : admin uniquement.
usersRouter.put("/:id", requireAuth, requireAdmin, usersActions.editUser);
usersRouter.delete("/:id", requireAuth, requireAdmin, usersActions.destroy);

export default usersRouter;
