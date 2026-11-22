import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { eslintCacheKey, lintPackages } from "./eslint-cache-key.mjs";

const lock = (extra) => `lockfileVersion: '9.0'

importers:

  .:
    devDependencies:
      eslint:
        specifier: ^9.0.0
        version: 9.39.5

packages:

  '@eslint/js@9.39.5':
    resolution: {integrity: sha512-a}

  '@playwright/test@${extra.playwright}':
    resolution: {integrity: sha512-b}

  eslint-plugin-react@7.37.5:
    resolution: {integrity: sha512-c}

  globals@16.4.0:
    resolution: {integrity: sha512-d}

  typescript-eslint@${extra.tseslint}:
    resolution: {integrity: sha512-e}

  typescript@5.9.3:
    resolution: {integrity: sha512-f}

snapshots:

  eslint@9.39.5(jiti@2.6.1):
    dependencies: {}
`;

describe("eslint-cache-key", () => {
    it("lists only the lint packages of the packages section", () => {
        assert.deepEqual(lintPackages(lock({ playwright: "1.58.0", tseslint: "8.72.2" })), [
            "@eslint/js@9.39.5",
            "eslint-plugin-react@7.37.5",
            "globals@16.4.0",
            "typescript-eslint@8.72.2",
            "typescript@5.9.3",
        ]);
    });

    it("keeps the key when only a non-lint package changes", () => {
        const before = eslintCacheKey(lock({ playwright: "1.58.0", tseslint: "8.72.2" }));
        assert.equal(eslintCacheKey(lock({ playwright: "1.65.0", tseslint: "8.72.2" })), before);
    });

    it("changes the key when a lint package changes", () => {
        const before = eslintCacheKey(lock({ playwright: "1.58.0", tseslint: "8.72.2" }));
        assert.notEqual(eslintCacheKey(lock({ playwright: "1.58.0", tseslint: "8.73.0" })), before);
    });

    it("finds the lint packages in the repository's own lockfile", async () => {
        const { readFileSync } = await import("node:fs");
        const found = lintPackages(readFileSync(new URL("../pnpm-lock.yaml", import.meta.url), "utf8"));
        for (const name of ["eslint", "typescript-eslint", "typescript"]) {
            assert.ok(
                found.some((p) => p.startsWith(`${name}@`)),
                `${name} missing from ${found.join(", ")}`,
            );
        }
    });
});
