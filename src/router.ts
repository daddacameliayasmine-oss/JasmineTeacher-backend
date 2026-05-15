import { Router } from "express";
import authRouter from "./modules/auth/authRoutes.js";
import itemsRouter from "./modules/items/itemsRoutes.js";

// Routeur principal de l'API. Chaque module enregistre son sous-routeur ici.
const router = Router();

// Endpoint de santé pour vérifier rapidement que le serveur tourne.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRouter);

// Module d'exemple (à supprimer une fois les vrais modules en place).
router.use("/items", itemsRouter);

export default router;
