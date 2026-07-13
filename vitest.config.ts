import { defineConfig } from "vitest/config";

// Tests run against the built dist/ artifact (the source is ESM with explicit
// .js import specifiers). `npm test` builds first, so tests exercise the exact
// code that ships.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
