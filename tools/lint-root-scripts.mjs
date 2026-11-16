#!/usr/bin/env node
/**
 * lint-root-scripts.mjs -- the root ESLint config over the scripts no package lints: tools/, benchmarks/ and
 * the repository root's own script files.
 *
 * CI lints each Nx project, and these are none, so without this a fixed sleep in a test under tools/ or a
 * new Sonar finding in a script passed CI. tools/pipeline-health is left to tools/lint-pipeline-health.mjs,
 * which installs its dependencies first. The root vitest setup files are in no tsconfig, so the type-aware
 * rules cannot parse them. Existing findings are held in the root eslint-suppressions.json, as in each
 * package (tools/README.md, "Lint"). CI's Checks job, the pre-push gate and check:quick run it through
 * `pnpm run lint:eslint-root`.
 *
 * Usage: node tools/lint-root-scripts.mjs
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The CLI, not the ESLint API: only the CLI applies eslint-suppressions.json, read from its working directory.
const args = ["tools", "benchmarks", "*.{js,mjs,cjs,ts}", "--pass-on-unpruned-suppressions"];
for (const ignored of ["tools/pipeline-health/**", "vitest.*-setup.ts"]) args.push("--ignore-pattern", ignored);
try {
    execFileSync(path.join(root, "node_modules/.bin/eslint"), [...args, ...process.argv.slice(2)], {
        cwd: root,
        stdio: "inherit",
    });
} catch {
    console.log("ESLint over tools/, benchmarks/ and the root scripts: failed");
    process.exit(1);
}
console.log("ESLint over tools/, benchmarks/ and the root scripts: passed");
