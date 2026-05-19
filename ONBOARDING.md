# Onboarding — Jasmine Teacher

Bienvenue. Ce document est là pour t'aider à comprendre **le projet de A à Z** si tu débarques dessus sans rien savoir. Pas besoin de lire le code avant : on commence par "c'est quoi ?" et on descend progressivement vers les détails techniques.

> Lis ce document dans l'ordre. Chaque section s'appuie sur les précédentes.

---

## 1. C'est quoi le projet ?

### Le client
**Jasmine** est une professeure de danse orientale avec plus de 10 ans d'expérience. Elle veut un site web pour :
- Présenter ses cours (collectifs / individuels, adultes / enfants à partir de 6 ans).
- Recevoir des inscriptions en ligne.
- Gérer son planning, les paiements et les liens de visio (les cours sont à distance).
- Tout faire elle-même via une interface admin simple.

### Le cadre
C'est un **projet pédagogique** de **Wild Code School** (Projet 3 / projet final), réalisé par un groupe de 4-5 "wilders" (apprenants) en **8 semaines** selon la méthodologie **SCRUM** (sprints d'1 semaine). Date de fin : **18/07**.

L'objectif n'est pas seulement de faire un site qui marche, mais aussi d'**apprendre les bonnes pratiques** : Git workflow, Conventional Commits, PRs, lint, tests, CI/CD.

### Les 3 types d'utilisateurs

| Rôle | Ce qu'il peut faire |
|---|---|
| **Visiteur** (non connecté) | Voir les cours, voir les tarifs, regarder des vidéos de démo, créer un compte |
| **Élève** (connecté, role=student) | Réserver un cours, payer, accéder à ses liens visio, voir son historique, annuler |
| **Admin** (Jasmine, role=admin) | Tout faire en plus : créer/modifier/supprimer des cours, voir les élèves, voir les paiements, ajouter des vidéos |

---

## 2. Vue d'ensemble technique

Le projet est split en **deux repos GitHub** :

```
JasmineTeacher-backend   →  API REST (Node.js + Express + MySQL)
JasmineTeacher-frontend  →  Site React (Vite + React Router)
```

Plus une **base MySQL** locale (à terme : sur le VPS).

### Le flux d'une requête

```
   Navigateur                 Frontend (Vite)          Backend (Express)         MySQL
   ──────────                 ───────────────          ─────────────────         ─────
   User clique                                         
   "Réserver"  ─────────►    Composant React 
                              appelle fetch
                              /api/bookings   ──────►  POST /api/bookings  ────►  INSERT INTO
                                                       requireAuth                bookings (...)
                                                       valide JWT
                                                       valide capacity
                                                       valide J-7
                                                                                  ◄──── id: 42
                                                       ◄────  201 Created
                              ◄────  { id: 42 }
   Affiche feedback
   "Réservation créée"
```

**Vite** (dev server) proxifie `/api/*` vers `http://localhost:3310` pour éviter les soucis CORS en local. Le backend a quand même un middleware CORS pour la prod.

---

## 3. Stack et choix techniques (et pourquoi)

| Brique | Choix | Pourquoi ce choix |
|---|---|---|
| Langage back | **TypeScript** | Typage = moins de bugs, autocomplete, refactoring sûr |
| Framework back | **Express** | Minimaliste, ultra-répandu, parfait pour un projet pédagogique |
| Base de données | **MySQL** + **mysql2** | Imposé par l'école. Driver `mysql2` car promesse-friendly + meilleures perfs que `mysql` |
| ORM | **Aucun (SQL brut)** | Volonté pédagogique : apprendre vraiment SQL, voir les vraies requêtes, comprendre les jointures |
| Auth | **JWT + bcrypt** | Standard. JWT = sans état côté serveur (scalable). bcrypt = hash résistant aux GPU |
| Framework front | **React 18 + TypeScript** | Le plus enseigné en école, énorme écosystème |
| Bundler front | **Vite** | Hot reload instantané, build rapide |
| Routing front | **React Router v6** | Le standard React, syntaxe `<Route>` claire |
| Styles | **CSS inline + variables CSS** | Pas de framework lourd, on apprend les fondamentaux. Variables CSS dans `theme.css` pour cohérence |
| Paiement | **Stripe Checkout** (mode test) + fallback mock | Stripe = standard pro. Mock pour dev/CI sans clé |
| Lint + format | **Biome** | Remplace ESLint + Prettier en un seul outil (10x plus rapide) |
| Hooks Git | **Husky** | Bloque les commits qui ne respectent pas les règles |
| Tests unitaires | **Vitest** (back + front) | Compatible ESM + TypeScript, syntaxe Jest-like |
| Tests E2E | **Playwright** | Le plus solide aujourd'hui (vs Cypress) |
| CI | **GitHub Actions** | Gratuit, intégré à GitHub |

---

