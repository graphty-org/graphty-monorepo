#!/usr/bin/env node
/**
 * test-select-replay.mjs -- replays past gate runs through the test selector (tools/test-select.mjs) and
 * counts the test failures it would have missed and the shard time it would have saved
 * (design/ci/fast-pipeline.md section 5.2; results in design/ci/test-selection-replay.md).
 *
 * Input: the push log (<main checkout>/tmp/push-log.jsonl), each push's gate log and the failed shards'
 * whole logs (tmp/push-gate-logs/), and optionally failures found by CI (--ci <file>, JSON lines of
 * `{ sha, base, source, failures: [{ package, file|null, what }] }`). For every push in the window whose
 * gate ran test shards it computes the change (from the push's base to the pushed commit), the selection,
 * and for every failing test file whether the selection would have run it.
 *
 * The selector's import graphs are built once, from the checkout the replay runs in (--graphs <file>
 * caches them), not from each pushed commit: building them per commit would take hours. A test file that
 * no longer exists is judged by its package alone and listed as such.
 *
 * Usage: node tools/test-select-replay.mjs [--since 2026-09-30] [--graphs <file>] [--ci <file>]
 *            [--out <file.json>]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildGraphs, estimate, loadRules, selectPackages, selectShards, testRefs } from "./test-select.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Drops each terminal color code: ESC, "[", digits and semicolons, "m".
const strip = (s) =>
    s
        .split("\u001b[")
        .map((part, i) => (i === 0 ? part : part.slice(part.indexOf("m") + 1)))
        .join("");
const git = (args) => {
    try {
        return execFileSync("git", args, {
            cwd: ROOT,
            encoding: "utf8",
            maxBuffer: 1 << 28,
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch {
        return null;
    }
};

/**
 * The shard lines of one gate log: which shards ran, passed, failed (with the failing test files),
 * were skipped as already passed, or were left to CI.
 * @param text the gate log
 * @returns `{ ran: [{ shard, ok, secs, kept }], skipped: [], leftToCi: [] }`
 */
export function parseGateLog(text) {
    const ran = [];
    const skipped = [];
    let leftToCi = [];
    const lines = strip(text).split("\n");
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const m = /^ {2}\[(PASS|FAIL)\] ([a-z0-9-]+) \((?:([^,)]*), )?(\d+)s\)/u.exec(l);
        if (m) {
            const entry = { shard: m[2], ok: m[1] === "PASS", secs: Number(m[4]), cause: m[3] ?? null };
            if (!entry.ok) {
                entry.tail = lines.slice(i + 1, i + 82).join("\n");
            }
            ran.push(entry);
            continue;
        }
        const kept = /^ {2}\[FAIL\] ([a-z0-9-]+): its whole log is kept in (\S+)/u.exec(l);
        if (kept) {
            const e = ran.findLast((r) => r.shard === kept[1]);
            if (e) {
                e.kept = kept[2];
            }
        }
        const skip = /^ {2}\[SKIP\] ([a-z0-9-]+):/u.exec(l);
        if (skip) {
            skipped.push(skip[1]);
        }
        if (l.startsWith("Left to CI")) {
            leftToCi = l
                .slice(l.indexOf(":") + 1)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        }
    }
    return { ran, skipped, leftToCi };
}

/**
 * The failing test files a vitest log names, relative to its package.
 * @param text a shard log or the end of one
 * @returns `{ files: string[], unhandled: boolean, summary: string|null }`
 */
export function failingFiles(text) {
    const files = new Set();
    let unhandled = false;
    for (const raw of strip(text).split("\n")) {
        const fail = /^\s*FAIL\s+(?:\|[^|]+\|\s+|[a-z-]+ \([a-z]+\)\s+|[a-z-]+\s{2,})?([^\s>]+\.[cm]?[jt]sx?)\b/u.exec(
            raw,
        );
        if (fail) {
            files.add(fail[1]);
            const story = / > (?:\.\.\/)+([^\s>]+\.stories\.[jt]sx?) > /u.exec(raw);
            if (story) {
                files.add(story[1]);
            }
        }
        const origin = /originated in "([^"]+)" test file/u.exec(raw);
        if (origin) {
            files.add(origin[1]);
        }
        if (/Unhandled Errors?|Unhandled Rejection/u.test(raw)) {
            unhandled = true;
        }
    }
    const summary = strip(text).match(/Test Files .*/u)?.[0] ?? null;
    return { files: [...files], unhandled, summary };
}

