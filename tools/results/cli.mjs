#!/usr/bin/env node
// cli.mjs -- the results store's command line (design/ci/channels-pipeline/results-service.md 6.3 and 12).
//
//   node tools/results/cli.mjs import [--dir <records>] [--dry-run]
//       Posts the local test ledger's records (the main checkout's tmp/test-ledger/records/) as kind `local`,
//       the ledger's own kind in `note`: browsable, never evidence. Safe to run again: the store ignores an id
//       it has. Needs RESULTS_URL and GRAPHTY_RESULTS_TOKEN (from .env).
//
//   node tools/results/cli.mjs base-check --variant <v> --file <f> [--repeat <n>] [--build]
//       What base-check.yml runs on master's code at a pull request's base: one test file of the variant's
//       family, <n> times, each run through run-group.mjs as its own record (kind `base` from the workflow's
//       OIDC token). --build builds the shard's package (and what it depends on) first. A `<family>-shots`
//       variant runs the story with its screenshots, as ci.yml's story-tests job does.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";

import { familyOf } from "../test-ledger.mjs";
import { selectedCommand } from "../test-select.mjs";
import { call, config } from "./client.mjs";
import { runGroup } from "./run-group.mjs";

const OUTCOMES = new Set(["passed", "failed", "error", "infra", "cancelled"]);

/**
 * A ledger record (tools/test-ledger.mjs) as a store record of kind `local`.
 * @param r the ledger record
 * @returns the store record
 */
export function fromLedger(r) {
    const shape = r.selected ? "selected" : "whole";
    return {
        id: `local.ledger.${r.id}`,
        sha: r.commit,
        tree: r.tree,
        baseSha: r.base ?? undefined,
        variant: `${r.family ?? familyOf(r.shard)}|flags=off|${shape}`,
        inputs: "ledger",
        env: "ledger",
        try: 1,
        outcome: OUTCOMES.has(r.outcome) ? r.outcome : "infra",
        startedAt: Date.parse(r.started_at),
        secs: r.secs ?? 0,
        dirty: !!r.dirty,
        note: r.branch ? `ledger ${r.kind} on ${r.branch}` : `ledger ${r.kind}`,
        files: (r.files ?? []).map(([file, passed, failed, skipped, ms]) => [file, passed, failed, skipped, ms]),
        failures: (r.failures ?? []).map((f) => ({
            file: f.file,
            name: f.name,
            status: f.status,
            message: f.message ?? f.line ?? "",
        })),
    };
}

/**
 * Every ledger record file under a directory (one folder per day, .json or .json.gz).
 * @param dir the records directory
 * @returns the paths
 */
export function ledgerFiles(dir) {
    return readdirSync(dir, { recursive: true })
        .map((n) => join(dir, n))
        .filter((p) => /\.json(\.gz)?$/.test(p) && statSync(p).isFile())
        .sort();
}

const readLedger = (p) => JSON.parse((p.endsWith(".gz") ? gunzipSync(readFileSync(p)) : readFileSync(p)).toString());

/**
 * Posts ledger records, 8 at a time.
 * @param cfg config()
 * @param files ledgerFiles()
 * @param [post] `(cfg, record) => call()'s result`
 * @returns `{ stored, had, failed }` counts, and the failed record ids with why
 */
