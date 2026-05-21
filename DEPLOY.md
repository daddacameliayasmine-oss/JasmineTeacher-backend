# Mise en place de Stripe et déploiement — Jasmine Teacher

Ce document explique pas-à-pas comment **Stripe Checkout** a été intégré au projet, puis comment l'application a été **déployée en ligne** sans coût.

---

## 1. Mise en place de Stripe

### 1.1. Pourquoi Stripe Checkout (et pas Elements)

J'ai choisi **Stripe Checkout** (page de paiement hébergée par Stripe) plutôt que **Stripe Elements** (formulaire intégré directement au site) pour 3 raisons :

1. **Sécurité** : la page de paiement est hébergée par Stripe → aucune donnée bancaire ne transite par notre serveur, ce qui simplifie la conformité PCI DSS.
2. **Maintenance** : Stripe met à jour la page (3DS, Apple Pay, méthodes locales) sans qu'on touche notre code.
3. **Rapidité d'intégration** : une seule API à appeler côté serveur (`stripe.checkout.sessions.create`), une redirection côté client. Compatible avec le délai de 8 semaines du projet.

### 1.2. Création d'un compte Stripe en mode test

1. Création d'un compte sur https://dashboard.stripe.com
2. Récupération de la clé secrète de test (`sk_test_...`) dans **Developers → API keys**.
3. Vérification que le compte est bien en **mode test** (toggle en haut à droite du dashboard).

### 1.3. Installation et initialisation du client Stripe côté backend

Dans le backend Node.js / Express :

```bash
npm install stripe
```

Création d'un singleton dans `src/utils/stripe.ts` qui :
- Lit `STRIPE_SECRET_KEY` depuis les variables d'environnement (jamais dans le code).
- **Épingle explicitement l'apiVersion** de Stripe (`2026-04-22.dahlia`) pour garantir un comportement stable même si on met à jour le SDK plus tard.
- Renvoie `null` si la clé n'est pas configurée → ça permet à l'application de fonctionner localement en mode "mock" pour la phase de développement.

```typescript
const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

export const getStripeClient = (): Stripe | null => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
};
```

### 1.4. Création d'une session Checkout

Quand un élève clique sur "Payer" depuis l'espace élève, le front appelle l'endpoint backend `POST /api/payments/checkout-session`. Côté backend, l'action :