## 4. Le backend en détail

### Structure des dossiers

```
JasmineTeacher-backend/
├── .github/workflows/
│   └── ci.yml                  ← Pipeline CI : lint + tests + build
├── .husky/
│   ├── pre-commit              ← Bloque si lint KO ou > 150 lignes
│   └── commit-msg              ← Bloque si message ≠ Conventional Commits
├── src/
│   ├── database/
│   │   └── client.ts           ← Pool de connexions MySQL (singleton)
│   ├── middlewares/
│   │   ├── authMiddleware.ts   ← requireAuth + requireAdmin
│   │   ├── rateLimiter.ts      ← Anti brute-force
│   │   └── errorHandler.ts     ← Catch global des erreurs non gérées
│   ├── modules/                ← Un dossier = une ressource métier
│   │   ├── auth/               ← register, login, /me
│   │   ├── users/              ← Listing admin
│   │   ├── courses/            ← CRUD cours
│   │   ├── bookings/           ← Réservations
│   │   ├── payments/           ← Paiement mock + Stripe
│   │   ├── videos/             ← Démos publiques + contenus élèves
│   │   ├── contact/            ← Formulaire de contact
│   │   └── stats/              ← KPIs admin
│   ├── utils/
│   │   ├── jwt.ts              ← sign/verify token
│   │   ├── hash.ts             ← bcrypt
│   │   ├── validation.ts       ← isEmail, isStringOfLength
│   │   └── stripe.ts           ← Client Stripe lazy
│   ├── app.ts                  ← Configuration Express (middlewares globaux)
│   ├── main.ts                 ← Point d'entrée (listen)
│   └── router.ts               ← Monte tous les sous-routeurs sur /api
├── tests/
│   └── utils/                  ← Tests Vitest des utils
├── .env                        ← Secrets locaux (NEVER COMMIT)
├── .env.sample                 ← Template à copier en .env
├── biome.json                  ← Config lint+format
├── database.sql                ← Schéma initial (CREATE TABLE ...)
└── package.json
```

### Le pattern Action / Repository / Routes / Middleware

C'est **le** concept à comprendre côté back. Chaque module suit la même structure :

```
modules/courses/
├── coursesRoutes.ts        ← Déclare les endpoints HTTP
├── coursesActions.ts       ← Logique métier (controllers)
└── coursesRepository.ts    ← Accès à la base (SQL brut)
```

**Pourquoi cette séparation ?**

- **Routes** : "quel URL fait quoi ?" — `POST /courses` appelle `coursesActions.add`. C'est tout.
- **Actions** : "que faut-il faire métier-côté ?" — valider les inputs, appeler le repo, gérer les erreurs, retourner la réponse HTTP.
- **Repository** : "comment lire/écrire en BDD ?" — uniquement du SQL. Aucune logique métier ici, aucun `req.body`.

**Avantages** :
- On peut changer la BDD (passer de MySQL à Postgres) en ne touchant que les `*Repository.ts`.
- On peut tester les actions en mockant le repository sans toucher MySQL.
- Quand tu cherches "où est le SQL ?" tu sais : c'est dans `*Repository.ts`.

### Exemple concret : `POST /api/courses`

1. **Route** (`coursesRoutes.ts`) :
   ```typescript
   coursesRouter.post("/", requireAuth, requireAdmin, coursesActions.add);
   ```
   → Demande à passer par 2 middlewares avant l'action.

2. **Middleware** `requireAuth` (`middlewares/authMiddleware.ts`) :
   - Lit l'en-tête `Authorization: Bearer <token>`
   - Vérifie la signature JWT
   - Pose `req.auth = { userId, role }`
   - Sinon : `401 Token manquant/invalide`

3. **Middleware** `requireAdmin` :
   - Vérifie `req.auth.role === "admin"`
   - Sinon : `403 Accès réservé aux administrateurs`

4. **Action** `coursesActions.add` :
   - Parse `req.body` et valide chaque champ
   - Appelle `coursesRepository.create(input, req.auth.userId)`
   - Renvoie `201 Created` avec l'objet

5. **Repository** `coursesRepository.create` :
   ```typescript
   await pool.query(
     "INSERT INTO courses (title, ...) VALUES (?, ...)",
     [input.title, ...]
   );
   ```
   → Requête **paramétrée** (le `?` est remplacé par la valeur, jamais concaténé) : c'est la défense contre les **injections SQL**.

### Le routeur principal

`src/router.ts` est le centre de tout :

```typescript
router.use("/auth", authRouter);
router.use("/courses", coursesRouter);
router.use("/bookings", bookingsRouter);
// ...
```

Puis dans `app.ts` :
```typescript
app.use("/api", router);
```

→ Tous les endpoints sont préfixés par `/api`. Donc l'URL complète d'un endpoint est `http://localhost:3310/api/courses`, pas `/courses`.

