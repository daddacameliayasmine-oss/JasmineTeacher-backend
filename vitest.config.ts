import { defineConfig } from "vitest/config";

// Configuration des tests : on cible tests/ (en dehors de src/ pour eviter
// de polluer le build TypeScript). Couverture v8 sur src/.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/database/**"],
    },
  },
});