1. **Vérifie la session JWT** (middleware `requireAuth`).
2. **Lit le prix depuis la base** (jamais depuis le body de la requête → empêche un client malveillant d'envoyer un faux prix).
3. **Crée la session Stripe** avec :
   - `mode: "payment"` (paiement unique, pas d'abonnement).
   - `line_items` calculé à partir du cours (montant en centimes, devise EUR).
   - `success_url` et `cancel_url` pointant vers `/mon-espace` côté frontend.
   - **`metadata`** : `bookingId` et `userId` — c'est crucial, ces metadata sont retransmises dans le webhook pour identifier la réservation à confirmer sans faire confiance au client.
   - **`idempotencyKey`** : `checkout-booking-{id}` — évite la création de deux sessions Stripe si l'élève double-clique.

```typescript
const session = await stripe.checkout.sessions.create(
  {
    mode: "payment",
    line_items: [{ price_data: { currency: "eur", unit_amount: price * 100, product_data: { name: course.title } }, quantity: 1 }],
    success_url: process.env.STRIPE_SUCCESS_URL,
    cancel_url: process.env.STRIPE_CANCEL_URL,
    metadata: { bookingId: String(bookingId), userId: String(userId) },
  },
  { idempotencyKey: `checkout-booking-${bookingId}` },
);
```

L'endpoint retourne `{ url: session.url }`. Le frontend fait `window.location.assign(url)` qui redirige l'utilisateur vers la page Stripe.

### 1.5. Webhook Stripe — le point critique de la sécurité

**Pourquoi un webhook ?** Le `success_url` n'est PAS fiable pour confirmer un paiement : un attaquant pourrait simplement charger l'URL de succès sans avoir payé. La seule façon sûre de savoir qu'un paiement a réussi, c'est de recevoir un événement signé directement de Stripe — c'est le webhook.

#### Mise en place du webhook

1. Création de l'endpoint `POST /api/payments/webhook` côté backend.
2. **Configuration cruciale d'Express** : la route webhook doit recevoir le body brut (Buffer) pour pouvoir vérifier la signature cryptographique. J'ai donc monté `express.raw({ type: 'application/json' })` **uniquement** sur cette route, **avant** le middleware global `express.json()` qui parse normalement tous les bodies.

```typescript
// app.ts
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json()); // Le json parser global vient APRÈS
```

3. Dans le handler webhook :
   - Lecture du header `stripe-signature`.
   - Appel de `stripe.webhooks.constructEvent(rawBody, signature, secret)` qui vérifie la signature et lève une exception si elle est invalide.
   - Si l'événement est `checkout.session.completed` : extraction du `bookingId` depuis les metadata, mise à jour du statut de la réservation en `confirmed` et création de l'entrée `payments`.
   - **Toujours répondre 2xx** sinon Stripe retente l'envoi pendant 3 jours.

```typescript
const event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
if (event.type === "checkout.session.completed") {
  const session = event.data.object;
  const bookingId = Number(session.metadata.bookingId);
  await bookings.updateStatus(bookingId, "confirmed");
  await payments.create(bookingId, session.amount_total / 100);
}
res.json({ received: true });
```

### 1.6. Outillage de test : Stripe CLI

Pour tester le webhook en local **avant** tout déploiement, j'ai utilisé l'outil officiel **Stripe CLI** (installé via `brew install stripe`).

Workflow :

```bash
# 1. Authentification au compte Stripe de test
stripe login

# 2. Forwarder les webhooks Stripe vers le backend local
stripe listen --forward-to localhost:3310/api/payments/webhook
```

→ Cette commande renvoie un **webhook signing secret** de la forme `whsec_xxx` à poser dans le `.env` sous `STRIPE_WEBHOOK_SECRET`.

```bash
# 3. Simuler un événement de paiement réussi
stripe trigger checkout.session.completed --add checkout_session:metadata.bookingId=2
```

→ Le backend reçoit l'événement signé, vérifie la signature, met à jour la réservation et insère le paiement. Vérification directe en base après le test :
```sql
SELECT status FROM bookings WHERE id = 2;   -- → confirmed
SELECT * FROM payments ORDER BY id DESC LIMIT 1;   -- → row à 30.00€, status=paid
```

### 1.7. Tests automatisés du webhook

3 tests Vitest + supertest dans `tests/modules/stripe-webhook.test.ts` qui valident :
- Requête sans header `stripe-signature` → 400.
- Signature invalide → 400.
- La route n'est PAS protégée par `requireAuth` (Stripe ne passe pas de JWT).

### 1.8. Récap du flow Stripe complet

```text
Élève clique "Payer"
        │
        ▼
Frontend appelle POST /api/payments/checkout-session
        │
        ▼
Backend crée une session Stripe (avec metadata + idempotency)
        │
        ▼
Backend renvoie l'URL Checkout
        │
        ▼
Frontend redirige vers https://checkout.stripe.com/...
        │
        ▼
Stripe affiche la page de paiement
        │
        ▼
Élève paie (carte test 4242 4242 4242 4242 en mode test)
        │
        ▼
Stripe envoie l'événement checkout.session.completed à notre webhook
        │
        ▼
Backend vérifie la signature, met à jour bookings et payments
        │
        ▼
Stripe redirige le navigateur vers /mon-espace?paid=1
        │
        ▼
Frontend affiche "Confirmé" + le lien visio du cours
```

---

## 2. Déploiement en ligne (gratuit, 3 services)

Aucune plateforme gratuite ne propose à la fois Node.js persistant et MySQL hébergé sur le même service. J'ai donc combiné 3 services complémentaires, tous avec un free tier permanent :

| Brique | Plateforme | URL |
|---|---|---|
| Base de données MySQL | **TiDB Cloud Serverless** | `gateway01.eu-central-1.prod.aws.tidbcloud.com` (Frankfurt) |
| Backend Node.js + Express | **Render** Web Service | https://jasmine-teacher-api.onrender.com |
| Frontend React + Vite | **Vercel** | https://jasmine-teacher.vercel.app |

### 2.1. Base de données — TiDB Cloud Serverless

**Pourquoi TiDB Cloud ?** C'est une base **100 % compatible MySQL** (mêmes drivers, même SQL, on n'a touché à aucune ligne de code), avec un free tier sérieux (5 GB, illimité dans le temps).

Étapes :

1. Création d'un compte sur https://tidbcloud.com.
2. Création d'une **API key** dans les paramètres du compte.
3. Création du cluster via leur API REST (auth Digest avec public/private key) :

```bash
curl --digest -u "PUBLIC:PRIVATE" -X POST \
  https://serverless.tidbapi.com/v1beta1/clusters \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "jasmine-teacher",
    "region": { "name": "regions/aws-eu-central-1" },
    "spendingLimit": { "monthly": 0 }
  }'
```

4. **Le cluster passe en `ACTIVE` en ~10 secondes**. Récupération du `host`, du `userPrefix` (qui sera le préfixe du username MySQL final, ex. `26DjqJQ2sEydFz1.root`) et du port (`4000`).

5. Définition du mot de passe root via `PUT /v1beta1/clusters/{id}/password`.

6. **Adaptation du code** pour activer SSL conditionnellement (TiDB Cloud exige TLS). Une seule ligne ajoutée dans `src/database/client.ts` :

```typescript
ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
```

7. Import du schéma + du seed depuis la machine locale :

```bash
mysql -h gateway01.eu-central-1.prod.aws.tidbcloud.com -P 4000 \
      -u "26DjqJQ2sEydFz1.root" -p"..." \
      --ssl-mode=VERIFY_IDENTITY --ssl-ca=/etc/ssl/cert.pem \
      < database.sql

DB_HOST=... DB_PORT=4000 DB_USER=... DB_PASSWORD=... DB_SSL=true npm run seed
```

→ Les 6 tables sont créées sur TiDB et le seed est passé sans erreur (4 users, 5 cours, 3 vidéos, 3 bookings, 1 paiement).

### 2.2. Backend — Render Web Service

**Pourquoi Render ?** C'est l'une des rares plateformes qui hébergent un **serveur Node.js persistant** gratuitement (à la différence de Vercel qui ne fait que du serverless). Auto-déploiement depuis GitHub, région Frankfurt disponible (latence faible avec TiDB Frankfurt).

Étapes :

1. Création d'un compte sur https://render.com et d'une API key.
2. Création du service via l'API Render :

```bash
curl -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer rnd_..." \
  -d '{
    "type": "web_service",
    "name": "jasmine-teacher-api",
    "repo": "https://github.com/daddacameliayasmine-oss/JasmineTeacher-backend",
    "branch": "main",
    "autoDeploy": "yes",
    "serviceDetails": {
      "env": "node",
      "region": "frankfurt",
      "plan": "free",
      "envSpecificDetails": {
        "buildCommand": "npm install && npm run build",
        "startCommand": "npm start"
      }
    },
    "envVars": [ ... ]
  }'
```

3. **Variables d'environnement** configurées via l'API (jamais dans le code) :
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true` → pointe vers TiDB Cloud.
   - `JWT_SECRET` → généré aléatoirement par Render (`generateValue: true`), bien plus solide qu'un secret manuel.
   - `JWT_EXPIRES_IN=2h`.
   - `CLIENT_URL=https://jasmine-teacher.vercel.app` → pour le middleware CORS.
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`.

4. Render fait automatiquement :
   - `npm install`
   - `npm run build` (TypeScript → `dist/`)
   - `npm start` (lance `node dist/main.js`)
   - Healthcheck sur le port que Render fournit (notre serveur lit `APP_PORT` de l'env).

5. **Auto-deploy activé** : tout push sur `main` redéploie automatiquement.

**Limite connue** : le free tier de Render endort le service après 15 minutes sans requête. Le premier hit après une période d'inactivité prend ~30 secondes pour réveiller le serveur. Pour la démo, on peut prévoir une requête de réchauffement avant ou configurer un cron-job.org gratuit qui ping `/api/health` toutes les 14 minutes.

### 2.3. Frontend — Vercel

**Pourquoi Vercel ?** Le frontend est statique (build Vite = HTML/CSS/JS). Vercel le distribue sur leur CDN edge mondial, donc chargement quasi-instantané partout. Et la CLI Vercel permet de déployer en une commande.

Étapes :

1. Installation : `npm install -g vercel`.
2. Connexion : `vercel login`.
3. Adaptation du code pour qu'il pointe vers le backend distant en production. Dans `src/services/apiClient.ts` :

```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
```

→ En dev (variable absente), `/api` est proxifié par Vite vers `localhost:3310`.
→ En prod, on positionne `VITE_API_URL` sur l'URL Render.

4. Configuration de la variable d'env :

```bash
echo "https://jasmine-teacher-api.onrender.com/api" | \
  vercel env add VITE_API_URL production
```

5. Déploiement :

```bash
vercel --prod --yes
```

→ Vercel build le projet avec Vite (`npm run build`), upload le dossier `dist/` sur leur CDN, et nous donne deux URLs :
- L'URL canonique : `https://jasmine-teacher.vercel.app`
- L'URL versionnée du déploiement (sert d'historique).

