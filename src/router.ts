import { Router } from "express";

// Routeur principal de l'API. Chaque module enregistre son sous-routeur ici.
const router = Router();

// Endpoint de santé pour vérifier rapidement que le serveur tourne.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Les sous-routeurs des modules (auth, courses, bookings...) seront montés ici
// au fur et à mesure de leur création.

export default router;
