import Stripe from "stripe";

// API version epinglee : recommandation officielle Stripe pour eviter
// les surprises lors d'un upgrade du SDK. Aligne sur la version par defaut
// du SDK stripe@22 installe (cf. types TS du package).
const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

// Client Stripe initialise en lazy (une seule instance reutilisee).
// Si STRIPE_SECRET_KEY n'est pas defini, le module reste en mode "mock" :
// l'appelant doit alors utiliser le flux mock POST /api/payments.
let cachedClient: Stripe | null = null;

export const getStripeClient = (): Stripe | null => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cachedClient) {
    cachedClient = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  }
  return cachedClient;
};

// Indique si Stripe est configure (utilise par les actions pour brancher
// soit le vrai paiement, soit le fallback mock historique).
export const isStripeEnabled = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

// Verifie la signature d'un webhook Stripe : renvoie l'event valide ou throw.
// Le rawBody DOIT etre le Buffer brut (express.raw), pas un objet JSON parse.
// Documentation officielle : stripe.webhooks.constructEvent(rawBody, signature, secret).
export const verifyWebhookEvent = (rawBody: Buffer, signature: string): Stripe.Event => {
  const client = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!client || !secret) {
    throw new Error(
      "Stripe webhook non configure (STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant)",
    );
  }
  return client.webhooks.constructEvent(rawBody, signature, secret);
};
