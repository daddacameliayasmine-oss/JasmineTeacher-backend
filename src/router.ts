import { Router } from "express";
import authRouter from "./modules/auth/authRoutes.js";
import bookingsRouter from "./modules/bookings/bookingsRoutes.js";
import coursesRouter from "./modules/courses/coursesRoutes.js";
import itemsRouter from "./modules/items/itemsRoutes.js";

// Routeur principal de l'API. Chaque module enregistre son sous-routeur ici.
const router = Router();

// Endpoint de santé pour vérifier rapidement que le serveur tourne.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRouter);
router.use("/courses", coursesRouter);
router.use("/bookings", bookingsRouter);

// Module d'exemple (à supprimer une fois les vrais modules en place).
router.use("/items", itemsRouter);

export default router;
