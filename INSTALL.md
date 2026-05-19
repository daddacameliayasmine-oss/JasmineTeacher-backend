# Installation & lancement — Jasmine Teacher

Guide complet pour installer et démarrer le projet **Jasmine Teacher** (backend + frontend + base MySQL) en local.

---

## 1. Prérequis

| Outil | Version mini | Vérification |
|---|---|---|
| Node.js | 20.x | `node -v` |
| npm | 10.x | `npm -v` |
| MySQL | 8.x | `mysql --version` |
| Git | 2.x | `git --version` |

> 💡 Sur macOS : `brew install node mysql git`
> Sur Linux : `apt install nodejs npm mysql-server git`

---

## 2. Cloner les deux repos

Le projet est en monorepo logique (deux repos séparés sur GitHub).

```bash
mkdir jasmine-teacher && cd jasmine-teacher
git clone https://github.com/daddacameliayasmine-oss/JasmineTeacher-backend.git
git clone https://github.com/daddacameliayasmine-oss/JasmineTeacher-frontend.git
```

---

## 3. Base de données MySQL

### Démarrer MySQL
```bash
# macOS
brew services start mysql

# Linux (systemd)
sudo systemctl start mysql
```

### Créer la base + les tables

```bash
cd JasmineTeacher-backend
mysql -u root -p < database.sql
```

Cela crée la base `jasmine_teacher` et 6 tables : `users`, `courses`, `bookings`, `payments`, `videos`, `contact_messages`.

---

## 4. Configuration des variables d'env (backend)

```bash
cd JasmineTeacher-backend
cp .env.sample .env
```

Éditer `.env` :

```env
APP_PORT=3310
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<ton-mot-de-passe-mysql>
DB_NAME=jasmine_teacher
JWT_SECRET=<generer-via-openssl-rand-hex-32>
JWT_EXPIRES_IN=2h
CLIENT_URL=http://localhost:5173

# Optionnel — pour activer le vrai Stripe Checkout (sinon mode mock)
STRIPE_SECRET_KEY=
STRIPE_SUCCESS_URL=http://localhost:5173/mon-espace?paid=1
STRIPE_CANCEL_URL=http://localhost:5173/mon-espace?cancelled=1
```

> ⚠️ **`JWT_SECRET`** : ne jamais committer. Générer avec `openssl rand -hex 32`.

---

## 5. Installer les dépendances

```bash
# Backend
cd JasmineTeacher-backend
npm install

# Frontend (dans un autre terminal)
cd JasmineTeacher-frontend
npm install
```

---

## 6. Seeder la base de données

Pour avoir un jeu de données prêt à tester les 15 user stories :

```bash
cd JasmineTeacher-backend
npm run seed
```

Cette commande **truncate** toutes les tables puis insère un jeu complet (4 comptes, 5 cours, 3 vidéos, 3 bookings, 1 paiement, 1 message). À relancer dès que tu veux repartir d'un état propre.

> ⚠️ **Ne JAMAIS lancer `npm run seed` en production** — la commande efface tout.

---

## 7. Lancer les serveurs (deux terminaux)

### Terminal 1 — Backend
```bash
cd JasmineTeacher-backend
npm run dev
```
→ API disponible sur **http://localhost:3310/api**
→ Healthcheck : `curl http://localhost:3310/api/health` doit renvoyer `{"status":"ok"}`

### Terminal 2 — Frontend
```bash
cd JasmineTeacher-frontend
npm run dev
```
→ Site disponible sur **http://localhost:5173**

---

## 8. Comptes disponibles après seed

Tous les comptes utilisent le **même mot de passe : `motdepasse123`**.

| Email | Rôle | État | User Stories testables |
|---|---|---|---|
| `jasmine@danse.com` | admin | — | **US11–15** : créer cours, modif/suppr, liste élèves, paiements, ajouter vidéo |
| `bob@example.com` | student | 1 réservation **confirmed+payée** + 1 **pending** | **US5, US7, US8, US9, US10** : login, payer la pending, accéder visio, historique, annuler |
| `charlie@example.com` | student | 1 réservation **cancelled** | **US5, US9** : login, voir historique avec annulation |
| `diana@example.com` | student | Aucune réservation (vierge) | **US5, US6** : login + réserver un cours sans collision |
| *(visiteur, pas connecté)* | — | — | **US1–4** : consulter cours, voir tarifs, créer un compte, regarder vidéos démo |