### Liste complète des endpoints

```
AUTH
  POST   /api/auth/register             Inscription (public, rate-limité)
  POST   /api/auth/login                Connexion (public, rate-limité)
  GET    /api/auth/me                   Profil de l'utilisateur connecté

USERS
  GET    /api/users                     [admin] Liste les élèves

COURSES
  GET    /api/courses                   Liste publique
  GET    /api/courses/:id               Détail public
  POST   /api/courses                   [admin] Créer
  PUT    /api/courses/:id               [admin] Modifier
  DELETE /api/courses/:id               [admin] Supprimer

BOOKINGS
  GET    /api/bookings/me               Mes réservations
  GET    /api/bookings/all              [admin] Toutes les réservations
  POST   /api/bookings                  Réserver (vérifie capacity + J-7)
  DELETE /api/bookings/:id              Annuler

PAYMENTS
  POST   /api/payments                  Paiement mock (instantané)
  POST   /api/payments/checkout-session [auth] Crée une session Stripe Checkout
  GET    /api/payments                  [admin] Liste tous les paiements

VIDEOS
  GET    /api/videos                    Vidéos publiques (visiteur)
  GET    /api/videos/all                [auth] Toutes (incluant élèves-only)
  POST   /api/videos                    [admin] Ajouter
  DELETE /api/videos/:id                [admin] Supprimer

CONTACT
  POST   /api/contact                   Envoi message (public, rate-limité)
  GET    /api/contact                   [admin] Liste les messages

STATS
  GET    /api/stats                     [admin] KPIs agrégés
```

---

## 5. Le frontend en détail

### Structure des dossiers

```
JasmineTeacher-frontend/
├── e2e/                            ← Tests Playwright
├── public/assets/                  ← Images backgrounds (danseuse, etc.)
├── src/
│   ├── components/
│   │   ├── ui/                     ← Building blocks : Button, Card, VideoPlayer
│   │   ├── layout/                 ← Header, Footer (toujours visibles)
│   │   ├── admin/                  ← Onglets du dashboard admin
│   │   └── ProtectedRoute.tsx      ← Wrapper qui bloque selon l'auth
│   ├── context/
│   │   └── AuthContext.tsx         ← État global de la session utilisateur
│   ├── pages/                      ← Une page = une route React Router
│   ├── services/                   ← Appels API (un fichier par domaine)
│   ├── types/                      ← Interfaces TypeScript partagées
│   ├── styles/
│   │   ├── theme.css               ← Variables CSS (couleurs, espacements)
│   │   └── global.css              ← Reset + styles globaux
│   ├── App.tsx                     ← Layout + table de routes
│   ├── main.tsx                    ← Point d'entrée + AuthProvider
│   └── test-setup.ts               ← Setup Vitest (jest-dom)
├── playwright.config.ts
├── vitest.config.ts
└── vite.config.ts
```

### Le routing

Tout est dans `App.tsx` :

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/cours" element={<Courses />} />
  <Route path="/a-propos" element={<About />} />
  <Route path="/contact" element={<Contact />} />
  <Route path="/connexion" element={<Login />} />
  <Route path="/inscription" element={<Register />} />
  <Route path="/mon-espace" element={<ProtectedRoute><StudentSpace /></ProtectedRoute>} />
  <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
