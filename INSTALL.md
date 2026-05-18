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

## 6. Lancer les serveurs (deux terminaux)

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

## 7. Créer un compte admin (Jasmine)

L'inscription publique crée toujours un `student`. Pour avoir un admin :

1. S'inscrire normalement sur http://localhost:5173/inscription
2. Promouvoir le compte en admin via MySQL :

```bash
mysql -u root -p -D jasmine_teacher -e \
  "UPDATE users SET role='admin' WHERE email='ton-email@example.com';"
```

3. Se reconnecter — l'onglet **Admin** apparaît dans la nav.

---

## 8. Stripe (optionnel)

Pour activer le vrai paiement Checkout (mode test) :

1. Créer un compte sur https://dashboard.stripe.com
2. Récupérer la clé `sk_test_...` sur https://dashboard.stripe.com/test/apikeys
3. La poser dans `.env` → `STRIPE_SECRET_KEY=sk_test_...`
4. Redémarrer le backend

Sans clé : le bouton "Payer" utilise un **flux mock** (le booking passe directement en `confirmed`).

---

## 9. Commandes utiles

### Backend
| Commande | Effet |
|---|---|
| `npm run dev` | Serveur en watch mode (rechargement à chaud) |
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
| `npm run test:e2e` | Lance les 8 tests Playwright |

---

## 10. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL pas démarré | `brew services start mysql` |
| `Access denied for user 'root'` | Mauvais mot de passe | Vérifier `DB_PASSWORD` dans `.env` |
| Frontend ne voit pas l'API | Backend pas démarré ou mauvais port | Vérifier `http://localhost:3310/api/health` |
| Erreur 401 sur `/api/*` | Token absent ou expiré | Se reconnecter |
| Workflow CI échoue | Lint ou test cassé | `npm run lint:fix && npm test` localement |

---

## 11. Workflow Git

Tout passe par des **Pull Requests** vers `dev` (jamais de push direct).

```bash
git checkout dev && git pull
git checkout -b feature/ma-feature
# ... coder, lint, tester ...
git push -u origin feature/ma-feature
gh pr create --base dev --title "feat(scope): description"
```

Voir `CLAUDE.md` à la racine du projet pour le détail complet des règles (Conventional Commits, limite 150 lignes par commit, etc.).