### Pour tester rapidement chaque user story

1. **Visiteur (US1–4)** : ouvrir http://localhost:5173 sans se connecter.
2. **Élève (US5–10)** : se connecter avec `bob@example.com` / `motdepasse123` puis aller sur `/mon-espace` et `/cours`.
3. **Admin (US11–15)** : se connecter avec `jasmine@danse.com` / `motdepasse123` puis aller sur `/admin`.

### Promouvoir un autre compte en admin (optionnel)

Si tu crées un compte via le formulaire et veux qu'il devienne admin :

```bash
mysql -u root -p -D jasmine_teacher -e \
  "UPDATE users SET role='admin' WHERE email='ton-email@example.com';"
```

3. Se reconnecter — l'onglet **Admin** apparaît dans la nav.

---

## 9. Stripe (optionnel)

Pour activer le vrai paiement Checkout (mode test) :

1. Créer un compte sur https://dashboard.stripe.com
2. Récupérer la clé `sk_test_...` sur https://dashboard.stripe.com/test/apikeys
3. La poser dans `.env` → `STRIPE_SECRET_KEY=sk_test_...`
4. Redémarrer le backend

Sans clé : le bouton "Payer" utilise un **flux mock** (le booking passe directement en `confirmed`).

---

## 10. Commandes utiles

### Backend
| Commande | Effet |
|---|---|
| `npm run dev` | Serveur en watch mode (rechargement à chaud) |
| `npm run seed` | Reset + réinsère le jeu de démo (4 users, 5 cours, etc.) |
| `npm run build` | Compile TypeScript dans `dist/` |
| `npm start` | Lance la version compilée |
| `npm run lint` | Vérifie le code avec Biome |
| `npm test` | Lance les 17 tests unitaires Vitest |

### Frontend
| Commande | Effet |
|---|---|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Preview du build |
| `npm run lint` | Vérifie le code avec Biome |
| `npm test` | Lance les 16 tests unitaires Vitest |
| `npm run test:e2e` | Lance les 23 tests Playwright (8 smoke + 15 US) |

### Lancer la suite E2E des 15 user stories

```bash
# Terminal 1 — backend avec rate limit désactivé (10/min sinon bloquant)
cd JasmineTeacher-backend
npm run seed
DISABLE_RATE_LIMIT=true npm run dev

# Terminal 2 — Playwright en mode séquentiel
cd JasmineTeacher-frontend
npx playwright test --workers=1
```

→ 23/23 tests verts en ~9 secondes.

---

## 11. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL pas démarré | `brew services start mysql` |
| `Access denied for user 'root'` | Mauvais mot de passe | Vérifier `DB_PASSWORD` dans `.env` |
| Frontend ne voit pas l'API | Backend pas démarré ou mauvais port | Vérifier `http://localhost:3310/api/health` |
| Erreur 401 sur `/api/*` | Token absent ou expiré | Se reconnecter |
| `Trop de requetes` (429) sur login | Rate limit atteint (10/min) | Attendre 1 min OU `DISABLE_RATE_LIMIT=true` au démarrage |
| Tests E2E échouent en série | Rate limit ou rate limiter | `DISABLE_RATE_LIMIT=true npm run dev` + `npm run seed` |
| Workflow CI échoue | Lint ou test cassé | `npm run lint:fix && npm test` localement |

---

## 12. Workflow Git

Tout passe par des **Pull Requests** vers `dev` (jamais de push direct).

```bash
git checkout dev && git pull
git checkout -b feature/ma-feature
# ... coder, lint, tester ...
git push -u origin feature/ma-feature
gh pr create --base dev --title "feat(scope): description"
```

Voir `CLAUDE.md` à la racine du projet pour le détail complet des règles (Conventional Commits, limite 150 lignes par commit, etc.).
