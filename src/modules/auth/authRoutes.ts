import { Router } from "express";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import * as authActions from "./authActions.js";
import * as authRepository from "./authRepository.js";

const authRouter = Router();

// Routes publiques d'inscription et de connexion.
authRouter.post("/register", authActions.register);
authRouter.post("/login", authActions.login);

// Route protegee : renvoie le profil de l'utilisateur connecte.
// Permet au front de verifier la validite du token au chargement.
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await authRepository.findById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.json({
    id: user.id,
    lastname: user.lastname,
    firstname: user.firstname,
    email: user.email,
    role: user.role,
  });
});

export default authRouter;
