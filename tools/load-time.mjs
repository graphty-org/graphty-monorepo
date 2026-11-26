#!/usr/bin/env node
/**
 * load-time.mjs -- how long the graphty app and graphty-element take to load, recorded and judged (issue #8018).
 *
 * Two benchmarks write the numbers, each through writeLoadTimes() below:
 *   graphty/bench/load-time.bench.test.ts                 the built app's landing page: usable, the hero graph's first
 *                                                         frame, and its first settled frame (`graph-frame-stable`)
 *   graphty-element/test/load/load-time.bench.test.ts     `<graphty-element>` connected to its first frame and to its
 *                                                         first settled frame, on a fixed generated graph
 * Each writes benchmarks/out/load-time-<part>.json at the repository root: one session
 * `{ date, machine, sha?, results: [{ group, name, medianMs, minMs, samplesMs }] }`, the shape
 * tools/results/post-benchmarks.mjs reads, so the health dashboard keeps the series (source `graphty-load`).
 *
 *   node tools/load-time.mjs --pair-app <dist> --pair-element <bundle> [--rounds 4] [--reference-commit <sha>]
 *       the paired judge (CI's Performance Benchmarks job): time a reference build (the job passes what nightly
 *       serves, and its commit) and the candidate (HEAD) on the same machine, alternating, and fail on a row the
 *       candidate is slower in
 *   node tools/load-time.mjs            print the out files against benchmarks/results/load-time.json, for trends
 *   node tools/load-time.mjs --record   and then append them to it as a session
 *
 * Why paired (issue #9876): GitHub's hosted runners that report the same CPU model differ in speed by up to about
 * x1.38 between sessions (the results file's 2026-11-17 and 2026-11-18 sessions on the Xeon Platinum 8573C), more
 * than THRESHOLD, so a baseline recorded on another day cannot tell a slower runner from slower code: a full run went
 * red on three rows that no merge had changed (#9855). Timing both builds in the same job, alternately, removes the
 * runner from the comparison, as webgpu-graph-algorithms/scripts/bench-ab.js does for the GPU.
 *
 * The paired run (--pair-app and --pair-element each pair one benchmark; give one or both):
 *   - R rounds (--rounds, default 4); each round runs every paired benchmark once per build, the reference first in
 *     even rounds and the candidate first in odd ones (ABBA), so a drift that is linear in time cancels;
 *   - both builds run under the candidate's benchmark files (the reference build only supplies the page through
 *     LOAD_TIME_APP_DIST or LOAD_TIME_ELEMENT_BUNDLE), so both are timed by the same instrument;
 *   - each side's samples of every round are pooled into one row (median and minimum of all of them);
 *   - a REGRESSION needs the candidate's median AND minimum above THRESHOLD x the reference's, and both to have risen
 *     by at least FLOOR_MS: interference only ever slows a sample, so a minimum that held means the cost held. These
 *     are the rules of webgpu-graph-algorithms/scripts/bench-compare.js; bench-ab.js's interval over per-round
 *     minima is not used, because a round here is one benchmark run and its noise is what the pooled median and
 *     minimum already absorb;
 *   - the candidate's pooled rows are written to benchmarks/out/load-time-<part>.json, which the dashboard posts.
 *
 * Accepting a slowdown (the owner only; never to quiet a red row nobody has explained): a change that makes loading
 * slower on purpose would fail every full run until nightly, the reference, holds it, and nightly moves only on a
 * green run. The owner records it in benchmarks/load-time-accepted.json, an owner-only file:
 *   [{ "row": "app/graph settled", "commit": "<sha of the change or its merge>", "ratio": 1.3,
 *      "reason": "why the cost is worth it",
 *      "approval": "https://github.com/graphty-org/graphty-monorepo/issues/<N>#issuecomment-<id>" }]
 * An entry counts only with its proof (issue #10077): `approval` is a comment on an issue or pull request of this
 * repository, written by the owner (OWNER_LOGIN) and naming the row. The check reads each comment from the GitHub API
 * (GH_TOKEN or GITHUB_TOKEN) on every run; an entry without one, or whose comment fails, is ignored with a message,
 * and an API error fails the run. Agents post as graphty-agent, so they cannot accept their own slowdown.
 * A REGRESSION on that row is then "accepted" (and printed with the reason) while the candidate contains the commit
 * and the reference does not, and the candidate is within THRESHOLD (and FLOOR_MS) of the reference x ratio: a
 * further slowdown on top of the accepted one still fails. Once nightly holds the commit the entry stops applying by
 * itself, and can be deleted. Needs the git history of both commits (the job fetches it when the file lists any).
 *
 * The history (benchmarks/results/load-time.json) is printed after the paired verdict, against the best median and
 * best minimum every session of the same CPU model recorded, for trends only: it never fails a run.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT_DIR = join(REPO, "benchmarks/out");
export const RESULTS_FILE = join(REPO, "benchmarks/results/load-time.json");
/** The owner's accepted slowdowns (see the header); an owner-only file. */
export const ACCEPTED_FILE = join(REPO, "benchmarks/load-time-accepted.json");

