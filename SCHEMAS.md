# Schémas — Jasmine Teacher

Tous les schémas du projet en **Mermaid** (rendu natif par GitHub). Ouvre ce fichier directement sur GitHub pour voir les diagrammes ; en local, n'importe quel rendu Markdown qui supporte Mermaid (VS Code + extension, Typora, Obsidian…) les affichera.

---

## 1. Modèle de données (Entity Relationship)

Les 6 tables MySQL avec leurs relations et contraintes.

```mermaid
erDiagram
    USERS ||--o{ COURSES : "crée (admin)"
    USERS ||--o{ BOOKINGS : "réserve"
    COURSES ||--o{ BOOKINGS : "concerne"
    BOOKINGS ||--o| PAYMENTS : "payée par"

    USERS {
        int id PK
        varchar lastname
        varchar firstname
        varchar email UK "UNIQUE"
        varchar password_hash "bcrypt 12 rounds"
        enum role "student | admin"
        datetime created_at
    }

    COURSES {
        int id PK
        varchar title
        text description
        enum type "collectif | individuel | enfant_collectif | enfant_individuel"
        decimal price
        int capacity
        datetime start_at "règle J-7"
        int duration_minutes
        varchar visio_url
        int created_by FK
    }

    BOOKINGS {
        int id PK
        int user_id FK
        int course_id FK
        enum status "pending | confirmed | cancelled"
        datetime created_at
    }

    PAYMENTS {
        int id PK
        int booking_id FK
        decimal amount
        enum status "pending | paid | refunded"
        datetime paid_at
    }

    VIDEOS {
        int id PK
        varchar title
        varchar url
        boolean is_public "vitrine vs élèves"
        datetime created_at
    }

    CONTACT_MESSAGES {
        int id PK
        varchar email "nullable"
        text message
        datetime created_at
    }
```

**Contraintes notables** :

