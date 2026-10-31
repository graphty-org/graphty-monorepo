#!/usr/bin/env node
/**
 * test-select-replay.mjs -- replays past gate runs through the test selector (tools/test-select.mjs) and
 * counts the test failures it would have missed and the shard time it would have saved
 * (design/ci/fast-pipeline.md section 5.2; results in design/ci/test-selection-replay.md).
 *
 * Input: the push log (<main checkout>/tmp/push-log.jsonl), each push's gate log and the failed shards'
 * whole logs (tmp/push-gate-logs/), the advisory records the gate wrote (tmp/test-select/advisory.jsonl),
 * and optionally failures found by CI (--ci <file>, JSON lines of
 * `{ sha, base, source, at, failures: [{ package, shard, file|null, what }] }`, which --collect-ci writes).
 * For every push in the window whose gate ran test shards it computes the change (from the push's base to
 * the pushed commit), the selection, and for every failing test file whether the selection would have run
 * it. Failures are judged on the file-level answer even where file-level selection is not yet allowed
 * (tools/test-select-rules.json "fileLevel"); the time is given both ways.
 *
 * Where the gate wrote an advisory record for a push, that record is used instead of a replay: it was
 * computed from that commit's own import graphs, and it names the failing test files even after the gate
 * logs are deleted (14 days). Otherwise the import graphs are built once, from the checkout the replay
 * runs in (--graphs <file> caches them), not from each pushed commit: building them per commit would take
 * hours. A test file that no longer exists is judged by its package alone and listed as such.
 *
 * Usage:
 *   node tools/test-select-replay.mjs [--since 2026-09-30] [--graphs <file>] [--ci <file>] [--out <file.json>]
 *   node tools/test-select-replay.mjs --collect-ci <file> [--since 2026-09-30]
 *       writes the --ci input: every failed ci.yml test job on the golden and golden-cut pull requests, with
 *       the test files its annotations name, from one GitHub GraphQL query
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
    buildGraphs,
    estimate,
    failingFiles,
    loadRules,
    measuredOf,
    repoPath,
    rootImportGraph,
    selectPackages,
    selectShards,
    strip,
    testRefs,
} from "./test-select.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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
    const prev = goldenTips.findLast((t) => t.at < at);
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
    const adv = ctx.advisory.get(entry.sha);
    if (adv) {
        return fromAdvisory(adv, entry);
    }
    const base = baseOf(entry, entry.goldenTips);
    if (!base || git(["cat-file", "-e", `${entry.sha}^{commit}`]) === null) {
        return { sha: entry.sha, branch: entry.branch, at: entry.at, skipped: "commit or base not available" };
    }
    const changed = changedBetween(base, entry.sha);
    const sel = selectPackages({ changed, ...ctx.selectArgs });
    const shards = selectShards(ctx.SHARDS, sel.packages, ctx.graphs, ctx.allowed, undefined, sel.smoke);
    const failures = [];
    for (const r of entry.gate.ran.filter((x) => !x.ok)) {
        const pkg = packageOfShard(r.shard, ctx.SHARDS);
        const text = r.kept && existsSync(r.kept) ? readFileSync(r.kept, "utf8") : (r.tail ?? "");
        failures.push(...judge(pkg, r, failingFiles(text), sel.packages.get(pkg), ctx));
    }
    const seconds = new Map(entry.gate.ran.map((r) => [r.shard, r.secs]));
    const ran = timedShards(entry.gate.ran, shards, sel.packages, ctx);
    return {
        sha: entry.sha,
        branch: entry.branch,
        at: entry.at,
        base,
        changed: changed.length,
        everything: sel.everything,
        unexplainedRoot: sel.unexplainedRoot,
        modes: Object.fromEntries(
            [...sel.packages]
                .filter(([, p]) => p.mode !== "none")
                .map(([d, p]) => [d, { run: p.mode === "files" ? p.specs.size : "all", why: p.reasons[0] ?? null }]),
        ),
        time: estimate(ran, seconds),
        measuredTime: estimate(measuredOf(ran), seconds),
        failures,
    };
}

/**
 * A record from the gate's own advisory record of a push: its selection was computed from that commit's
 * import graphs, and its failing files were read from the shard logs at the time.
 * @param adv an advisory.jsonl record
 * @param entry the push log entry, when there is one
 * @returns a record for the report
 */
