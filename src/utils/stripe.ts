import Stripe from "stripe";

// Client Stripe initialise en lazy (une seule instance reutilisee).
// Si STRIPE_SECRET_KEY n'est pas defini, le module reste en mode "mock" :
// l'appelant doit alors utiliser le flux mock POST /api/payments.
let cachedClient: Stripe | null = null;

export const getStripeClient = (): Stripe | null => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cachedClient) {
    cachedClient = new Stripe(key);
  }
  return cachedClient;
};

// Indique si Stripe est configure (utilise par les actions pour brancher
// soit le vrai paiement, soit le fallback mock historique).
export const isStripeEnabled = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);
