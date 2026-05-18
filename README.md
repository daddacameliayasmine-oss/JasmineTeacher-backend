# JasmineTeacher — Backend

API REST du projet **Jasmine Teacher** (site de cours de danse orientale en ligne).

## Stack

- **Node.js + Express** — serveur HTTP
- **TypeScript** — typage statique
- **MySQL2** — driver MySQL (requêtes SQL brutes, **pas d'ORM**)
- **Biome** — lint + formatage
- **Husky** — hooks Git (pre-commit + commit-msg)

## Installation

```bash
git clone https://github.com/daddacameliayasmine-oss/JasmineTeacher-backend.git
cd JasmineTeacher-backend
npm install
cp .env.sample .env   # puis renseigner les vraies valeurs
mysql -u root -p < database.sql
npm run dev
```

Le serveur écoute par défaut sur `http://localhost:3310`.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Démarre le serveur avec rechargement à chaud |
| `npm run build` | Compile TypeScript dans `dist/` |
| `npm start` | Lance la version compilée |
| `npm run lint` | Vérifie le code avec Biome |
| `npm run lint:fix` | Corrige automatiquement les erreurs Biome |

## Architecture

```
src/
├── database/
│   └── client.ts          # Pool MySQL
├── modules/
│   └── <module>/
│       ├── <module>Actions.ts      # Controllers (logique métier)
│       ├── <module>Repository.ts   # Accès BDD (SQL brut)
│       ├── <module>Routes.ts       # Routes Express
│       └── <module>Middleware.ts   # (optionnel) auth, validation
├── app.ts                 # Configuration Express
├── main.ts                # Point d'entrée (listen)
└── router.ts              # Routeur principal
```

Chaque module suit le pattern **Actions → Repository → Routes**.

## Règles de contribution

- Workflow Git : `main > dev > feature/*`. Push direct interdit sur `main` / `dev`.
- **Conventional Commits** obligatoires (`type(scope): description`, ≥ 10 caractères).
- **Limite de 150 lignes modifiées par commit** (hook `pre-commit`).
- Toute feature passe par une **Pull Request** vers `dev`, validée par la CI.

Voir `CLAUDE.md` (racine du projet) pour le détail complet.
