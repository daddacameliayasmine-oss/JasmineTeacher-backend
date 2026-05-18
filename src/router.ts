import { Router } from "express";
import authRouter from "./modules/auth/authRoutes.js";
import bookingsRouter from "./modules/bookings/bookingsRoutes.js";
import contactRouter from "./modules/contact/contactRoutes.js";
import coursesRouter from "./modules/courses/coursesRoutes.js";
import paymentsRouter from "./modules/payments/paymentsRoutes.js";
import statsRouter from "./modules/stats/statsRoutes.js";
import usersRouter from "./modules/users/usersRoutes.js";
import videosRouter from "./modules/videos/videosRoutes.js";

// Routeur principal de l'API. Chaque module enregistre son sous-routeur ici.
const router = Router();

// Endpoint de santé pour vérifier rapidement que le serveur tourne.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRouter);
router.use("/courses", coursesRouter);
router.use("/bookings", bookingsRouter);
router.use("/videos", videosRouter);
router.use("/users", usersRouter);
router.use("/payments", paymentsRouter);
router.use("/contact", contactRouter);
router.use("/stats", statsRouter);

export default router;