/** The repository owner, the only login whose comment approves an accepted slowdown (as in .github/workflows/pr-title.yml). */
export const OWNER_LOGIN = "apowers313";
const APPROVAL_URL = /^https:\/\/github\.com\/graphty-org\/graphty-monorepo\/(?:issues|pull)\/\d+#issuecomment-(\d+)$/;

/**
 * The accepted entries the owner approved: each needs `approval`, the URL of a comment of this repository whose author
 * is OWNER_LOGIN and whose body names the entry's row. The rest are dropped, each with the reason.
 * @param entries - benchmarks/load-time-accepted.json
 * @param fetchComment - async (id) => the comment as the GitHub API returns it (`{ user: { login }, body }`); throws
 *   on an API error, which fails the run rather than accept or drop in silence
 * @returns the approved entries and one message per dropped entry
 */
export async function approvedEntries(entries, fetchComment) {
    const approved = [];
    const rejected = [];
    for (const e of entries) {
        const why = (reason) => rejected.push(`ignored ${JSON.stringify(e.row)} (commit ${e.commit}): ${reason}`);
        const id = APPROVAL_URL.exec(e.approval ?? "")?.[1];
        if (!id) {
            why("approval must be the URL of the owner's issue or pull request comment in this repository");
            continue;
        }
        const comment = await fetchComment(id);
        if (comment.user?.login !== OWNER_LOGIN) why(`${e.approval} is by ${comment.user?.login}, not ${OWNER_LOGIN}`);
        else if (!comment.body?.includes(e.row)) why(`${e.approval} does not name the row ${JSON.stringify(e.row)}`);
        else approved.push(e);
    }
    return { approved, rejected };
}

/**
 * One issue comment from the GitHub API.
 * @param id - the comment id
 * @returns the comment
 */