</Routes>
```

→ **Pages publiques** : visibles par tout le monde.
→ **Pages protégées** : `<ProtectedRoute>` redirige vers `/connexion` si pas connecté.
→ **Page admin** : `<ProtectedRoute role="admin">` redirige vers `/` si connecté mais pas admin.

### L'AuthContext : où vit la session

`src/context/AuthContext.tsx` est un **Context React** qui :
1. Au montage de l'app, lit le `localStorage` pour récupérer un éventuel token.
2. Si token trouvé, appelle `GET /api/auth/me` pour vérifier qu'il est valide et récupérer le profil.
3. Expose `{ user, token, setSession, logout, loading }` à toute l'app via `useAuth()`.

```tsx
// N'importe où dans un composant :
const { user, logout } = useAuth();
if (user) {
  console.log("Connecté en tant que", user.firstname);
}
```

**Pourquoi `localStorage` et pas `cookie` ?**
- Simple à manipuler côté front.
- Pas de souci CSRF (le navigateur n'envoie pas automatiquement).
- Inconvénient : vulnérable au XSS si on a une faille. Sur ce projet pédagogique c'est acceptable.

### Le client API

`src/services/apiClient.ts` centralise **tous** les `fetch` :

```typescript
export const apiFetch = async <T>(path: string, options): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) message = parsed.error;
    } catch { /* texte brut */ }
    throw new Error(message || `Erreur ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return await response.json();
};
```

**Pourquoi ce wrapper ?**
- **Un seul endroit** où on configure le base URL, les headers JSON, le bearer token.
- **Parse intelligent des erreurs** : si le back renvoie `{ error: "..." }`, on throw avec juste le message lisible. Le composant qui catche peut afficher directement.
- **Type générique `<T>`** : `apiFetch<Course[]>("/courses")` renvoie un tableau typé.

Chaque service (`coursesService.ts`, `bookingsService.ts`...) est une fine couche par-dessus `apiFetch` qui expose des fonctions typées :

```typescript
export const fetchCourses = () => apiFetch<Course[]>("/courses");
export const createBooking = (token, courseId) =>
  apiFetch<Booking>("/bookings", { method: "POST", body: { courseId }, token });
```

### Charte graphique

Variables CSS dans `src/styles/theme.css` :

```css
:root {
  --color-background: #1a0e0e;     /* noir-bordeaux */
  --color-surface: #3d1f1f;        /* bordeaux foncé pour les cartes */
  --color-accent: #6b2a2a;         /* bouton primary */
  --color-text: #f4ede0;           /* crème */
  --color-text-muted: #c9b9a3;     /* beige doré */
  --color-gold: #c9a96e;           /* highlights */
  --font-title: "Cormorant Garamond", serif;
  --font-body: "Inter", sans-serif;
}
```

L'ambiance voulue : **sombre, mystique, oriental, luxueux**. Inspiration arches marocaines, lanternes, chaleur.

---

## 6. La base de données

### Schéma

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   users     │ 1     N │  bookings   │ N     1 │   courses   │
├─────────────┤◄────────┤             ├────────►├─────────────┤
│ id          │         │ id          │         │ id          │
│ lastname    │         │ user_id (FK)│         │ title       │
│ firstname   │         │ course_id   │         │ description │
│ email       │         │ status      │         │ type        │
│ password_   │         │ created_at  │         │ price       │
│   hash      │         │             │         │ capacity    │
│ role        │         │ UNIQUE(user,│         │ start_at    │
│ created_at  │         │   course)   │         │ duration_   │
└─────────────┘         └─────┬───────┘         │   minutes   │
                              │ 1               │ visio_url   │
                              │                 │ created_by  │
                              ▼ N               └─────────────┘
                        ┌─────────────┐
                        │  payments   │         ┌─────────────┐
                        ├─────────────┤         │   videos    │
                        │ id          │         ├─────────────┤
                        │ booking_id  │         │ id          │
                        │ amount      │         │ title       │
                        │ status      │         │ url         │
                        │ paid_at     │         │ is_public   │
                        └─────────────┘         │ created_at  │
                                                └─────────────┘
                        ┌─────────────────┐
                        │contact_messages │
                        ├─────────────────┤
                        │ id              │
                        │ email           │
                        │ message         │
                        │ created_at      │
                        └─────────────────┘
```

### Pourquoi pas d'ORM ?

C'est imposé par l'école pour des raisons **pédagogiques** : apprendre à écrire vraiment du SQL, comprendre les jointures, savoir lire un EXPLAIN. Concrètement on utilise `mysql2/promise` :

```typescript
const [rows] = await pool.query(
  "SELECT b.*, c.title, c.price FROM bookings b "
  + "JOIN courses c ON b.course_id = c.id "
  + "WHERE b.user_id = ?",
  [userId],
);
```

**Règle d'or** : **JAMAIS** de concaténation directe. Toujours des `?` paramétrés. Sinon → injection SQL.

### Contraintes importantes

- **UNIQUE(user_id, course_id)** sur `bookings` : un élève ne peut pas réserver 2 fois le même cours.
- **ON DELETE CASCADE** sur toutes les FK : si on supprime un user, ses bookings, paiements et cours créés sont aussi supprimés (ça simplifie, on n'a pas à gérer les références orphelines).

### Le rôle admin

Il n'y a **pas de route publique** pour créer un admin. La seule façon : modifier directement la BDD :

```sql
UPDATE users SET role='admin' WHERE email='jasmine@example.com';
```

C'est volontaire : seule Jasmine doit être admin, et c'est le développeur qui la promeut au déploiement.

### Seed reproductible

`npm run seed` (script `scripts/seed.ts`) truncate toutes les tables et insère un jeu de données démo complet. À utiliser en dev pour repartir d'un état propre, **jamais en prod**.

**Comptes créés** :

| Email | Mot de passe | Rôle | État | À utiliser pour |
|---|---|---|---|---|
| `jasmine@danse.com` | `motdepasse123` | admin | — | Tester les US admin (11–15) |
| `bob@example.com` | `motdepasse123` | student | 1 confirmed+payée + 1 pending | Tester US payer, accéder visio, historique, annuler |
| `charlie@example.com` | `motdepasse123` | student | 1 cancelled | Tester historique avec annulation |
| `diana@example.com` | `motdepasse123` | student | vierge | Tester US réserver sans collision |

Le seed crée aussi 5 cours (différents types et dates pour tester la règle J-7), 3 vidéos (2 publiques + 1 privée), 3 bookings, 1 paiement, 1 message de contact.

---

## 7. Le flow utilisateur complet (storyboard)

### Storyboard "Eve réserve son premier cours"

1. **Eve visite** `/` → voit le hero, clique "Découvrir les cours".
2. **Eve va sur** `/cours` → voit les tarifs et les sessions à venir. Pour réserver elle doit être connectée.
3. **Eve clique** "Réserver" → comme elle n'est pas connectée, on la redirige vers `/connexion`.
4. **Eve clique** "Inscrivez-vous" → page `/inscription`.
5. **Eve remplit** Nom, Prénom, Email, Mot de passe → submit.
6. Le front appelle `POST /api/auth/register`. Le back :
   - Valide les champs.
   - Vérifie que l'email n'est pas déjà pris.
   - Hashe le mot de passe avec **bcrypt** (12 rounds).
   - Insère le user en BDD avec `role='student'`.
   - Génère un **JWT** signé avec `JWT_SECRET`.
   - Renvoie `{ token, user }`.
7. Le front pose le token dans `localStorage` via `setSession`, et redirige vers `/`. La navbar affiche "Bonjour Eve" + "Déconnexion".
8. **Eve retourne** `/cours`, clique "Réserver" sur "Stage découverte" (J+15).
9. Le front appelle `POST /api/bookings` avec `{ courseId: 3 }` + le bearer token. Le back :
   - `requireAuth` vérifie le JWT → OK, `req.auth = { userId: 5, role: "student" }`.
   - Action vérifie : `start_at` est-il à au moins **J+7** ? Oui (J+15). OK.
   - Action vérifie : la capacité n'est-elle pas pleine ? OK.
   - Action vérifie : Eve n'a-t-elle pas déjà réservé ce cours ? Non (contrainte UNIQUE).
   - Repository insère la booking avec `status='pending'`.
   - Renvoie `201`.
10. **Eve va sur** `/mon-espace` → voit sa réservation "En attente de paiement", boutons "Payer 20€" et "Annuler".
11. **Eve clique** "Payer 20€". Le front essaie d'abord `POST /api/payments/checkout-session`. Si `STRIPE_SECRET_KEY` n'est pas configurée → 503 → fallback sur `POST /api/payments` (mode mock).
12. Le back (mode mock) :
    - Vérifie que la booking appartient bien à Eve.
    - Récupère le prix depuis `courses` (jamais depuis le body — sécurité !).
    - Insère un row dans `payments` avec `status='paid'`.
    - Passe la booking en `status='confirmed'`.
    - Renvoie le paiement.
13. Le front rafraîchit la liste : la réservation passe à "Confirme" + un lien **"Rejoindre le cours"** apparaît (`visio_url` du cours).
14. Le jour J, Eve clique sur le lien → ouvre la visio externe (Google Meet, Zoom, etc.).

### Côté admin

- **Jasmine se connecte** → l'app voit `role='admin'`, affiche l'onglet "Admin" dans la nav.
- **Jasmine va sur** `/admin` → 5 onglets : Stats, Cours, Élèves, Réservations, Vidéos.
- **Onglet Stats** par défaut : nombre d'élèves, cours créés, cours à venir, réservations actives, revenus encaissés.
- **Onglet Cours** : formulaire de création à gauche, liste avec édition inline à droite.
- **Onglet Élèves** : table des comptes inscrits.
- **Onglet Réservations** : table de tous les bookings avec leur statut.
- **Onglet Vidéos** : ajout d'URL YouTube/MP4, toggle "public" pour mettre dans la vitrine visiteur.

---

## 8. La sécurité

### Authentification : JWT + bcrypt

**bcrypt** : hash unidirectionnel des mots de passe avec un **salt aléatoire** intégré et 12 rounds (≈ 250 ms par hash). Même si la BDD fuite, retrouver le mot de passe demanderait des décennies de GPU.

**JWT** : token signé par le serveur, format `header.payload.signature`. Le payload contient `{ userId, role }`. La signature utilise `JWT_SECRET` (variable d'env).
- Si quelqu'un modifie le payload, la signature ne match plus → 401.
- Expiration par défaut : **2 heures** (`JWT_EXPIRES_IN`).
- Le JWT n'est pas chiffré → ne JAMAIS y mettre d'info sensible (mot de passe, etc.).

### Authorization : 2 middlewares séparés

```typescript
requireAuth     ← vérifie que l'utilisateur est connecté (n'importe quel rôle)
requireAdmin    ← vérifie que l'utilisateur est admin (à utiliser APRÈS requireAuth)
```

Sur une route admin, on chaîne les 2 :
```typescript
coursesRouter.post("/", requireAuth, requireAdmin, coursesActions.add);
```

### Rate limiting (anti brute-force)

Sur les routes sensibles :
- `/auth/register` + `/auth/login` : **10 requêtes / IP / minute**
- `/contact` : **5 messages / IP / 10 min**

Implémenté dans `middlewares/rateLimiter.ts` (en mémoire, en prod il faudrait Redis).

### Validation aux frontières

Toute donnée venant du client (`req.body`, `req.params`, `req.query`) passe par des validateurs avant d'être utilisée. Helpers dans `utils/validation.ts` :
- `isEmail(value)` : regex basique
- `isStringOfLength(value, min, max)` : longueur

Pas de Zod sur ce projet (volonté de garder léger), mais ce serait une amélioration possible.

### Anti-leak de données sensibles

- Le hash `password_hash` n'est **jamais** renvoyé côté client (le repo `findAll` users sélectionne explicitement les colonnes).
- Le login renvoie le même message d'erreur que l'email soit inscrit ou non (`"Identifiants incorrects"`) — sinon on permet l'**énumération d'emails**.
- Pour le paiement : le prix est **toujours recalculé côté serveur** depuis la table `courses`, jamais lu depuis le body — sinon un attaquant pourrait payer 0,01€ pour un cours à 40€.

### CORS

`app.ts` autorise uniquement `CLIENT_URL` (le front Vite) à appeler l'API. En prod, à pointer vers le domaine du frontend.

---

## 9. Stripe (mode test vs mock)

### Mode mock (par défaut, sans clé Stripe)

`POST /api/payments` avec `{ bookingId }` :
- Crée un row `payments` avec `status='paid'` instantanément.
- Passe la booking en `confirmed`.
- Renvoie 201.

C'est utile pour le dev sans configuration et pour les tests automatisés (CI).

### Mode Stripe Checkout (avec `STRIPE_SECRET_KEY`)

`POST /api/payments/checkout-session` avec `{ bookingId }` :
- Crée une **session Checkout** sur Stripe avec le prix du cours en EUR.
- Renvoie `{ url: "https://checkout.stripe.com/c/pay/..." }`.
- Le front fait `window.location.assign(url)` → redirection vers la page Stripe.
- Stripe gère la carte, le 3DS, etc.
- Après paiement, Stripe redirige vers `STRIPE_SUCCESS_URL` (configurable).

**Limitation actuelle** : on n'a pas encore implémenté le **webhook Stripe** qui confirmerait le booking côté serveur après paiement. Pour l'instant on se repose sur l'URL de succès. À ajouter pour un vrai usage prod : `POST /api/payments/webhook` avec vérification de signature.

### Comment le front choisit

Dans `StudentSpace.tsx`, `handlePay` :
```typescript
try {
  const session = await createCheckoutSession(token, id);   // essaie Stripe
  window.location.assign(session.url);
} catch {
  await payBooking(token, id);                              // fallback mock
  refresh();
}
```

→ Si Stripe est configuré, on prend le chemin réel ; sinon, on retombe sur le mock. Aucun changement de code nécessaire pour switcher.

---

## 10. Tests

### Pyramide actuelle

```
                       ▲
                       │      8 tests E2E Playwright (front)
                       │      → flow utilisateur complet
                       │      → /api proxifié vers backend monté
                       │
                       │     16 tests Vitest (front)
                       │      → apiClient, Button, ProtectedRoute
                       │
                       │     17 tests Vitest (back)
                       │      → utils (validation, jwt, hash)
                       ▼
                   FONDATIONS
