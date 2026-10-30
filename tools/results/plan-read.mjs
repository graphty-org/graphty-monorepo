#!/usr/bin/env node
// plan-read.mjs -- the light check's one read of the results store (design/ci/channels-pipeline/merging.md 4.1).
//
//   node tools/results/plan-read.mjs <affected-projects-json> <out-dir> [--sha <sha>] [--base <sha>] [--files <file>]
//
// Asks GET /v1/plan once for the shard families of the affected packages (both run shapes, `whole` and
// `selected`), and writes two files into <out-dir>:
//   results-plan.json  the store's answer, or `{ "unavailable": "<why>" }`; ci.yml uploads it as the artifact
//                      `results-plan` for every later job
//   durations.json     `{ "<family>": { "<file>": ms } }` for `tools/test-select.mjs --plan --durations`
// Fails open: with no store, no answer or an error it writes the unavailable plan and empty durations, and
// exits 0, so the plan packs bins without history (each file counts as the family's longest).

import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { config, readPlan } from "./client.mjs";

const familyOf = (shard) => shard.replace(/-\d+$/, "");

/**
 * The variants a light check reads for its affected packages: each shard family a pull request runs (never a
 * full-run-only one, such as the On shards), flags off, both run shapes.
 * @param shards SHARDS entries
 * @param affected package directory names
 * @param [storyShards] the shards ci.yml's story-tests job runs (STORY_SHARDS), whose `-shots` family is asked too
 * @returns variant names, sorted
 */
export function variantsOf(shards, affected, storyShards = []) {
    const families = new Set(
        shards.filter((s) => !s["full-run-only"] && affected.includes(s.package)).map((s) => familyOf(s.shard)),
    );
    // a story shard's screenshot run (ci.yml's story-tests job) is a family of its own, `<family>-shots`
    const shots = new Set(storyShards.map(familyOf));
    return [...families]
        .sort()
        .flatMap((f) => [
            `${f}|flags=off|whole`,
            `${f}|flags=off|selected`,
            ...(shots.has(f) ? [`${f}-shots|flags=off|shots`] : []),
        ]);
}

/**
 * Per-family file durations from a plan: a `selected` run's time for a file wins over a `whole` run's.
 * @param plan the store's answer, or null
 * @returns `{ "<family>": { "<file>": ms } }`
 */
export function durationsOf(plan) {
    const out = {};
    const entries = Object.entries(plan?.variants ?? {}).sort(
        ([a], [b]) => b.endsWith("|whole") - a.endsWith("|whole"),
    );
    for (const [variant, facts] of entries) {
        const family = variant.split("|")[0];
        out[family] = { ...out[family], ...facts?.fileMs };
    }
    return out;
}

/**
 * Reads the plan and writes results-plan.json and durations.json.
 * @param o options
 * @param o.root the checkout
 * @param o.affected package directory names
 * @param o.out the directory to write into
 * @param [o.sha] the commit tested
 * @param [o.base] the base commit
 * @param [o.files] the changed files
 * @param [o.env] the environment
 * @returns `{ plan, durations }`
 */
export async function planRead({ root, affected, out, sha, base, files = [], env = process.env }) {
    const { SHARDS, STORY_SHARDS } = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
    const variants = variantsOf(SHARDS, affected, STORY_SHARDS);
    const cfg = config(env, root);
    let plan = null;
    let why = cfg ? "no answer" : "results store not configured";
    if (cfg && variants.length > 0) {
        // the inputs key is per group and not known before the bins exist: no `passedWithInputs` reuse yet
        plan = await readPlan(cfg, { sha, base, variants, inputs: variants.map(() => "-"), files });
    } else if (variants.length === 0) {
        why = "no affected shard";
    }
    const durations = durationsOf(plan);
    mkdirSync(out, { recursive: true });
    // `families`: what the store was asked about; a group of another family keeps the committed quarantine list
    const families = [...new Set(variants.map((v) => v.split("|")[0]))];
    writeFileSync(join(out, "results-plan.json"), JSON.stringify(plan ? { ...plan, families } : { unavailable: why }));
    writeFileSync(join(out, "durations.json"), JSON.stringify(durations));
    const n = Object.values(durations).reduce((t, d) => t + Object.keys(d).length, 0);
    console.log(
        plan
            ? `results store: plan read for ${variants.length} variants, durations of ${n} files`
            : `results store: no plan (${why}); bins are packed without history`,
    );
    return { plan, durations };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const { values, positionals } = parseArgs({
        options: { sha: { type: "string" }, base: { type: "string" }, files: { type: "string" } },
        allowPositionals: true,
    });
    const [affectedArg, out] = positionals;
    if (!affectedArg || !out) {
        console.error(
            "usage: node tools/results/plan-read.mjs <affected-projects-json> <out-dir> [--sha] [--base] [--files <file>]",
        );
        process.exit(2);
    }
    const files = values.files ? readFileSync(values.files, "utf8").split("\n").filter(Boolean) : [];
    const affected = JSON.parse(affectedArg).map((p) => p.replace(/^@graphty\//, ""));
    try {
        await planRead({ root: process.cwd(), affected, out, sha: values.sha, base: values.base, files });
    } catch (e) {
        // fail open: the plan is an optimisation, never a reason to fail the run
        console.log(`results store: no plan (${e.message.split("\n")[0]}); bins are packed without history`);
        mkdirSync(out, { recursive: true });
        writeFileSync(join(out, "results-plan.json"), JSON.stringify({ unavailable: e.message.split("\n")[0] }));
        writeFileSync(join(out, "durations.json"), "{}");
    }
}
