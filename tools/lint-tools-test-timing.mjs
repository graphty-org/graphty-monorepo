#!/usr/bin/env node
/**
 * lint-tools-test-timing.mjs -- the test-timing rule (local/no-test-timing) over tools/.
 *
 * CI lints each Nx project, and tools/ is none, so a fixed sleep in a test under tools/ passed CI. The
 * rest of ESLint's rules are not yet clean there, so this applies only the root config's blocks that set
 * the timing rule (its files, its exemptions) and the global ignores, to every file under tools/.
 *
 * Usage: node tools/lint-tools-test-timing.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import tseslint from "typescript-eslint";

import rootConfig from "../eslint.config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULE = "local/no-test-timing";
const blocks = rootConfig.filter((b) => (Object.keys(b).length === 1 && b.ignores) || (b.rules && RULE in b.rules));
const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [{ files: ["**/*.{ts,tsx,mts}"], languageOptions: { parser: tseslint.parser } }, ...blocks],
});
const results = await eslint.lintFiles(["tools"]);
console.log((await eslint.loadFormatter("stylish")).format(results));
const errors = results.reduce((n, r) => n + r.errorCount, 0);
console.log(`${RULE} over tools/: ${errors} error(s) in ${results.length} files`);
process.exit(errors > 0 ? 1 : 0);
