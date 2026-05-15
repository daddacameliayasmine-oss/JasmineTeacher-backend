import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as usersActions from "./usersActions.js";

const usersRouter = Router();

// Listing reserve a l'admin (Jasmine voit la liste des eleves inscrits).
usersRouter.get("/", requireAuth, requireAdmin, usersActions.browse);

export default usersRouter;
