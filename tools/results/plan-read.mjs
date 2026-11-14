#!/usr/bin/env node
// plan-read.mjs -- the light check's one read of the results store (design/ci/channels-pipeline/merging.md 4.1).
//
//   node tools/results/plan-read.mjs <affected-projects-json> <out-dir> [--sha <sha>] [--base <sha>] [--files <file>]
//
// Asks GET /v1/plan once for the shard families of the affected packages, and of the packages whose files import
// theirs by relative path (both run shapes, `whole` and `selected`), and writes two files into <out-dir>:
//   results-plan.json  the store's answer, or `{ "unavailable": "<why>" }`; ci.yml uploads it as the artifact
//                      `results-plan` for every later job
//   durations.json     `{ "<family>": { "<file>": ms } }` for `tools/test-select.mjs --plan --durations`
// Fails open: with no store, no answer or an error it writes the unavailable plan and empty durations, and
// exits 0, so the plan packs bins without history (each file counts as the family's longest).

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { config, fetchPlan } from "./client.mjs";

const familyOf = (shard) => shard.replace(/-\d+$/, "");

/**
 * The variants a light check reads for its affected packages: each shard family a pull request runs (never a
 * full-run-only one), under its flags (on for an On shard, tools/ci-test-matrix.mjs FEATURES_ON_SHARDS), both run
 * shapes.
 * @param shards SHARDS entries
 * @param affected package directory names
 * @param [storyShards] the shards ci.yml's story-tests job runs (STORY_SHARDS), whose `-shots` family is asked too
 * @returns variant names, sorted
 */
export function variantsOf(shards, affected, storyShards = []) {
    const families = new Map(
        shards
            .filter((s) => !s["full-run-only"] && affected.includes(s.package))
            .map((s) => [familyOf(s.shard), s.flags === "on" ? "on" : "off"]),
    );
    // a story shard's screenshot run (ci.yml's story-tests job) is a family of its own, `<family>-shots`
    const shots = new Set(storyShards.map(familyOf));
    return [...families.keys()]
        .sort()
        .flatMap((f) => [
            `${f}|flags=${families.get(f)}|whole`,
            `${f}|flags=${families.get(f)}|selected`,
            ...(shots.has(f) ? [`${f}-shots|flags=off|shots`] : []),
        ]);
}

const CODE = /\.[cm]?[jt]sx?$/u;

/**
 * The packages, outside `affected`, with a code file that imports an affected package's file by relative path
 * (`../../graphty-element/index.ts`). nx does not count such a package affected (graph-io's fidelity stories draw
 * with graphty-element, and graph-io/project.json drops that edge), but the test selector follows the import and
 * bins its tests; without their recorded durations each counted as 35 s, so graph-io-storybook's slowest stories
 * shared one bin that ran 520 to 670 s against an 8-minute budget in every graphty-element pull request (#6229).
 * @param root the checkout
 * @param affected package directory names
 * @param packages the package directories to look in
 * @returns package directory names, sorted; none when git cannot answer
 */
export function readersOf(root, affected, packages) {
    const others = [...new Set(packages)].filter((p) => !affected.includes(p));
    if (affected.length === 0 || others.length === 0) return [];
    const re = String.raw`(from |import\(|import )["'](\.\./)+(${affected.join("|")})/`;
    let out;
    try {
        out = execFileSync("git", ["grep", "-l", "-E", re, "--", ...others.map((p) => `${p}/`)], {
            cwd: root,
            encoding: "utf8",
            maxBuffer: 64 << 20,
        });
    } catch {
        // exit 1 is no match; any other failure only leaves the plan as narrow as before
        return [];
    }
    const files = out.split("\n").filter((f) => CODE.test(f));
    return [...new Set(files.map((f) => f.split("/")[0]))].sort();
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
 * Says why there is no plan, as a ::warning:: annotation on the run page: the bins fall back to one per file, which
 * multiplies the run's jobs (#6164).
 * @param why the reason the read failed
 */
export function fallback(why) {
    console.log(`::warning::results store: no plan (${why}); test bins are packed without history, one job per file`);
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
    const readers = readersOf(
        root,
        affected,
        SHARDS.map((s) => s.package),
    );
    const variants = variantsOf(SHARDS, [...affected, ...readers], STORY_SHARDS);
    const cfg = config(env, root);
    let plan = null;
    let why = "results store not configured";
    if (cfg && variants.length > 0) {
        // the inputs key is per group and not known before the bins exist: no `passedWithInputs` reuse yet
        const r = await fetchPlan(cfg, { sha, base, variants, inputs: variants.map(() => "-"), files });
        if (r.ok && r.data) plan = r.data;
        else why = r.ok ? "the store answered with no plan" : r.why;
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
    const also = readers.length > 0 ? ` (with ${readers.join(", ")}: its files import an affected package)` : "";
    if (plan) console.log(`results store: plan read for ${variants.length} variants${also}, durations of ${n} files`);
    else if (variants.length === 0) console.log(`results store: no plan (${why})`);
    else fallback(why);
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
        fallback(e.message.split("\n")[0]);
        mkdirSync(out, { recursive: true });
        writeFileSync(join(out, "results-plan.json"), JSON.stringify({ unavailable: e.message.split("\n")[0] }));
        writeFileSync(join(out, "durations.json"), "{}");
    }
}
