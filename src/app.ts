import cors from "cors";
import express from "express";
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

// Parser JSON pour lire les bodies des requêtes POST/PUT.
app.use(express.json());

// Toutes les routes de l'API sont préfixées par /api.
app.use("/api", router);

export default app;
