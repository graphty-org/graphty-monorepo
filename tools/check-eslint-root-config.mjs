#!/usr/bin/env node
/**
 * check-eslint-root-config.mjs -- every package ESLint config must include the root config.
 *
 * A package that has its own eslint.config.* is linted with THAT file only, so it has to import
 * ../eslint.config.js and spread it. graphty-element's config was once overwritten with a stale
 * copy of the root config: the rules the root gained afterwards were silently off for the
 * package and no gate failed.
 *
 * This loads the root config and every <package>/eslint.config.{js,mjs,cjs}, and fails when a
 * package's exported array does not contain every object of the root export. The objects are
 * compared by identity: both imports resolve to the same module instance, so a spread keeps the
 * very same objects, while a copy, however faithful today, does not.
 *
 * A package may leave out a root block on purpose only when the block is named and the omission
 * is listed in OMITTED below with its reason.
 *
 * Usage: node tools/check-eslint-root-config.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = async (file) => (await import(pathToFileURL(file).href)).default;

const rootConfig = await load(path.join(root, "eslint.config.js"));
const configs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "node_modules" && !d.name.startsWith("."))
    .flatMap((d) => ["js", "mjs", "cjs"].map((ext) => path.join(d.name, `eslint.config.${ext}`)))
    .filter((rel) => fs.existsSync(path.join(root, rel)));

/** Named root blocks a package filters out on purpose, keyed by the package config's path. */
const OMITTED = {
    // graphty-element's stories are in its tsconfig, so they keep the type-aware rules this root
    // block turns off for stories that belong to no TypeScript project.
    "graphty-element/eslint.config.js": ["stories/no-type-information"],
};

let failed = 0;
for (const rel of configs) {
    const config = await load(path.join(root, rel));
    const present = new Set(Array.isArray(config) ? config : [config]);
    const allowed = new Set(OMITTED[rel] ?? []);
    const missing = rootConfig.filter((block) => !present.has(block) && !allowed.has(block.name)).length;
    if (missing > 0) {
        failed++;
        console.error(
            `${rel}: ${missing} of the root config's ${rootConfig.length} blocks are missing. ` +
                'Import the root config and spread it first: import rootConfig from "../eslint.config.js"; ...rootConfig',
        );
    } else {
        console.log(`${rel}: includes the root config`);
    }
}

if (failed > 0) {
    process.exit(1);
}
console.log(`All ${configs.length} package ESLint configs include the root config.`);