function fromAdvisory(adv, entry) {
    const failures = [];
    for (const r of adv.results.filter((x) => !x.ok)) {
        const s = adv.selection.find((x) => x.shard === r.shard);
        const m = s?.measured ?? s ?? { mode: "all", files: [] };
        const chosen = new Set(m.files.map((f) => f.file));
        const files = r.failing?.length ? r.failing : [null];
        for (const file of files) {
            const selected = m.mode === "all" || (file !== null && chosen.has(file));
            failures.push({ shard: r.shard, package: s?.package, file, selected, mode: m.mode });
        }
    }
    return {
        sha: adv.sha,
        branch: entry?.branch ?? null,
        at: entry?.at ?? adv.at,
        base: adv.base,
        everything: adv.everything,
        unexplainedRoot: adv.unexplainedRoot,
        time: adv.time,
        measuredTime: adv.measuredTime,
        failures,
        advisory: true,
    };
}

/**
 * The advisory records the gate wrote, newest per pushed commit.
 * @param main the main checkout
 * @returns Map of commit to record
 */
function advisoryRecords(main) {
    const file = join(main, "tmp/test-select/advisory.jsonl");
    const records = new Map();
    if (!existsSync(file)) {
        return records;
    }
    for (const line of readFileSync(file, "utf8").split("\n").filter(Boolean)) {
        try {
            const r = JSON.parse(line);
            records.set(r.sha, r);
        } catch {
            // a line cut short by a killed gate
        }
    }
    return records;
}

/**
 * Whether the selection ran each failing file of one failed shard, judged on the file-level answer.
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
        const file = repoPath(pkg, f);
        const known = ctx.allSpecs.get(pkg)?.has(file) ?? false;
        const selected = mode === "all" || (mode === "files" && p.specs.has(file));
        return { ...base, file, selected, mode, known };
    });
}

/**
 * The selection of each shard the gate ran, including shards that no longer exist under that name.
 * @param ran the gate's shard lines (parseGateLog)
 * @param shards selectShards()
 * @param packages selectPackages().packages
 * @param ctx shared state of the run
 * @returns selectShards()-shaped entries
 */
function timedShards(ran, shards, packages, ctx) {
    return ran.map((r) => {
        const own = shards.find((s) => s.shard === r.shard);
        if (own) {
            return own;
        }
        const pkg = packageOfShard(r.shard, ctx.SHARDS);
        const p = packages.get(pkg);
        const total = ctx.allSpecs.get(pkg)?.size ?? null;
        const files = [...(p?.specs ?? [])];
        const measured = { mode: p?.mode ?? "all", files };
        return ctx.allowed.has(pkg)
            ? { shard: r.shard, ...measured, total }
            : { shard: r.shard, mode: "all", files: [], total, measured };
    });
}

/**
 * Writes the --ci input: every failed `Test (...)` job of ci.yml on the golden and golden-cut pull requests
 * since a day, with the test files its annotations name. One GraphQL query (the repository's GitHub API
 * budget: never one call per run).
 * @param out the JSON-lines file to write
 * @param since the first day (ISO date)
 * @param SHARDS the CI test shards
 * @returns the number of failed runs written
 */
function collectCi(out, since, SHARDS) {
    const heads = ["golden", "golden-cut"];
    const prs = heads
        .map(
            (
                h,
                i,
            ) => `p${i}: pullRequests(headRefName: "${h}", first: 8, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { baseRefOid commits(last: 10) { nodes { commit { oid checkSuites(first: 10, filterBy: {appId: 15368}) { nodes {
              workflowRun { createdAt workflow { name } }
              checkRuns(first: 15, filterBy: {conclusions: [FAILURE]}) { nodes { name
                annotations(first: 10) { nodes { path message annotationLevel } } } } } } } } } } }`,
        )
        .join("\n");
    const query = `{ repository(owner: "graphty-org", name: "graphty-monorepo") { ${prs} } }`;
    const res = JSON.parse(execFileSync("gh", ["api", "graphql", "-f", `query=${query}`], { encoding: "utf8" }));
    const dirs = [...new Set(SHARDS.map((s) => s.package))];
    const lines = [];
    heads.forEach((head, i) => {
        for (const pr of res.data.repository[`p${i}`].nodes) {
            for (const { commit } of pr.commits.nodes) {
                for (const suite of commit.checkSuites.nodes) {
                    const run = suite.workflowRun;
                    if (run?.workflow.name !== "CI" || run.createdAt < since) {
                        continue;
                    }
                    const failures = suite.checkRuns.nodes.flatMap((c) => ciFailures(c, SHARDS, dirs));
                    if (failures.length > 0) {
                        const base = git(["merge-base", pr.baseRefOid, commit.oid]) ?? pr.baseRefOid;
                        lines.push({ sha: commit.oid, base, source: `ci ${head}`, at: run.createdAt, failures });
                    }
                }
            }
        }
    });
    writeFileSync(out, lines.map((l) => JSON.stringify(l)).join("\n") + (lines.length > 0 ? "\n" : ""));
    return lines.length;
}