### 2.4. Connexion entre les 3 services

```text
              ┌──────────────────────────────┐
              │   https://jasmine-teacher    │
              │       .vercel.app            │
              │  (Frontend React + Vite)     │
              └──────────────┬───────────────┘
                             │ HTTPS + JWT
                             ▼
              ┌──────────────────────────────┐
              │  https://jasmine-teacher-api │
              │     .onrender.com            │
              │  (Backend Express + Node)    │
              └──────────────┬───────────────┘
                             │ TLS + SSL CA
                             ▼
              ┌──────────────────────────────┐
              │   gateway01.eu-central-1     │
              │  .prod.aws.tidbcloud.com     │
              │     (TiDB Cloud MySQL)       │
              └──────────────────────────────┘

                  Stripe ────► Backend /api/payments/webhook
```

### 2.5. CORS et sécurité

- Le backend autorise uniquement l'origine `https://jasmine-teacher.vercel.app` via la variable d'env `CLIENT_URL`.
- Le frontend ne contient **aucun secret** (toutes les clés sensibles vivent côté Render).
- Les variables d'env sensibles ne sont jamais dans le repo : ni `JWT_SECRET`, ni `DB_PASSWORD`, ni `STRIPE_SECRET_KEY`, ni `STRIPE_WEBHOOK_SECRET`.

