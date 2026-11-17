#!/usr/bin/env node
/**
 * lint-pipeline-health.mjs -- the root ESLint config and the type-check over tools/pipeline-health.
 *
 * tools/pipeline-health is a standalone package (its own lockfile, not a workspace member), so no Nx
 * lint target reaches it, and its own workflow (pipeline-health.yml) runs only when its files change.
 * A change to the root ESLint config, tsconfig.base.json or vitest.base.mjs could break it unseen: 2,612
 * ESLint errors and a failing type-check had piled up by 2026-10-30 (#5172). This installs the package's
 * own dependencies (the type-aware rules need them), then lints it with the root config and type-checks
 * the backend and the page. CI's Checks job, the pre-push gate and check:quick run it through
 * `pnpm run lint:eslint-root`.
 *
 * Usage: node tools/lint-pipeline-health.mjs
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = path.join(root, "tools/pipeline-health");
const run = (cmd, args) => execFileSync(cmd, args, { cwd: pkg, stdio: "inherit" });

run("pnpm", ["install", "--frozen-lockfile", "--prefer-offline", "--reporter=silent"]);

// The CLI, not the ESLint API: only the CLI applies the package's eslint-suppressions.json, which it reads
// from its working directory (tools/README.md, "Lint").
let errors = 0;
try {
    run(path.join(root, "node_modules/.bin/eslint"), [".", "--pass-on-unpruned-suppressions"]);
} catch {
    errors = 1;
}
console.log(`ESLint over tools/pipeline-health: ${errors ? "failed" : "passed"}`);

let typecheck = 0;
for (const args of [["--noEmit"], ["--noEmit", "-p", "web"]]) {
    try {
        run("pnpm", ["exec", "tsc", ...args]);
    } catch {
        typecheck++;
    }
}
console.log(`Type-check of tools/pipeline-health: ${typecheck ? "failed" : "passed"}`);
process.exit(errors > 0 || typecheck > 0 ? 1 : 0);
