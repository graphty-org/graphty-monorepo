#!/usr/bin/env node
// `node tools/eslint-cache-key.mjs [pnpm-lock.yaml]`: prints a hash of the resolved versions, in the lockfile, of
// the packages that decide an ESLint verdict -- eslint, its plugins, parsers and shareable configs (every package
// whose name holds "eslint"), typescript (the type-aware rules) and globals. CI's Lint job keys its ESLint cache on
// it instead of on the whole lockfile, so a dependency bump elsewhere keeps the warm cache (#9541).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LINT_PACKAGE = /eslint|^typescript$|^globals$/;

/**
 * The lint packages a pnpm v9 lockfile resolves, as sorted `name@version` lines.
 * @param lock the lockfile's text
 * @returns the lines, one per resolved package
 */
export function lintPackages(lock) {
    const section = lock.split(/^packages:$/m)[1]?.split(/^\S/m)[0] ?? "";
    const found = new Set();
    for (const [, entry] of section.matchAll(/^ {2}'?([^\s']+?)'?:$/gm)) {
        const at = entry.lastIndexOf("@");
        if (at > 0 && LINT_PACKAGE.test(entry.slice(0, at))) found.add(entry);
    }
    return [...found].sort();
}

/**
 * The cache key part for the lint packages.
 * @param lock the lockfile's text
 * @returns a sha256 of {@link lintPackages}
 */
export function eslintCacheKey(lock) {
    return createHash("sha256").update(lintPackages(lock).join("\n")).digest("hex");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    console.log(eslintCacheKey(readFileSync(process.argv[2] ?? "pnpm-lock.yaml", "utf8")));
}
