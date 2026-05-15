import "dotenv/config";
import app from "./app.js";

// Point d'entrée du serveur. Charge .env puis lance Express.
const port = Number(process.env.APP_PORT ?? 3310);

app.listen(port, () => {
  console.info(`Serveur Jasmine Teacher démarré sur http://localhost:${port}`);
});