```

### Backend — Vitest

Lance : `npm test`

Tests dans `tests/utils/`. Pas de mock de BDD pour l'instant — on teste uniquement la logique pure (validations, JWT, bcrypt). Étape suivante : tester les **actions** avec **supertest** et un pool MySQL mocké.

### Frontend — Vitest

Lance : `npm test`

- `services/apiClient.test.ts` : tests du parser d'erreurs et du fetch wrapper, avec `global.fetch` mocké via `vi.fn()`.
- `components/ui/Button.test.tsx` : rendu et événements via `@testing-library/react` + `user-event`.
- `components/ProtectedRoute.test.tsx` : mock du hook `useAuth` via `vi.mock` + `MemoryRouter` pour tester les redirections.

Setup global dans `src/test-setup.ts` : importe `@testing-library/jest-dom/vitest` pour avoir `toBeInTheDocument()` etc.

### Frontend — Playwright

Lance : `npm run test:e2e`

- 8 tests dans `e2e/public-pages.spec.ts`.
- Démarre Vite automatiquement (`webServer` dans `playwright.config.ts`) si pas déjà lancé.
- Pas de dépendance au backend pour ces tests (les appels API peuvent 401, on teste le rendu).
- Pour tester un flow authentifié, il faudrait monter le backend et créer un user en BDD avant chaque test (à faire dans une future PR).

---

## 11. CI/CD GitHub Actions

`.github/workflows/ci.yml` sur les 2 repos. Trigger :
- `pull_request` vers `dev` ou `main`
- `push` vers `dev` ou `main`

Étapes :
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 20, cache npm)
3. `npm install`
4. `npm run lint` (Biome)
5. `npm test` (Vitest)
6. `npm run build` (TypeScript pour le back, Vite pour le front)

Si **n'importe laquelle** échoue → la PR ne peut pas être mergée (à condition d'activer les **branch protection rules** sur GitHub, ce qui reste à faire).

Durée typique : **20-30 secondes** par run.

---

## 12. Workflow Git (à respecter scrupuleusement)

### Branches
```
main      ← production (intouchable)
 │
 └── dev  ← intégration (intouchable)
      │
      └── feature/xxxx     ← une feature
          fix/xxxx         ← un bug
          docs/xxxx        ← de la doc
          chore/xxxx       ← maintenance
          test/xxxx        ← juste des tests
          ci/xxxx          ← config CI