---

## 3. Validation finale

### 3.1. Healthchecks

```bash
curl https://jasmine-teacher-api.onrender.com/api/health
# → {"status":"ok"}

curl -o /dev/null -w "%{http_code}\n" https://jasmine-teacher.vercel.app/
# → 200
```

### 3.2. Tests automatisés (passent à chaque PR via GitHub Actions)

- Backend : **35 tests Vitest** (utils, CRUD, webhook Stripe).
- Frontend : **16 tests Vitest** (apiClient, composants UI, ProtectedRoute).
- E2E : **23 tests Playwright** couvrant les 15 user stories.

### 3.3. Comptes de démo en ligne

Le seed crée 4 comptes prêts à l'emploi, mot de passe commun `motdepasse123` :
- `jasmine@danse.com` — admin
- `bob@example.com` — élève avec réservations
- `charlie@example.com` — élève avec annulation
- `diana@example.com` — élève vierge

---

## 4. Limites connues et améliorations possibles

| Limite actuelle | Améliorations possibles |
|---|---|
| Cold start Render (~30s après 15 min idle) | Cron-job.org qui ping `/api/health` toutes les 14 min |
| Stripe en mode test uniquement | Passer en mode live (clé `sk_live_...`) une fois en prod |
| Pas de domaine personnalisé | Acheter `jasmine-teacher.fr` (5–10 €/an) et brancher sur Vercel + Render |
| Pas de backup automatique de TiDB | Activer les snapshots payants ou cron de `mysqldump` |

---

## 5. En résumé pour le jury

**Stripe** a été intégré en suivant à la lettre la documentation officielle : page Checkout hébergée par Stripe, webhook signé cryptographiquement, idempotency sur la création de session, vérification côté serveur uniquement, tests reproductibles via Stripe CLI.

**Le déploiement** combine trois services gratuits et complémentaires : TiDB Cloud pour la base MySQL, Render pour le backend Node persistant, Vercel pour le frontend statique sur CDN edge. Chaque service est connecté aux autres via des variables d'environnement, jamais via du code en dur, et tout secret est géré par la plateforme correspondante. **Coût total : 0 €**.