/**
 * A package directory for a shard name, old names included (graphty was one shard before 2026-10-21).
 * @param shard a shard name
 * @param SHARDS the CI test shards
 * @returns the package directory
 */
function packageOfShard(shard, SHARDS) {
    return SHARDS.find((s) => s.shard === shard)?.package ?? SHARDS.find((s) => shard.startsWith(s.package))?.package;
}

/**
 * The commit a push's change is measured from: for golden, the golden tip the previous successful push
 * left; otherwise (and when that is not an ancestor) the nearer of the merge bases with golden and
 * master as they were at the push.
 * @param entry a push log entry
 * @param goldenTips golden tips pushed, oldest first
 * @returns a commit id, or null
 */
function baseOf(entry, goldenTips) {
    const at = entry.startedAt ?? entry.at;
    const prev = goldenTips.filter((t) => t.at < at).at(-1);
    if (entry.branch === "golden" && prev && git(["merge-base", "--is-ancestor", prev.sha, entry.sha]) !== null) {
        return prev.sha;
    }
    const candidates = [prev?.sha, git(["rev-list", "-1", "--first-parent", `--before=${at}`, "origin/master"])]
        .filter(Boolean)
        .map((ref) => git(["merge-base", ref, entry.sha]))
        .filter(Boolean);
    const distance = (mb) => Number(git(["rev-list", "--count", `${mb}..${entry.sha}`]) ?? Infinity);
    return candidates.sort((a, b) => distance(a) - distance(b))[0] ?? null;
}

const changedBetween = (base, sha) => (git(["diff", "--name-only", base, sha]) ?? "").split("\n").filter(Boolean);

/**
 * Each push of the window with a gate log that ran or planned test shards.
 * @param main the main checkout
 * @param since the first day of the window (ISO date)
 * @returns push log entries with their parsed gate logs
 */