```

**Interdit** : push direct sur `main` ou `dev`. Tout passe par PR.

### Conventional Commits

Format strict imposé par le hook `commit-msg` :
```
<type>(<scope>): <description>
```

Types valides : `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`.

Description : ≥ 10 caractères, à l'impératif, en minuscules.

Exemples valides :
- `feat(auth): ajout de la route POST /login`
- `fix(courses): corrige la requete sql de listing`
- `docs(install): guide complet d installation et de lancement`

Exemples invalides :
- `fix stuff` → pas de `:`
- `update` → type non reconnu
- `feat: fix` → description < 10 caractères

### Hook pre-commit : 150 lignes max

Le hook `.husky/pre-commit` :
1. Lance `npm run lint`. Si KO → commit refusé.
2. Compte les lignes du diff (ajouts + suppressions), en excluant `package-lock.json`, `*.svg` et `*.md`. Si > 150 → commit refusé.

**Pourquoi cette limite ?**
- Forcer à découper en commits logiques (1 commit = 1 idée).
- Garder les reviews humainement faisables (< 2 min).
- Faciliter `git bisect` (chaque commit = un changement précis).
- Permettre des revert ciblés sans casser des features adjacentes.

**Quand on dépasse** : on splitte. Stage les fichiers d'une partie avec `git add file1 file2`, commit, puis pareil pour le reste. C'est presque toujours faisable proprement.

### Cycle complet d'une feature

```bash
# 1) Partir d'un dev à jour
git checkout dev && git pull

