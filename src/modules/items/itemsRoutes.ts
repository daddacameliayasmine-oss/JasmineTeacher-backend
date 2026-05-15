import { Router } from "express";
import * as itemsActions from "./itemsActions.js";

// Routes du module items. Sert d'exemple pour les autres modules.
const itemsRouter = Router();

itemsRouter.get("/", itemsActions.browse);
itemsRouter.get("/:id", itemsActions.read);
itemsRouter.post("/", itemsActions.add);

export default itemsRouter;
