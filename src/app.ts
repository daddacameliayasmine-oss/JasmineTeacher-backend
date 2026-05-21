import cors from "cors";
import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { webhook as stripeWebhook } from "./modules/payments/paymentsActions.js";
import router from "./router.js";

// Configuration de l'application Express : middlewares globaux + montage du routeur.
const app = express();

// CORS : autorise le front (URL fournie par .env) à appeler l'API.
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

// IMPORTANT : la route webhook Stripe doit recevoir le body brut (Buffer)
// pour pouvoir verifier la signature. On la monte AVANT express.json()
// avec express.raw cible UNIQUEMENT sur cette URL.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Parser JSON pour lire les bodies des requêtes POST/PUT (toutes les autres routes).
app.use(express.json());

// Toutes les routes de l'API sont préfixées par /api.
app.use("/api", router);

// Middleware d'erreur en dernier : attrape toute exception non geree des routes.
app.use(errorHandler);

export default app;