function pushes(main, since) {
    const log = readFileSync(join(main, "tmp/push-log.jsonl"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => {
            try {
                return JSON.parse(l);
            } catch {
                return null;
            }
        })
        .filter(Boolean);
    const goldenTips = log
        .filter((e) => e.branch === "golden" && e.exit === 0)
        .map((e) => ({ at: e.startedAt ?? e.at, sha: e.sha }));
    return log
        .filter((e) => (e.startedAt ?? e.at) >= since && e.gateLog && existsSync(e.gateLog))
        .map((e) => ({ ...e, gate: parseGateLog(readFileSync(e.gateLog, "utf8")), goldenTips }))
        .filter((e) => e.gate.ran.length > 0);
}

/**
 * One replayed push: the selection, each failing file and whether the selection ran it, and the time.
 * @param entry a push log entry
 * @param ctx shared state of the run
 * @returns a record for the report
 */
function replayOne(entry, ctx) {
    const base = baseOf(entry, entry.goldenTips);
    if (!base || git(["cat-file", "-e", `${entry.sha}^{commit}`]) === null) {
        return { sha: entry.sha, branch: entry.branch, at: entry.at, skipped: "commit or base not available" };
    }
    const changed = changedBetween(base, entry.sha);
    const sel = selectPackages({ changed, ...ctx.selectArgs });
    const shards = selectShards(ctx.SHARDS, sel.packages, ctx.graphs);
    const failures = [];
    for (const r of entry.gate.ran.filter((x) => !x.ok)) {
        const pkg = packageOfShard(r.shard, ctx.SHARDS);
        const text = r.kept && existsSync(r.kept) ? readFileSync(r.kept, "utf8") : (r.tail ?? "");
        const found = failingFiles(text);
        failures.push(...judge(pkg, r, found, sel.packages.get(pkg), ctx));
    }
    const seconds = new Map(entry.gate.ran.map((r) => [r.shard, r.secs]));
    return {
        sha: entry.sha,
        branch: entry.branch,
        at: entry.at,
        base,
        changed: changed.length,
        everything: sel.everything,
        modes: Object.fromEntries(
            [...sel.packages]
                .filter(([, p]) => p.mode !== "none")
                .map(([d, p]) => [d, { run: p.mode === "files" ? p.specs.size : "all", why: p.reasons[0] ?? null }]),
        ),
        time: timeOf(entry.gate.ran, shards, seconds, sel.packages, ctx),
        failures,
    };
}

/**
 * Whether the selection ran each failing file of one failed shard.
 * @param pkg the package directory
 * @param ran the shard's gate line (parseGateLog)
 * @param found failingFiles() of the shard's log
 * @param p the package's selection
 * @param ctx shared state of the run
 * @returns one record per failing file
 */
function judge(pkg, ran, found, p, ctx) {
    const mode = p?.mode ?? "all";
    const base = { shard: ran.shard, package: pkg, cause: ran.cause, summary: found.summary };
    if (found.files.length === 0) {
        // no test file named: a crash, a timeout of the whole shard, a coverage threshold
        return [{ ...base, file: null, selected: mode === "all", mode }];
    }
    return found.files.map((f) => {
        const file = `${pkg}/${f.replace(/^\.\.\/\.\.\//u, "")}`;
        const known = ctx.allSpecs.get(pkg)?.has(file) ?? false;
        const selected = mode === "all" || (mode === "files" && p.specs.has(file));
        return { ...base, file, selected, mode, known };
    });
}

/**
 * Shard seconds the gate spent, and what the selection would have spent on the same shards.
 * @param ran the shard's gate line (parseGateLog)
 * @param shards SHARDS entries
 * @param seconds Map of shard name to the seconds it took
 * @param packages Map of package name to directory
 * @param ctx shared state of the run
 * @returns `{ full, selected }` seconds
 */
function timeOf(ran, shards, seconds, packages, ctx) {
    const sel = ran.map((r) => {
        const own = shards.find((s) => s.shard === r.shard);
        if (own) {
            return own;
        }
        const p = packages.get(packageOfShard(r.shard, ctx.SHARDS));
        const total = ctx.allSpecs.get(packageOfShard(r.shard, ctx.SHARDS))?.size ?? null;
        return { shard: r.shard, mode: p?.mode ?? "all", files: [...(p?.specs ?? [])], total };
    });
    return estimate(sel, seconds);
}

async function main(argv) {
    const arg = (name, dflt) => {
        const i = argv.indexOf(name);
        return i === -1 ? dflt : argv[i + 1];
    };
    const main = dirname(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]));
    const { SHARDS } = await import(pathToFileURL(join(ROOT, "tools/ci-test-matrix.mjs")).href);
    const { projectGraph, pathRefs } = await import(pathToFileURL(join(ROOT, "tools/prepush-inputs.mjs")).href);
    const nx = projectGraph(ROOT);
    const packages = new Map([...nx.roots].filter(([, d]) => SHARDS.some((s) => s.package === d)));
    const cache = arg("--graphs");
    const graphs =
        cache && existsSync(cache)
            ? new Map(Object.entries(JSON.parse(readFileSync(cache, "utf8"))))
            : buildGraphs(ROOT, [...packages.values()], SHARDS);
    if (cache && !existsSync(cache)) {
        writeFileSync(cache, JSON.stringify(Object.fromEntries(graphs)));
    }
    const allSpecs = new Map(
        [...graphs].map(([d, gs]) => [
            d,
            new Set(gs.filter(Boolean).flatMap((g) => Object.values(g.projects).flatMap((p) => p.specs))),
        ]),
    );
    const ctx = {
        SHARDS,
        graphs,
        allSpecs,
        selectArgs: {
            packages,
            deps: nx.deps,
            refs: testRefs(ROOT, packages, graphs, pathRefs(ROOT, nx.roots)),
            graphs,
            rules: loadRules(ROOT),
        },
    };
    const records = pushes(main, arg("--since", "2026-09-30")).map((e) => replayOne(e, ctx));
    const ci = arg("--ci") ? readFileSync(arg("--ci"), "utf8").split("\n").filter(Boolean).map(JSON.parse) : [];
    for (const c of ci) {
        const changed = changedBetween(c.base, c.sha);
        const sel = selectPackages({ changed, ...ctx.selectArgs });
        const failures = c.failures.flatMap((f) =>
            judge(
                f.package,
                { shard: f.shard, cause: f.what },
                { files: f.file ? [f.file] : [], summary: f.what },
                sel.packages.get(f.package),
                ctx,
            ),
        );
        records.push({
            sha: c.sha,
            branch: c.source,
            at: c.at,
            base: c.base,
            changed: changed.length,
            everything: sel.everything,
            failures,
            ci: true,
        });
    }
    const out = arg("--out", join(main, "tmp/test-select-replay.json"));
    writeFileSync(out, JSON.stringify(records, null, 1));
    const fails = records.flatMap((r) => r.failures ?? []);
    console.log(
        `${records.length} gate runs and CI runs replayed; ${fails.length} failing test files or shards; ` +
            `${fails.filter((f) => !f.selected).length} not selected. Details: ${out}`,
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    await main(process.argv.slice(2));
}