- `bookings` a un `UNIQUE(user_id, course_id)` → 1 booking max par couple élève/cours
- Toutes les FK avec `ON DELETE CASCADE` → suppression en chaîne (pas d'orphelin)
- `password_hash` n'est jamais renvoyé au client (sélection explicite des colonnes)

---

## 2. Architecture globale

Vue d'ensemble des composants et de leurs flux de communication.

```mermaid
flowchart LR
    subgraph Browser["🌐 Navigateur"]
        UI[React 18 + Vite<br/>localhost:5173]
    end

    subgraph Front["Frontend"]
        AuthCtx[AuthContext<br/>+ localStorage]
        ApiClient[apiClient<br/>fetch wrapper]
        Pages[Pages + Components]
        UI --> Pages
        Pages --> AuthCtx
        Pages --> ApiClient
    end

    subgraph Back["Backend Express<br/>localhost:3310"]
        Router[Router /api/*]
        Middlewares[Middlewares<br/>requireAuth, requireAdmin,<br/>rateLimit, errorHandler]
        Modules[8 modules<br/>auth, users, courses,<br/>bookings, payments,<br/>videos, contact, stats]
        Router --> Middlewares
        Middlewares --> Modules
    end

    subgraph DB["💾 MySQL 8"]
        Tables[(6 tables<br/>+ FK + contraintes)]
    end

    subgraph Ext["Externe"]
        Stripe[Stripe Checkout<br/>mode test]
    end

    ApiClient -- "JSON + Bearer JWT" --> Router
    Modules -- "SQL paramétré<br/>mysql2/promise" --> Tables
    Modules -. "optionnel" .-> Stripe
```

---

## 3. Flow d'inscription puis connexion

```mermaid
sequenceDiagram
    autonumber
    actor V as Visiteur Eve
    participant F as Frontend<br/>(React)
    participant B as Backend<br/>(Express)
    participant DB as MySQL
    participant LS as localStorage

    Note over V,LS: Inscription
    V->>F: Remplit formulaire /inscription
    F->>B: POST /api/auth/register<br/>{ lastname, firstname, email, password }
    B->>B: Valide email + mdp (>= 8)
    B->>DB: SELECT * FROM users WHERE email=?
    DB-->>B: vide (email libre)
    B->>B: bcrypt.hash(password, 12)
    B->>DB: INSERT INTO users (..., role='student')
    DB-->>B: insertId: 5
    B->>B: signToken({ userId: 5, role: 'student' })
    B-->>F: 201 { token, user }
    F->>LS: setItem('jt_token', token)
    F-->>V: Redirige vers / (nav connectée)

    Note over V,LS: Connexion ultérieure
    V->>F: Soumet /connexion
    F->>B: POST /api/auth/login { email, password }
    B->>DB: SELECT * FROM users WHERE email=?
    DB-->>B: user + password_hash
    B->>B: bcrypt.compare(password, hash)
    B-->>F: 200 { token, user }
    F->>LS: setItem('jt_token', token)
```

---

## 4. Flow de réservation d'un cours

Avec les 2 règles métier (capacité + J-7) appliquées côté serveur.

```mermaid
sequenceDiagram
    autonumber
    actor E as Élève Bob
    participant F as Frontend
    participant B as Backend
    participant DB as MySQL

    E->>F: Clique "Réserver" sur un cours
    F->>B: POST /api/bookings<br/>{ courseId } + Bearer token
    B->>B: requireAuth → vérifie JWT
    B->>DB: SELECT * FROM courses WHERE id=?
    DB-->>B: course (start_at, capacity)

    alt start_at < now + 7 jours
        B-->>F: 400 "Reservation a minimum 7 jours d'avance"
        F-->>E: Message d'erreur lisible
    else capacité pleine
        B->>DB: SELECT COUNT(*) FROM bookings<br/>WHERE course_id=? AND status!='cancelled'
        DB-->>B: count >= capacity
        B-->>F: 409 "Capacite pleine"
    else doublon (UNIQUE)
        B->>DB: INSERT INTO bookings<br/>(user_id, course_id, 'pending')
        DB-->>B: ER_DUP_ENTRY
        B-->>F: 409 "Deja reserve"
    else OK
        B->>DB: INSERT INTO bookings<br/>(user_id, course_id, 'pending')
        DB-->>B: insertId: 42
        B-->>F: 201 { id: 42, status: 'pending' }
        F-->>E: "Réservation créée"
    end
```

---

## 5. Flow de paiement — Stripe vs mock

Le front tente d'abord Stripe Checkout, fallback automatique sur le mock si Stripe pas configuré.

```mermaid
sequenceDiagram
    autonumber
    actor E as Élève
    participant F as Frontend
    participant B as Backend
    participant S as Stripe
    participant DB as MySQL

    E->>F: Clique "Payer 20€"

    F->>B: POST /api/payments/checkout-session<br/>{ bookingId }

    alt STRIPE_SECRET_KEY défini (Stripe réel)
        B->>B: getStripeClient() OK
        B->>DB: vérifier booking + récup price du course
        DB-->>B: booking.user_id == req.auth.userId<br/>course.price = 20
        B->>S: stripe.checkout.sessions.create(...)
        S-->>B: { url: "checkout.stripe.com/..." }
        B-->>F: 201 { url }
        F->>F: window.location.assign(url)
        E->>S: Page Stripe Checkout (carte, 3DS)
        S-->>E: Redirige vers STRIPE_SUCCESS_URL
        Note over B,DB: ⚠️ webhook Stripe à implémenter<br/>pour confirmer côté serveur
    else STRIPE_SECRET_KEY absent (mock)
        B-->>F: 503 "Stripe non configure"
        F->>B: POST /api/payments<br/>{ bookingId } (fallback mock)
        B->>DB: récup course.price (source de vérité)
        B->>DB: INSERT INTO payments (..., 'paid', NOW())
        B->>DB: UPDATE bookings SET status='confirmed'
        DB-->>B: OK
        B-->>F: 201 { paid }
        F-->>E: Affiche "Confirme" + lien visio
    end
```

---

## 6. Rôles et permissions

Qui peut accéder à quelles routes ? Tableau condensé sous forme de graphe.

```mermaid
flowchart TB
    Visiteur((Visiteur<br/>non connecté))
    Eleve((Élève<br/>role=student))
    Admin((Admin<br/>role=admin))

    subgraph Pub["Routes publiques"]
        GETC[GET /courses]
        GETV[GET /videos]
        POSTR[POST /auth/register]
        POSTL[POST /auth/login]
        POSTCT[POST /contact]
    end

    subgraph Auth["Routes authentifiées requireAuth"]
        BookMe[GET /bookings/me]
        BookCreate[POST /bookings]
        BookCancel[DELETE /bookings/:id]
        PayMock[POST /payments]
        PayCheckout[POST /payments/checkout-session]
        VideosAll[GET /videos/all]
        Me[GET /auth/me]
    end

    subgraph Adm["Routes admin requireAuth + requireAdmin"]
        Users[GET /users]
        CourseCRUD[POST PUT DELETE /courses]
        VideoCRUD[POST DELETE /videos]
        BookAll[GET /bookings/all]
        PayAll[GET /payments]
        Stats[GET /stats]
        ContactList[GET /contact]
    end

    Visiteur --> Pub
    Eleve --> Pub
    Eleve --> Auth
    Admin --> Pub
    Admin --> Auth
    Admin --> Adm
```

---

## 7. Le pattern Action / Repository / Routes

C'est le pattern dominant côté backend. Chaque module suit cette structure.

```mermaid
flowchart LR
    Req[HTTP Request<br/>POST /api/courses]
    Routes[xxxRoutes.ts<br/>déclare endpoints]
    MW[Middlewares<br/>requireAuth requireAdmin]
    Actions[xxxActions.ts<br/>logique métier<br/>+ validation]
    Repo[xxxRepository.ts<br/>SQL uniquement]
    DB[(MySQL)]
    Res[HTTP Response<br/>201 Created]

    Req --> Routes
    Routes --> MW
    MW --> Actions
    Actions --> Repo
    Repo --> DB
    DB --> Repo
    Repo --> Actions
    Actions --> Res
```

**Règles** :

- Les **Routes** ne contiennent **aucune logique** (juste `.post(path, ...mw, action)`)
- Les **Actions** ne touchent **jamais directement** à `pool.query` — toujours via le Repository
- Les **Repositories** ne lisent **jamais** `req.body` — ils reçoivent des paramètres typés

---

## 8. Pipeline CI/CD (GitHub Actions)

Déclenché à chaque PR ou push sur `dev` ou `main`.

```mermaid
flowchart LR
    Trigger{pull_request<br/>ou push<br/>vers dev / main}
    Checkout[actions/checkout@v4]
    Setup[Setup Node 20<br/>+ cache npm]
    Install[npm install]
    Lint[npm run lint<br/>Biome]
    Test[npm test<br/>Vitest]
    Build[npm run build<br/>TypeScript / Vite]
    Pass([✅ Merge possible])
    Fail([❌ PR bloquée])

    Trigger --> Checkout
    Checkout --> Setup
    Setup --> Install
    Install --> Lint
    Lint -->|OK| Test
    Lint -->|KO| Fail
    Test -->|OK| Build
    Test -->|KO| Fail
    Build -->|OK| Pass
    Build -->|KO| Fail
```

Durée typique : **20–26 secondes**.

---

## 9. Workflow Git

Branches et flux d'intégration.

```mermaid
gitGraph
    commit id: "init"
    branch dev
    checkout dev
    commit id: "ready"
    branch feature/auth-module
    checkout feature/auth-module
    commit id: "feat(auth): register"
    commit id: "feat(auth): login"
    checkout dev
    merge feature/auth-module tag: "PR #2"
    branch feature/courses-module
    checkout feature/courses-module
    commit id: "feat(courses): CRUD"
    checkout dev
    merge feature/courses-module tag: "PR #3"
    checkout main
    merge dev tag: "release v0.1"
```

**Règles** :

- Push direct interdit sur `main` et `dev`.
- Tout passe par une **PR** vers `dev` (avec CI verte + review).
- `dev → main` chaque fin de semaine (livraison fréquente).
- Branches : `feature/*`, `fix/*`, `docs/*`, `chore/*`, `test/*`, `ci/*`.

---

## 10. Cycle de vie d'une réservation

États possibles d'une `booking` au cours du temps.

```mermaid
stateDiagram-v2
    [*] --> pending: POST /bookings<br/>(règle J-7 OK)
    pending --> confirmed: paiement réussi<br/>(mock ou Stripe)
    pending --> cancelled: DELETE /bookings/:id<br/>(élève annule)
    confirmed --> cancelled: DELETE /bookings/:id<br/>(remboursement à prévoir)
    cancelled --> [*]
    confirmed --> [*]: cours passé
```

---

## 11. Couverture des 15 User Stories

Quels comptes du seed permettent de tester chaque US.

```mermaid
flowchart LR
    subgraph Visiteur["Visiteur (non connecté)"]
        US1[US1 - consulter cours]
        US2[US2 - voir tarifs]
        US3[US3 - créer compte]
        US4[US4 - vidéos démo]
    end

    subgraph Bob["bob@example.com<br/>1 confirmed+payée + 1 pending"]
        US5[US5 - se connecter]
        US7[US7 - payer]
        US8[US8 - accéder visio]
        US9[US9 - historique]
        US10[US10 - annuler]
    end

    subgraph Diana["diana@example.com<br/>vierge"]
        US6[US6 - réserver]
    end

    subgraph Jasmine["jasmine@danse.com<br/>admin"]
        US11[US11 - créer cours]
        US12[US12 - modifier/supprimer]
        US13[US13 - liste élèves]
        US14[US14 - paiements]
        US15[US15 - ajouter vidéo]
    end
```

---

> 💡 **Astuce démo** : `INSTALL.md` détaille les identifiants et la procédure. `ONBOARDING.md` explique la logique métier en français pour quelqu'un qui découvre le projet.