export async function importLedger(cfg, files, post = (c, rec) => call(c, "POST", "/v1/invocations", rec)) {
    const out = { stored: 0, had: 0, failed: [] };
    let next = 0;
    const worker = async () => {
        while (next < files.length) {
            const file = files[next++];
            let rec;
            try {
                rec = fromLedger(readLedger(file));
            } catch (e) {
                out.failed.push({ id: file, why: e.message });
                continue;
            }
            const r = await post(cfg, rec);
            if (!r.ok) out.failed.push({ id: rec.id, why: r.why });
            else if (r.data?.stored) out.stored++;
            else out.had++;
        }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return out;
}

// nx's name for a package directory: its project.json name, else its package.json name (remote-logger has no
// project.json, so nx calls it @graphty/remote-logger)
function nxProject(root, dir) {
    for (const f of ["project.json", "package.json"]) {
        try {
            return JSON.parse(readFileSync(join(root, dir, f), "utf8")).name;
        } catch {
            // no such file: the next one names it
        }
    }
    return dir;
}

/**
 * What a base check runs for a family: the SHARDS slice that runs the file and its command, or for a screenshot
 * run's `<family>-shots` family (tools/results/run-group.mjs groupFamily()) the story shard ci.yml's story-tests job
 * runs (STORY_RUNS), with its visual-review project and the Git LFS files its screenshots need (#5428).
 * @param root the checkout
 * @param matrix tools/ci-test-matrix.mjs
 * @param matrix.SHARDS its SHARDS
 * @param matrix.STORY_PROJECTS its STORY_PROJECTS
 * @param matrix.STORY_RUNS its STORY_RUNS
 * @param family the variant's family
 * @param file the test file
 * @returns `{ shard, cmd, shots? }`, `shots` being `{ project, lfs, build }`; or null when nothing runs the file
 */
function checkRun(root, { SHARDS, STORY_PROJECTS = {}, STORY_RUNS = {} }, family, file) {
    // a base older than STORY_RUNS has no story runs: its plain families still run (master's tools, the base's matrix)
    const story = Object.keys(STORY_RUNS).find((s) => `${familyOf(s)}-shots` === family);
    if (story) {
        const shard = SHARDS.find((s) => s.shard === story);
        const cmd = shard && selectedCommand(root, { ...shard, "test-command": STORY_RUNS[story].command }, [file]);
        if (!cmd) return null;
        const project = STORY_PROJECTS[story];
        return {
            shard,
            cmd,
            shots: {
                project,
                lfs: `visual-baselines/${project}/**,visual-fonts/**${STORY_RUNS[story].lfs ?? ""}`,
                build: STORY_RUNS[story].build ?? [],
            },
        };
    }
    const slices = SHARDS.filter((s) => familyOf(s.shard) === family);
    const shard = slices[0];
    // a family whose command is not a plain vitest run (the WebGPU node passes, a script) runs its one shard whole
    const cmd = shard && (selectedCommand(root, shard, [file]) ?? (slices.length === 1 ? shard["test-command"] : null));
    return cmd ? { shard, cmd } : null;
}

/**
 * Runs one test file of a variant's family `repeat` times, each as its own record. A `-shots` variant runs the story
 * with its screenshots taken and compared (VISUAL_REVIEW_STORY_OUT), as ci.yml's story-tests job does.
 * @param o the check
 * @param o.root the checkout
 * @param o.variant the variant to record
 * @param o.file the test file
 * @param [o.repeat] how many runs
 * @param [o.env] the environment
 * @param [o.build] build the shard's package first, and for a `-shots` variant fetch its baselines and fonts
 * @param [o.run] runGroup (tests replace it)
 * @param [o.exec] execFileSync (tests replace it)
 * @returns the worst exit code
 */
export async function baseCheck({
    root,
    variant,
    file,
    repeat = 1,
    env = process.env,
    build = false,
    run = runGroup,
    exec = execFileSync,
}) {
    const matrix = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
    const family = variant.split("|")[0];
    const found = checkRun(root, matrix, family, file);
    if (!found) {
        console.error(`base-check: no shard of family ${family} runs ${file}`);
        return 2;
    }
    const { shard, cmd, shots } = found;
    if (build) {
        if (shots) exec("git", ["lfs", "pull", "--include", shots.lfs], { cwd: root, stdio: "inherit" });
        for (const project of [nxProject(root, shard.package), ...(shots?.build ?? [])])
            exec("pnpm", ["exec", "nx", "run", `${project}:build`], { cwd: root, stdio: "inherit" });
    }
    const out = shots && (env.VISUAL_REVIEW_STORY_OUT || mkdtempSync(join(tmpdir(), "base-check-shots-")));
    const flags = variant.includes("|flags=on|") ? "on" : "off";
    let worst = 0;
    let best = Infinity;
    for (let i = 1; i <= repeat; i++) {
        // `Failing on master` is filed by the last run, and only when every run before it failed too: one failing
        // repeat of several proves nothing alone (a pass among them makes the store's flaky verdict instead)
        const runEnv = {
            ...env,
            RESULTS_VARIANT: variant,
            GRAPHTY_FLAGS: flags,
            RESULTS_REPEAT: String(i),
            RESULTS_BASE_FILE: file,
            RESULTS_FILE_FAILING: i === repeat && best > 0 ? "1" : "0",
            ...(out && { VISUAL_REVIEW_STORY_OUT: join(out, `run-${i}`) }),
        };
        console.log(`base-check: ${file} at ${variant}, run ${i} of ${repeat}`);
        const code = await run(shard.shard, cmd, { root, env: runEnv });
        worst = Math.max(worst, code);
        best = Math.min(best, code);
    }
    return worst;
}

const mainCheckout = (cwd) =>
    resolve(
        execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd,
            encoding: "utf8",
        }).trim(),
        "..",
    );

async function cli(argv) {
    const { values, positionals } = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
            dir: { type: "string" },
            "dry-run": { type: "boolean" },
            variant: { type: "string" },
            file: { type: "string" },
            repeat: { type: "string", default: "1" },
            build: { type: "boolean" },
        },
    });
    const root = process.cwd();
    if (positionals[0] === "import") {
        const files = ledgerFiles(values.dir ?? join(mainCheckout(root), "tmp/test-ledger/records"));
        if (values["dry-run"]) {
            console.log(`import: ${files.length} ledger records would be posted as kind local`);
            return 0;
        }
        const cfg = config(process.env, root);
        if (!cfg) {
            console.error("import: set RESULTS_URL and GRAPHTY_RESULTS_TOKEN (in .env)");
            return 2;
        }
        const r = await importLedger(cfg, files);
        console.log(
            `import: ${files.length} records: ${r.stored} stored, ${r.had} already there, ${r.failed.length} failed`,
        );
        for (const f of r.failed.slice(0, 20)) console.log(`  ${f.id}: ${f.why}`);
        return r.failed.length ? 1 : 0;
    }
    if (positionals[0] === "base-check" && values.variant && values.file) {
        const repeat = Math.max(1, Number(values.repeat) || 1);
        return baseCheck({ root, variant: values.variant, file: values.file, repeat, build: values.build });
    }
    console.error("usage: node tools/results/cli.mjs import [--dir <records>] [--dry-run]");
    console.error("       node tools/results/cli.mjs base-check --variant <v> --file <f> [--repeat <n>] [--build]");
    return 2;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exit(await cli(process.argv.slice(2)));
}