export async function fetchIssueComment(id) {
    const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GH_TOKEN or GITHUB_TOKEN is needed to check the accepted slowdowns' approvals");
    const res = await fetch(`https://api.github.com/repos/graphty-org/graphty-monorepo/issues/comments/${id}`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub API: comment ${id}: ${res.status} ${await res.text()}`);
    return res.json();
}

/**
 * The factor a median and a minimum must both exceed. Measured on the i9-14900KF under the load of other sessions'
 * test runs (2026-11-14): between the three baseline sessions of benchmarks/results/load-time.json the widest
 * move of a row was x1.10 on its median (element first frame, whose minimum held at x1.00), and the widest move in
 * both at once x1.04; between master and master one and three days earlier, interleaved 15-run medians moved at
 * most x1.05 in both. 1.2 stands clear of those, and catches a page that takes a fifth longer to show or to settle,
 * well short of a slowdown a reader notices by eye.
 */
export const THRESHOLD = 1.2;
/**
 * The rise in milliseconds a median and a minimum must both clear: below it a move is a frame or two of the renderer,
 * not a cost. Two 60 Hz frames.
 */
export const FLOOR_MS = 33;

/**
 * The machine a measurement ran on.
 * @returns the CPU model, as tools/results/client.mjs names it to the dashboard
 */
export const machine = () => cpus()[0]?.model.trim() ?? "unknown";

/**
 * One row from repeated samples.
 * @param group - the benchmark's group (`app`, `element`)
 * @param name - what was timed
 * @param samplesMs - one sample per run
 * @returns the row
 */
export function summarize(group, name, samplesMs) {
    const sorted = [...samplesMs].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    const medianMs = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const round = (v) => Math.round(v * 10) / 10;
    return { group, name, medianMs: round(medianMs), minMs: round(sorted[0]), samplesMs: samplesMs.map(round) };
}

/**
 * Write one benchmark's session to benchmarks/out/load-time-<part>.json, replacing the last one.
 * @param part - `app` or `element`
 * @param results - the rows
 * @returns the file written
 */
export function writeLoadTimes(part, results) {
    mkdirSync(OUT_DIR, { recursive: true });
    const file = join(OUT_DIR, `load-time-${part}.json`);
    const sha = process.env.GITHUB_SHA;
    const session = { date: new Date().toISOString(), machine: machine(), ...(sha ? { sha } : {}), results };
    writeFileSync(file, `${JSON.stringify(session, null, 1)}\n`);
    return file;
}

/**
 * The status of a row against its pinned baseline (bench-compare.js's rowStatus with this file's constants).
 * @param r - the current row
 * @param base - the pinned row
 * @returns the status
 */
export function rowStatus(r, base) {
    if (!base) return "new";
    if (r.medianMs <= THRESHOLD * base.medianMs) return "ok";
    if (r.minMs <= THRESHOLD * base.minMs) return "noisy";
    if (r.medianMs - base.medianMs < FLOOR_MS || r.minMs - base.minMs < FLOOR_MS) return "too small";
    return "REGRESSION";
}

/**
 * The best median and best minimum per row over every session of one machine.
 * @param sessions - the baseline sessions
 * @param on - the machine
 * @returns the pinned rows, by `group/name`
 */
export function pinned(sessions, on) {
    const rows = new Map();
    for (const s of sessions.filter((each) => each.machine === on))
        for (const r of s.results) {
            const key = `${r.group}/${r.name}`;
            const best = rows.get(key);
            rows.set(
                key,
                best
                    ? { medianMs: Math.min(best.medianMs, r.medianMs), minMs: Math.min(best.minMs, r.minMs) }
                    : { medianMs: r.medianMs, minMs: r.minMs },
            );
        }
    return rows;
}

/**
 * The owner's accepted slowdowns that apply to this pair: those whose commit the candidate contains and the reference
 * does not yet (once nightly holds the commit, the reference carries the cost and the entry no longer applies).
 * @param entries - benchmarks/load-time-accepted.json: `[{ row, commit, ratio, reason }]`
 * @param has - has.candidate(commit) and has.reference(commit): whether that build contains the commit
 * @returns the applying entries, by row (the largest ratio when a row has several)
 */
export function acceptedRows(entries, has) {
    const rows = new Map();
    for (const e of entries) {
        const badRatio = !Number.isFinite(e.ratio) || e.ratio < 1;
        if (typeof e.row !== "string" || !/^[0-9a-f]{7,40}$/.test(e.commit ?? "") || badRatio || !e.reason)
            throw new Error(
                `${ACCEPTED_FILE}: an entry needs row, commit (a sha), ratio (>= 1) and reason: ${JSON.stringify(e)}`,
            );
        if (has.candidate(e.commit) && !has.reference(e.commit) && (rows.get(e.row)?.ratio ?? 0) < e.ratio)
            rows.set(e.row, e);
    }
    return rows;
}

/**
 * rowStatus, with an accepted slowdown: a REGRESSION that is not one against the baseline x the accepted ratio is
 * "accepted".
 * @param r - the current row
 * @param base - the baseline row
 * @param accepted - the row's applying acceptance, if any
 * @returns the status
 */
function acceptedStatus(r, base, accepted) {
    const status = rowStatus(r, base);
    if (status !== "REGRESSION" || !accepted) return status;
    const scaled = { medianMs: base.medianMs * accepted.ratio, minMs: base.minMs * accepted.ratio };
    return rowStatus(r, scaled) === "REGRESSION" ? status : "accepted";
}

/**
 * Judge sessions against the baseline file's sessions.
 * @param current - the out files' sessions
 * @param baseline - the results file's sessions
 * @param accepted - accepted slowdowns by row (acceptedRows): a REGRESSION within THRESHOLD of the baseline scaled by
 *   its ratio is "accepted"
 * @returns a table and the count of regressions
 */
export function judge(current, baseline, accepted = new Map()) {
    const lines = [];
    let regressions = 0;
    for (const s of current) {
        const base = pinned(baseline, s.machine);
        const known = base.size ? "baseline of " + base.size + " rows" : "no baseline for this machine";
        lines.push(`${s.machine}: ${known}`);
        for (const r of s.results) {
            const b = base.get(`${r.group}/${r.name}`);
            const a = accepted.get(`${r.group}/${r.name}`);
            const status = acceptedStatus(r, b, a);
            if (status === "REGRESSION") regressions++;
            const ratio = (now, then) => (then ? `x${(now / then).toFixed(2)}` : "");
            lines.push(
                [
                    status.padEnd(11),
                    `${r.group}/${r.name}`.padEnd(40),
                    `${r.medianMs.toFixed(0)} ms`.padStart(9),
                    (b ? `${b.medianMs.toFixed(0)} ms` : "-").padStart(9),
                    ratio(r.medianMs, b?.medianMs).padStart(7),
                    ratio(r.minMs, b?.minMs).padStart(7),
                ].join(" "),
            );
            if (status === "accepted")
                lines.push(
                    `            accepted by the owner up to x${a.ratio} since ${a.commit.slice(0, 10)}: ${a.reason}`,
                );
        }
    }
    return { lines, regressions };
}

/**
 * Pool one side's rounds into one row per benchmark: every round's samples, summarized together.
 * @param sessions - that side's sessions, one per round
 * @returns the pooled rows, in first-seen order
 */
export function pool(sessions) {
    const rows = new Map();
    for (const s of sessions)
        for (const r of s.results) {
            const key = `${r.group}/${r.name}`;
            const row = rows.get(key) ?? { group: r.group, name: r.name, samplesMs: [] };
            row.samplesMs.push(...r.samplesMs);
            rows.set(key, row);
        }
    return [...rows.values()].map((r) => summarize(r.group, r.name, r.samplesMs));
}

/**
 * Which build runs first in a round: the reference in even rounds, the candidate in odd ones (ABBA).
 * @param round - the round, from 0
 * @returns the two sides in running order
 */
export const roundOrder = (round) => (round % 2 === 0 ? ["base", "candidate"] : ["candidate", "base"]);

/** The paired benchmarks: where each runs, its command, and the variable that points it at the reference build. */
const PARTS = {
    element: {
        cwd: join(REPO, "graphty-element"),
        args: ["exec", "vitest", "run", "--project=bench", "test/load/load-time.bench.test.ts"],
        variable: "LOAD_TIME_ELEMENT_BUNDLE",
    },
    app: {
        cwd: join(REPO, "graphty"),
        args: ["exec", "vitest", "run", "--project=bench"],
        variable: "LOAD_TIME_APP_DIST",
    },
};

/**
 * Run the paired benchmarks in ABBA rounds.
 * @param pair - the reference build per part (`app`: a built app directory, `element`: a script-tag bundle)
 * @param rounds - how many rounds
 * @returns per side, the sessions of every round, by part
 */
function measurePairs(pair, rounds) {
    const out = { base: {}, candidate: {} };
    for (let round = 0; round < rounds; round++)
        for (const [part, reference] of Object.entries(pair))
            for (const side of roundOrder(round)) {
                const { cwd, args, variable } = PARTS[part];
                const env = { ...process.env };
                delete env[variable];
                if (side === "base") env[variable] = resolve(reference);
                const file = join(OUT_DIR, `load-time-${part}.json`);
                rmSync(file, { force: true });
                console.log(`round ${round + 1}/${rounds}: ${part}, ${side}`);
                const run = spawnSync("pnpm", args, { cwd, env, stdio: ["ignore", "ignore", "inherit"] });
                if (run.status !== 0 || !existsSync(file))
                    throw new Error(`${part} benchmark of the ${side} build failed (exit ${run.status ?? run.signal})`);
                out[side][part] = [...(out[side][part] ?? []), JSON.parse(readFileSync(file, "utf8"))];
            }
    return out;
}

const HEADER = `status      row${" ".repeat(38)}median  baseline  median    min`;

/**
 * Whether a commit is in a build's history (git merge-base --is-ancestor). Throws when git cannot tell (a shallow
 * clone without the commit), so an acceptance is never skipped in silence.
 * @param commit - the accepted commit
 * @param rev - the build's commit
 * @returns true when rev contains commit
 */
function contains(commit, rev) {
    const r = spawnSync("git", ["merge-base", "--is-ancestor", commit, rev], { cwd: REPO, encoding: "utf8" });
    if (r.status === 0 || r.status === 1) return r.status === 0;
    throw new Error(`git cannot tell whether ${rev} contains ${commit} (fetch the history): ${r.stderr.trim()}`);
}

/**
 * The owner's approved, applying accepted slowdowns for this pair, each dropped entry reported.
 * @param reference - the reference build's commit, if known
 * @returns acceptedRows of the approved entries
 */
async function loadAccepted(reference) {
    const listed = existsSync(ACCEPTED_FILE) ? JSON.parse(readFileSync(ACCEPTED_FILE, "utf8")) : [];
    const { approved, rejected } = await approvedEntries(listed, fetchIssueComment);
    for (const r of rejected) console.error(`${ACCEPTED_FILE}: ${r}`);
    return acceptedRows(approved, {
        candidate: (c) => contains(c, "HEAD"),
        reference: (c) => (reference ? contains(c, reference) : false),
    });
}

async function main(argv) {
    const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
    const pair = Object.fromEntries(
        Object.entries({ app: option("--pair-app"), element: option("--pair-element") }).filter(([, v]) => v),
    );
    let regressions = 0;
    if (Object.keys(pair).length) {
        const rounds = Number(option("--rounds") ?? 4);
        // read before measuring, so a malformed entry or a missing history fails in seconds, not after the rounds
        const reference = option("--reference-commit");
        const accepted = await loadAccepted(reference);
        const sides = measurePairs(pair, rounds);
        const session = (side, part) => ({ machine: machine(), results: pool(sides[side][part]) });
        const parts = Object.keys(pair);
        for (const part of parts) writeLoadTimes(part, session("candidate", part).results);
        const verdict = judge(
            parts.map((p) => session("candidate", p)),
            parts.map((p) => session("base", p)),
            accepted,
        );
        console.log(
            `\npaired: the candidate against the reference build, ${rounds} ABBA rounds (baseline = reference)`,
        );
        console.log(HEADER);
        for (const l of verdict.lines) console.log(l);
        regressions = verdict.regressions;
    }
    const files = existsSync(OUT_DIR)
        ? readdirSync(OUT_DIR)
              .filter((f) => /^load-time-.+\.json$/.test(f))
              .map((f) => join(OUT_DIR, f))
        : [];
    if (!files.length) {
        console.log("nothing to compare: no benchmarks/out/load-time-*.json (the load-time benchmarks wrote nothing)");
        return regressions ? 1 : 0;
    }
    const current = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
    const history = existsSync(RESULTS_FILE) ? JSON.parse(readFileSync(RESULTS_FILE, "utf8")) : [];
    console.log("\nagainst the history of this CPU model, for trends only (never fails: runners of one model differ)");
    console.log(HEADER);
    for (const l of judge(current, history).lines) console.log(l);
    if (argv.includes("--record")) {
        writeFileSync(RESULTS_FILE, `${JSON.stringify([...history, ...current], null, 1)}\n`);
        console.log(`recorded ${current.length} session(s) in ${RESULTS_FILE}`);
    }
    if (regressions) {
        console.error(
            `\n${regressions} load-time regression(s): median and minimum both above x${THRESHOLD} and ${FLOOR_MS} ms over ` +
                "the reference build timed on the same machine. Find the change that slowed them and fix it; a cost the " +
                "owner accepts goes in benchmarks/load-time-accepted.json (tools/load-time.mjs says how).",
        );
        return 1;
    }
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        process.exitCode = await main(process.argv.slice(2));
    } catch (e) {
        console.error(`load-time: ${e instanceof Error ? e.message : String(e)}`);
        process.exitCode = 1;
    }
}