# 2) Créer une branche feature
git checkout -b feature/ma-feature

# 3) Coder, tester, committer (autant de petits commits que nécessaire)
git add fichier1.ts
git commit -m "feat(scope): premiere etape"
git add fichier2.ts
git commit -m "feat(scope): deuxieme etape"

# 4) Pousser
git push -u origin feature/ma-feature

# 5) Ouvrir une PR
gh pr create --base dev --title "feat(scope): description courte"

# 6) Attendre que la CI passe (lint + test + build)

# 7) Merger via le bouton GitHub ou :
gh pr merge --merge
```

---

## 13. Comment ajouter une feature (exemple concret)

**Use case** : "Je veux permettre à un élève de noter un cours après l'avoir suivi."

### Étape 1 — Modèle de données

Ajouter dans `database.sql` :
```sql
CREATE TABLE ratings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_booking (booking_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
```

### Étape 2 — Backend : créer le module

```
src/modules/ratings/
├── ratingsRoutes.ts
├── ratingsActions.ts
└── ratingsRepository.ts
```

**ratingsRoutes.ts** :
```typescript
const router = Router();
router.use(requireAuth);
router.post("/", ratingsActions.add);
router.get("/course/:id", ratingsActions.browseByCourse);
export default router;
```

**ratingsActions.ts** : valider le body, appeler le repo.
**ratingsRepository.ts** : `INSERT`, `SELECT` paramétrés.

Monter dans `src/router.ts` :
```typescript
router.use("/ratings", ratingsRouter);
```

### Étape 3 — Frontend : service

`src/services/ratingsService.ts` :
```typescript
export const createRating = (token, bookingId, score, comment) =>
  apiFetch("/ratings", { method: "POST", body: { bookingId, score, comment }, token });
```

### Étape 4 — Frontend : composant

Ajouter un composant `<RatingForm bookingId={...}>` à `StudentSpace.tsx` qui n'apparaît que si `status === 'confirmed'` ET `start_at < now`.

### Étape 5 — Tests

- Backend : test d'une fonction de validation, test d'une action en mockant le repo.
- Frontend : test du `<RatingForm>` (rendu, submit).
- E2E (optionnel) : flow complet "réserver → confirmer → noter".

### Étape 6 — Git

```bash
git checkout dev && git pull
git checkout -b feature/ratings
# ... plusieurs petits commits ...
git push -u origin feature/ratings
gh pr create --base dev --title "feat(ratings): note un cours apres l avoir suivi"
```

---

## 14. Conventions de code

### Immuabilité

**Jamais** muter un objet. Toujours créer une nouvelle copie avec le spread :

```typescript
// MAUVAIS
function rename(user, newName) {
  user.name = newName;
  return user;
}

// BON
function rename(user, newName) {
  return { ...user, name: newName };
}
```

### Fichiers courts

- 200-400 lignes typique.
- 800 max.
- Si un fichier devient gros, extraire des helpers ou splitter en sous-modules.

### Petites fonctions

- < 50 lignes.
- Pas plus de 4 niveaux d'imbrication.
- Si une fonction fait 2 choses, la splitter.

### Commentaires en français

Le client a explicitement demandé du code commenté. Donc plus de commentaires que la norme habituelle, en **français**, focalisés sur **le pourquoi** plus que sur **le quoi** :

```typescript
// MAUVAIS (commente le quoi : redondant)
// Incremente count de 1
count = count + 1;

// BON (commente le pourquoi)
// On incremente avant l'insert pour reserver le slot — sinon
// 2 requetes simultanees pourraient depasser la capacite.
count = count + 1;
```

### Pas de hardcoded

Toute valeur "magique" → variable d'env (`.env`) ou constante en tête de fichier :

```typescript
// MAUVAIS
if (Date.now() < course.start_at - 7 * 24 * 60 * 60 * 1000) ...

// BON
const MIN_DAYS_BEFORE_BOOKING = 7;
const minBookingDate = new Date();
minBookingDate.setDate(minBookingDate.getDate() + MIN_DAYS_BEFORE_BOOKING);
if (course.start_at < minBookingDate) ...
```

---

## 15. Pièges connus / dette technique

### Backend
- **Pas de tests d'intégration**. Les actions ne sont pas testées avec un pool MySQL mocké ou un container MySQL en CI. Étape suivante : ajouter `supertest` + un MySQL de test.
- **Pas de webhook Stripe**. Le booking est confirmé via `success_url` côté front, donc un utilisateur malin pourrait recharger l'URL de succès sans payer. Pour la prod : implémenter `POST /api/payments/webhook` avec vérification de signature.
- **Rate limiter en mémoire**. Sur plusieurs instances ou après un restart, le compteur est réinitialisé. Pour la prod : passer à Redis.
- **`JWT_SECRET=change_me_in_production`** dans `.env`. À régénérer avec `openssl rand -hex 32` au déploiement.
- **Migration de schéma** : on a juste `database.sql`. Pas d'outil de migration (Flyway, Liquibase). À ajouter quand le schéma évoluera en prod.

### Frontend
- **Affichage des dates** : `new Date(string).toLocaleString("fr-FR")` rend bien en local mais peut surprendre dans d'autres fuseaux. À encapsuler dans un helper.
- **Pas de loader global**. Chaque page gère son `loading` localement. Si on grossit, prévoir un Spinner global et un Skeleton.
- **localStorage pour le token** : vulnérable XSS. Acceptable ici, à reconsidérer pour la prod (cookies httpOnly + CSRF protection).
- **Pas de gestion d'erreur globale**. Si un service throw et que personne ne catche, l'utilisateur ne voit rien. À ajouter : un `<ErrorBoundary>`.
- **Pas d'i18n**. Tout est en français en dur. Si on internationalise un jour : `react-i18next`.

### Déploiement
- **Pas encore déployé sur VPS**. Prévu en sprint S8 (fin 18/07).
- **Branch protection rules** non activées sur GitHub : techniquement, on peut encore push direct sur `dev`/`main`. À activer dans les settings GitHub.

---

## 16. Ressources

- **Repos GitHub** :
  - Backend : https://github.com/daddacameliayasmine-oss/JasmineTeacher-backend
  - Frontend : https://github.com/daddacameliayasmine-oss/JasmineTeacher-frontend
- **Plan complet du projet** : `IMPLEMENTATION_PLAN.md` à la racine du dossier local.
- **Règles strictes (à lire avant de coder)** : `CLAUDE.md` à la racine du dossier local.
- **Comment installer** : `INSTALL.md` à la racine du backend.

---

## 17. Quick wins pour s'approprier le projet

Si tu as 1 heure pour comprendre :
1. Lis ce document jusqu'au bout (15 min).
2. Suis `INSTALL.md` pour lancer le site (20 min).
3. Inscris-toi, promeus-toi admin, joue 10 min avec les onglets (10 min).
4. Ouvre `src/modules/courses/` et lis les 3 fichiers — Routes, Actions, Repository (10 min).
5. Ouvre `src/pages/Courses.tsx` côté front et observe comment il appelle l'API (5 min).

Tu auras une compréhension complète du pattern dominant et tu pourras ajouter ta première feature.

Bonne route 🌙