/**
 * The failures of one failed CI check run: a test file per annotation that names one, or the shard alone.
 * @param check `{ name, annotations }`
 * @param SHARDS the CI test shards
 * @param dirs the package directories
 * @returns `[{ package, shard, file|null, what }]`; empty for a check that is not a test job
 */
export function ciFailures(check, SHARDS, dirs) {
    const job = /^Test \((.+)\)$/u.exec(check.name)?.[1];
    if (!job) {
        return [];
    }
    const packageOf = (shard) => SHARDS.find((s) => s.shard === shard)?.package ?? null;
    const notes = check.annotations.nodes;
    const named = notes
        .filter((a) => a.annotationLevel === "FAILURE" && /\.(test|spec|stories)\.[cm]?[jt]sx?$/u.test(a.path ?? ""))
        .map((a) => {
            const pkg = dirs.find((d) => a.path.startsWith(`${d}/`)) ?? packageOf(job);
            const file = a.path.startsWith(`${pkg}/`) ? a.path.slice(pkg.length + 1) : a.path;
            return { package: pkg, shard: job, file, what: a.message.split("\n")[0] };
        })
        .filter((f) => f.package);
    if (named.length > 0) {
        return named;
    }
    // a group job names its failed shards ("failed: graph-io, layout"); a single shard's job is its own
    const listed = notes.map((a) => /^failed: (.+)$/u.exec(a.message)?.[1]).find(Boolean);
    const shards = listed ? listed.split(",").map((x) => x.trim()) : [job];
    return shards
        .filter((shard) => packageOf(shard))
        .map((shard) => ({ package: packageOf(shard), shard, file: null, what: "no failing test file annotated" }));
}

async function main(argv) {
    const arg = (name, dflt) => {
        const i = argv.indexOf(name);
        return i === -1 ? dflt : argv[i + 1];
    };
    const main = dirname(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]));
    const { SHARDS } = await import(pathToFileURL(join(ROOT, "tools/ci-test-matrix.mjs")).href);
    const since = arg("--since", "2026-09-30");
    if (arg("--collect-ci")) {
        const n = collectCi(arg("--collect-ci"), since, SHARDS);
        console.log(`${n} failed CI runs written to ${arg("--collect-ci")}`);
        return;
    }
    const { projectGraph, pathRefs } = await import(pathToFileURL(join(ROOT, "tools/prepush-inputs.mjs")).href);
    const nx = projectGraph(ROOT);
    const packages = new Map([...nx.roots].filter(([, d]) => SHARDS.some((s) => s.package === d)));
    const cache = arg("--graphs");
    const graphs =
        cache && existsSync(cache)
            ? new Map(Object.entries(JSON.parse(readFileSync(cache, "utf8"))))
            : await buildGraphs(ROOT, [...packages.values()], SHARDS);
    if (cache && !existsSync(cache)) {
        writeFileSync(cache, JSON.stringify(Object.fromEntries(graphs)));
    }
    const allSpecs = new Map(
        [...graphs].map(([d, gs]) => [
            d,
            new Set(gs.filter(Boolean).flatMap((g) => Object.values(g.projects).flatMap((p) => p.specs))),
        ]),
    );
    const rules = loadRules(ROOT);
    const ctx = {
        SHARDS,
        graphs,
        allSpecs,
        allowed: rules.fileLevel,
        advisory: advisoryRecords(main),
        selectArgs: {
            packages,
            deps: nx.deps,
            refs: testRefs(ROOT, packages, graphs, pathRefs(ROOT, nx.roots)),
            graphs,
            rules,
            rootImporters: rootImportGraph(ROOT, [...packages.values()]),
        },
    };
    const replayed = pushes(main, since);
    const records = replayed.map((e) => replayOne(e, ctx));
    const seen = new Set(replayed.map((e) => e.sha));
    for (const adv of ctx.advisory.values()) {
        if (!seen.has(adv.sha) && adv.at >= since) {
            records.push(fromAdvisory(adv, null));
        }
    }
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
    const sum = (key, part) => records.reduce((t, r) => t + (r[key]?.[part] ?? 0), 0);
    console.log(
        `${records.length} gate runs and CI runs replayed (${ctx.advisory.size} advisory records); ` +
            `${fails.length} failing test files or shards; ${fails.filter((f) => !f.selected).length} not selected. ` +
            `Shard seconds: ${sum("time", "full")} run, ${sum("time", "selected")} as allowed today, ` +
            `${sum("measuredTime", "selected")} with file-level selection everywhere. Details: ${out}`,
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    await main(process.argv.slice(2));
}
