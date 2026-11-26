#!/usr/bin/env node
// Fails when a research document in this folder is missing from section 2 of
// population-to-designloom-persona-index.md, or the table names a file that no longer exists.
// Run: node design/user-research/check-index-coverage.mjs
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const INDEX = "population-to-designloom-persona-index.md";
const docs = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== INDEX && f !== "README.md");
const text = readFileSync(join(dir, INDEX), "utf8");
const section2 = text.split(/^## 2\./m)[1].split(/^## 3\./m)[0];
const listed = [...section2.matchAll(/^\| ([a-z0-9-]+\.md) \|/gm)].map((m) => m[1]);

const missing = docs.filter((f) => !listed.includes(f));
const stale = listed.filter((f) => !docs.includes(f));
for (const f of missing) console.error(`not indexed: ${f}`);
for (const f of stale) console.error(`indexed but missing on disk: ${f}`);
if (missing.length || stale.length) process.exit(1);
console.log(`ok: ${docs.length} research documents, all indexed`);
