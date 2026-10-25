#!/usr/bin/env node
// Actions cache hygiene (#3431), run by ci.yml's "Cache hygiene" job on every master build.
// A key's family is the key without its trailing content hash or run id: `lfs-graphty-<sha256>` is family
// `lfs-graphty`, `test-durations-graph-io-<run id>-<attempt>` is `test-durations-graph-io`. Within one
// ref, the newest key of a family supersedes every older one, which nothing restores any more (an exact
// key always misses, and a restore-keys prefix takes the newest), so those are deleted: one LFS key per
// project, one import-graph key, one pnpm store per OS. A dotted version (playwright-Linux-1.57.0) stays
// in the family, so two caches of one path keyed differently never delete each other.
//
//   node tools/cache-hygiene.mjs <caches.ndjson> <delete-ids.txt>
//       reads the repository's caches (the API's actions_caches entries, one JSON object per line),
//       writes the ids to delete, and prints each family's size against ci-budgets.json (`cache:<family>`
//       and `bytes:actions-cache`), a warning annotation per family or total over its budget.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { budgetFor } from "./ci-budgets.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GB = 1e9;

/**
 * A cache key's family.
 * @param key an Actions cache key
 * @returns the key without its trailing hashes (16 or more hex digits) and run id with attempt
 */
export function family(key) {
    return key.replace(/(?:-(?:[0-9a-f]{16,}|\d{6,}-\d+))+$/i, "");
}

const slot = (c) => `${c.ref}\u0000${family(c.key)}`;

/**
 * The caches a newer cache of the same family on the same ref supersedes.
 * @param caches `{ id, key, ref, created_at }[]`
 * @returns the superseded caches
 */
export function superseded(caches) {
    const newest = new Map();
    for (const c of caches) {
        const n = newest.get(slot(c));
        if (!n || Date.parse(c.created_at) > Date.parse(n.created_at)) newest.set(slot(c), c);
    }
    return caches.filter((c) => newest.get(slot(c)) !== c);
}

/**
 * Each family's size against its budget, over every ref.
 * @param caches the caches that remain
 * @param file the parsed ci-budgets.json
 * @returns `{ family, keys, bytes, gb, over }[]` largest first, and the total `{ bytes, gb, over }`
 */
export function sizes(caches, file) {
    const by = new Map();
    for (const c of caches) {
        const f = family(c.key);
        const row = by.get(f) ?? { family: f, keys: 0, bytes: 0 };
        row.keys += 1;
        row.bytes += c.size_in_bytes ?? 0;
        by.set(f, row);
    }
    const rows = [...by.values()]
        .map((r) => {
            const gb = budgetFor(file, `cache:${r.family}`)?.gb;
            return { ...r, gb, over: gb !== undefined && r.bytes > gb * GB };
        })
        .sort((a, b) => b.bytes - a.bytes);
    const bytes = rows.reduce((s, r) => s + r.bytes, 0);
    const gb = file.budgets?.["bytes:actions-cache"]?.gb;
    return { rows, total: { bytes, gb, over: gb !== undefined && bytes > gb * GB } };
}

const fmt = (bytes) => `${(bytes / GB).toFixed(2)} GB`;

function main([input, out]) {
    if (!input || !out) {
        console.error("usage: cache-hygiene.mjs <caches.ndjson> <delete-ids.txt>");
        return 2;
    }
    const caches = readFileSync(input, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
    const gone = superseded(caches);
    writeFileSync(out, gone.map((c) => `${c.id}\n`).join(""));
    const ids = new Set(gone.map((c) => c.id));
    const file = JSON.parse(readFileSync(join(ROOT, "ci-budgets.json"), "utf8"));
    const { rows, total } = sizes(
        caches.filter((c) => !ids.has(c.id)),
        file,
    );
    // ponytail: no write-rate alarm; each run deletes what it supersedes, so the listing cannot count
    // writes. Record a key's creation in the results store when a writesPerWeek line needs judging.
    const lines = [
        `### Actions caches: ${caches.length} keys, ${gone.length} superseded and deleted`,
        "",
        `${fmt(total.bytes)} left (budget ${total.gb ?? "none"} GB, bytes:actions-cache)`,
        "",
        "| family | keys | size | budget |",
        "| --- | --- | --- | --- |",
        ...rows.map(
            (r) => `| ${r.family} | ${r.keys} | ${fmt(r.bytes)} | ${r.gb ?? "none"} GB${r.over ? " OVER" : ""} |`,
        ),
    ];
    console.log(lines.join("\n"));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
    for (const r of rows.filter((x) => x.over))
        console.log(`::warning::cache family ${r.family} holds ${fmt(r.bytes)}, over its ${r.gb} GB budget`);
    if (total.over) console.log(`::warning::Actions caches hold ${fmt(total.bytes)}, over the ${total.gb} GB budget`);
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
