import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/authMiddleware.js";
import * as statsActions from "./statsActions.js";

const statsRouter = Router();

// Stats reservees a Jasmine.
statsRouter.get("/", requireAuth, requireAdmin, statsActions.browse);

export default statsRouter;
