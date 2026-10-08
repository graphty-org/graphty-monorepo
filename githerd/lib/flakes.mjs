/**
 * Flaky tests (design section 4.12, the owner's design of 2026-10-06): evidence only from runs that
 * happen anyway, one GitHub issue per flaky test, and containment only by classification and one
 * master re-run.
 *
 * - **Occurrences.** Every failed job log githerd reads (a red master job it classifies, a failed
 *   `Test (...)` job on a pull request or a merge-queue batch) is scanned for Vitest's `FAIL <file> >
 *   <test>` lines. Each failing test gets one occurrence per job: run, attempt, job, commit, where it
 *   ran (`master`, `pr` or `queue`), the pull request, and whether the change touched the test's
 *   package (its directory, a workspace package it depends on, or a repository-wide file).
 * - **Proof**, never from a run githerd starts for the purpose: (1) the same job passes on the same
 *   commit (a later attempt, anyone's re-run); (2) a merge-queue batch holding the pull request's
 *   failing head passes the job; (3) on master, the job's lane passes at the next commit and no
 *   commit between touched the package; (4) the test failed on two or more pull requests whose
 *   changes do not touch its package.
 * - **The local pre-push gate** counts too (prepush.mjs reads the push queue's log): a failing test
 *   in a push's gate output is an occurrence (`where: "push"`, its branch), a push that passed the
 *   gate is a pass of the same commit (proof 1), and failing in the gates of two or more branches
 *   whose changes do not touch the test's package is proof (4).
 * - **Issues.** A proven test gets one issue (labels `bug`, `intermittent`, a priority and
 *   `effort:medium`), found again by its marker line; later occurrences are appended, and a closed
 *   one is reopened with them. Priority is raised, never lowered: critical once it failed on master
 *   or a merge batch, high once it failed on two or more pull requests, medium otherwise. Write
 *   group `owner-items`: the issue is the owner's work item, filed with his account, so the issue
 *   queue offers it like any other.
 * - **Containment.** While its issue is open, a known flaky test failing on a pull request is
 *   classified `intermittent` (classify.mjs), not the pull request's. On master, a red job whose
 *   every failing test is a known flake, or lives in a package the red range did not touch, is
 *   re-run once (that job only, write group `worker-writes`) before anything moves toward a revert,
 *   and the incident points at the issue. Never the GPU lane: its failures only record occurrences.
 *
 * Counts are runs, never time.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { advisoryFailure, utcDay } from "./advisory.mjs";
import { classify } from "./classify.mjs";
import { notSent } from "./github.mjs";
import { isSummaryJob } from "./lanes.mjs";
import { isMergeQueuePr } from "./merge-status.mjs";
import { firstParent } from "./master.mjs";

/** The line that ties an issue to its test. */
export const MARKER = "githerd-flaky-test: ";
/** The write group of the issues. */
const GROUP = "owner-items";
/** The write group of the master re-run, the one githerd's re-runs for workers go through. */
const RERUN_GROUP = "worker-writes";
const PRIORITIES = ["priority:critical", "priority:high", "priority:medium", "priority:low"];
const LABELS = ["bug", "intermittent", "effort:medium"];
/** Lanes whose failures are only recorded, never re-run (the rented T4). */
const NO_RERUN = new Set(["gpu", "GPU"]);
/** Workflows whose tests all live in one package. */
const WORKFLOW_PACKAGE = { GPU: "webgpu-graph-algorithms", Hosts: "webgpu-graph-algorithms" };
/** Paths no test reads. */
const UNREAD = /(?:^(?:design|docs|\.claude)\/)|(?:\.md$)/;
/** How many read job ids are remembered. */
const JOBS_KEPT = 2000;
/** The longest log line quoted. */
const LINE_MAX = 300;
/** The job name a local pre-push gate's occurrences and passes carry. */
const GATE_JOB = "pre-push gate";

/**
 * Whether a job is a test job, whose failing tests this tracker reads and owns (shared.mjs leaves
 * them to it).
 * @param {string} name the job's name
 * @returns {boolean} true for `Test (...)`
 */
export const isTestJob = (name) => /^Test\b/.test(name);

const ANSI = new RegExp(String.raw`${String.fromCodePoint(27)}\[[0-9;]*m`, "g");
const STAMP = /^\uFEFF?\d{4}-\d\d-\d\dT[\d:.]+Z ?/;
const PATH = /(?:^|\s)((?:[\w@.-]+\/)*[\w@.-]+\.[cm]?[jt]sx?)(?=\s|$)/;
const SECTION = /^==> (\S+)/;

/**
 * @typedef {{packages: string[], deps: Record<string, string[]>}} Workspace the workspace's package
 *   directories, and the workspace packages each depends on, transitively
 * @typedef {{id: string, package: string | null, file: string, name: string, line: string}} FailedTest
 * @typedef {{runId: number | null, attempt: number | null, job: string, jobId: number | string, sha: string,
 *   where: "master" | "pr" | "queue" | "push", pr: number | null, touched: boolean | null, lane?: string | null,
 *   branch?: string | null, line?: string, at: string}} Occurrence
 * @typedef {{kind: string, text: string}} Proof
 * @typedef {{id: string, package: string | null, file: string, name: string, occurrences: Occurrence[],
 *   proofs: Proof[], issue: number | null, reported: number, proofsReported: number}} Test
 * @typedef {{tests: Record<string, Test>, jobs: Record<string, string>, ranges: Record<string, string[] | null>,
 *   wouldDo: Record<string, string>}} Store `state.flakes`
 * @typedef {{sha: string, job: string, where: string, runId?: number | null, lane?: string,
 *   contains?: number[]}} Pass a job that passed: `job` `*` is a whole master lane run
 */

/**
 * The flake record in the daemon state, made on first use.
 * @param {any} state the daemon state
 * @returns {Store} `state.flakes`
 */
export function flakeStore(state) {
    const s = (state.flakes ??= {});
    s.tests ??= {};
    s.jobs ??= {};
    s.ranges ??= {};
    s.wouldDo ??= {};
    return s;
}

/**
 * The workspace packages and their dependencies, read from `pnpm-workspace.yaml` and each
 * package's `package.json` (the edges nx's project graph is made from). Unreadable: none.
 * @param {string} root the checkout
 * @returns {Workspace} the packages
 */
export function readWorkspace(root) {
    /** @type {string[]} */
    const packages = [];
    try {
        let inList = false;
        for (const line of readFileSync(join(root, "pnpm-workspace.yaml"), "utf8").split("\n")) {
            if (line.startsWith("packages:")) inList = true;
            else if (inList && /^\s+-\s/.test(line))
                packages.push(line.replace(/^\s+-\s+/, "").replaceAll(/["']/g, ""));
            else if (inList && /^\S/.test(line)) inList = false;
        }
    } catch {
        return { packages: [], deps: {} };
    }
    /** @type {Record<string, string>} */
    const byName = {};
    /** @type {Record<string, string[]>} */
    const direct = {};
    for (const dir of packages) {
        try {
            const pkg = JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));
            byName[pkg.name] = dir;
            direct[dir] = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
        } catch {
            direct[dir] = [];
        }
    }
    /** @type {Record<string, string[]>} */
    const deps = {};
    for (const dir of packages) {
        const seen = new Set();
        const walk = (/** @type {string} */ d) => {
            for (const n of direct[d] ?? []) {
                const to = byName[n];
                if (to && to !== dir && !seen.has(to)) {
                    seen.add(to);
                    walk(to);
                }
            }
        };
        walk(dir);
        deps[dir] = [...seen].sort((a, b) => a.localeCompare(b));
    }
    return { packages, deps };
}

/**
 * The workspace package a name starts with (`graphty-element-browser-1` -> `graphty-element`).
 * @param {string | undefined} name a shard or section name
 * @param {string[]} packages the package directories
 * @returns {string | null} the longest match
 */
function packageIn(name, packages) {
    if (!name) return null;
    const hits = packages.filter((p) => name === p || name.startsWith(`${p}-`));
    return hits.reduce((/** @type {string | null} */ best, p) => (best && best.length >= p.length ? best : p), null);
}

/**
 * The failing tests a job log names: Vitest's `FAIL [project] <file> [> suite] > <test>` lines
 * (a file that failed to load has no test name). Its package is the file's first directory when
 * that is a package, else the `==> <name>` section a combined shard printed before it, else the
 * job's `Test (<shard>)` name, else the workflow's one package.
 * @param {string | null} log the log, raw from the API or as `gh run view --log` prints it
 * @param {{job: string, workflow?: string, packages: string[]}} where the job's name, its workflow
 *   and the workspace's packages
 * @returns {FailedTest[]} each failing test once
 */
export function failingTests(log, { job, workflow = "", packages }) {
    if (!log) return [];
    /** @type {Map<string, FailedTest>} */
    const out = new Map();
    /** @type {string | undefined} */
    let section;
    const shard = job.includes("(") ? job.slice(job.indexOf("(") + 1, job.lastIndexOf(")")) : undefined;
    for (const raw of log.split("\n")) {
        const text = raw
            .replaceAll(ANSI, "")
            .replace(/^[^\t]*\t[^\t]*\t/, "")
            .replace(STAMP, "")
            .trim();
        section = SECTION.exec(text)?.[1] ?? section;
        const fail = failLine(text);
        if (!fail) continue;
        const top = fail.file.split("/")[0];
        const pkg = packages.includes(top)
            ? top
            : (packageIn(section, packages) ?? packageIn(shard, packages) ?? workflowPackage(workflow));
        const rel = pkg && top !== pkg ? `${pkg}/${fail.file}` : fail.file;
        const id = `${rel} > ${fail.name}`;
        if (!out.has(id)) out.set(id, { id, package: pkg, file: rel, name: fail.name, line: text.slice(0, LINE_MAX) });
    }
    return [...out.values()];
}

/**
 * The one package of a workflow whose tests all live in one.
 * @param {string} workflow the workflow's name
 * @returns {string | null} the package
 */
function workflowPackage(workflow) {
    return WORKFLOW_PACKAGE[/** @type {keyof typeof WORKFLOW_PACKAGE} */ (workflow)] ?? null;
}

/**
 * The file and test of one `FAIL` line, without its project label or its trailing `[ file ]`.
 * @param {string} text the line, trimmed
 * @returns {{file: string, name: string} | null} the file and test, or null for any other line
 */
function failLine(text) {
    if (!text.startsWith("FAIL ")) return null;
    let rest = text.slice(5).trim();
    const path = PATH.exec(rest);
    if (!path) return null;
    rest = rest.slice(path.index + path[0].length).trim();
    if (rest.endsWith("]") && rest.includes("[")) rest = rest.slice(0, rest.lastIndexOf("[")).trim();
    return { file: path[1], name: rest.startsWith(">") ? rest.slice(1).trim() : "(the whole file)" };
}

/**
 * Whether a change touches a package: a file in it or in a workspace package it depends on, or a
 * repository-wide file (root configuration, tools, CI). Documents touch nothing.
 * @param {string[] | null | undefined} files the changed paths; null when unknown
 * @param {string | null} pkg the package
 * @param {Workspace} ws the workspace
 * @returns {boolean | null} the answer; null when the files or the package are unknown
 */
export function touchesPackage(files, pkg, ws) {
    if (!Array.isArray(files) || !pkg) return null;
    const reach = new Set([pkg, ...(ws.deps[pkg] ?? [])]);
    return files.some((f) => {
        if (UNREAD.test(f)) return false;
        const top = f.split("/")[0];
        return ws.packages.includes(top) ? reach.has(top) : true;
    });
}

/**
 * A test's record, made on first sight.
 * @param {Store} store the record
 * @param {FailedTest} t the test
 * @returns {Test} its record
 */
function testRecord(store, t) {
    store.tests[t.id] ??= {
        id: t.id,
        package: t.package,
        file: t.file,
        name: t.name,
        occurrences: [],
        proofs: [],
        issue: null,
        reported: 0,
        proofsReported: 0,
    };
    return store.tests[t.id];
}

/**
 * Whether a push changes a package directly: a file in it or in a workspace package it depends on.
 * Unlike `touchesPackage`, repository-wide files (the lockfile, tools, root configuration) do not
 * count: the local pre-push gate runs only the affected packages' tests, so every test it runs is
 * reachable from the change, and the question is whether the change is in the test's own code.
 * @param {string[] | null | undefined} changed the changed paths or top-level directories (`graph-io/`)
 * @param {string | null} pkg the package
 * @param {Workspace} ws the workspace
 * @returns {boolean | null} the answer; null when the paths or the package are unknown
 */
export function changesPackage(changed, pkg, ws) {
    if (!Array.isArray(changed) || !pkg) return null;
    const reach = new Set([pkg, ...(ws.deps[pkg] ?? [])]);
    return changed.some((f) => reach.has(f.split("/")[0]));
}

/**
 * Records one job's failing tests, once per job.
 * @param {Store} store the record
 * @param {FailedTest[]} tests the job's failing tests
 * @param {Omit<Occurrence, "line" | "touched"> & {files?: string[] | null}} occ the run, with the
 *   change's files when known
 * @param {Workspace} ws the workspace
 * @returns {string[]} the tests' ids
 */
function recordTests(store, tests, occ, ws) {
    const { files, ...where } = occ;
    store.jobs[String(occ.jobId)] = occ.at;
    const ids = Object.keys(store.jobs);
    for (const old of ids.slice(0, Math.max(0, ids.length - JOBS_KEPT))) delete store.jobs[old];
    for (const t of tests) {
        const rec = testRecord(store, t);
        if (rec.occurrences.some((o) => o.jobId === occ.jobId)) continue;
        rec.occurrences.push({ ...where, touched: touchesPackage(files, t.package, ws), line: t.line });
    }
    return tests.map((t) => t.id);
}

/**
 * Adds a proof unless the same one is there.
 * @param {Test} t the test
 * @param {string} kind the proof's kind
 * @param {string} text what shows it
 */
function prove(t, kind, text) {
    if (!t.proofs.some((p) => p.kind === kind && p.text === text)) t.proofs.push({ kind, text });
}

const short = (/** @type {string} */ sha) => sha.slice(0, 9);

/**
 * Records the failing tests of the local pre-push gates (prepush.mjs reads them from the push
 * queue's log), each push once, and answers the pushes that passed the gate as passes of their
 * commit (proof 1).
 * @param {Store} store the record
 * @param {{key: string, at: string, branch: string | null, sha: string | null, exit: number,
 *   changed: string[] | null, gate: {tests: FailedTest[]} | null}[]} pushes the pushes
 * @param {Workspace} ws the workspace
 * @returns {Pass[]} the passes
 */
function notePushes(store, pushes, ws) {
    /** @type {Pass[]} */
    const passes = [];
    for (const p of pushes) {
        if (!p.sha) continue;
        if (p.exit === 0) {
            if (p.gate) passes.push({ sha: p.sha, job: GATE_JOB, where: "push" });
            continue;
        }
        const jobId = `push ${p.key}`;
        for (const t of p.gate?.tests ?? []) {
            const rec = testRecord(store, t);
            if (rec.occurrences.some((o) => o.jobId === jobId)) continue;
            rec.occurrences.push({
                runId: null,
                attempt: null,
                job: GATE_JOB,
                jobId,
                sha: p.sha,
                where: "push",
                pr: null,
                branch: p.branch,
                touched: changesPackage(p.changed, t.package, ws),
                line: t.line,
                at: p.at,
            });
        }
    }
    return passes;
}

/**
 * Proofs (1) and (2): a job that failed passing on the same commit, and a merge-queue batch holding
 * the pull request's failing head passing it.
 * @param {Store} store the record
 * @param {Pass[]} passes the jobs seen passing this poll
 * @param {Record<string, string>} heads each open pull request's head
 */
function provePasses(store, passes, heads) {
    for (const t of Object.values(store.tests)) {
        for (const o of t.occurrences) {
            for (const p of passes) {
                const proof = passProof(o, p, heads);
                if (proof) prove(t, proof.kind, proof.text);
            }
        }
    }
}

/**
 * What one passing job proves about one occurrence: the same commit, or a merge batch holding the
 * pull request's failing head.
 * @param {Occurrence} o the occurrence
 * @param {Pass} p the pass
 * @param {Record<string, string>} heads each open pull request's head
 * @returns {Proof | null} the proof, or null
 */
function passProof(o, p, heads) {
    const lanePass = p.job === "*" && p.lane === o.lane && o.where === "master";
    if (p.job !== o.job && !lanePass) return null;
    if (p.sha === o.sha) {
        const run = o.where === "push" ? `on ${o.branch}` : `in run ${o.runId}`;
        return {
            kind: "same-commit",
            text: `${o.job} failed on ${short(o.sha)} ${run} and passed on the same commit`,
        };
    }
    const batch = p.where === "queue" && o.where === "pr" && o.pr !== null;
    if (!batch || !p.contains?.includes(/** @type {number} */ (o.pr)) || heads[String(o.pr)] !== o.sha) return null;
    return {
        kind: "merge-batch",
        text: `${o.job} failed on #${o.pr} at ${short(o.sha)} and passed in a merge-queue batch holding it`,
    };
}

/**
 * Proof (3): on master, the lane passes at the next commit that finished a run of it, and no commit
 * between touched the test's package.
 * @param {Store} store the record
 * @param {{lanes: Record<string, any>, commits: any[], ws: Workspace,
 *   files: (base: string, head: string) => Promise<string[] | null>}} facts master's lane records and
 *   commits (head first), the workspace, and the files a range of commits changes
 */
async function proveMaster(store, { lanes, commits, ws, files }) {
    const chain = commits.length ? firstParent(commits, commits[0].sha).map((c) => c.sha) : [];
    for (const t of Object.values(store.tests)) {
        for (const o of t.occurrences) {
            const next = o.where === "master" && o.lane ? nextGreen(chain, lanes[o.lane]?.shas, o.sha) : null;
            if (next && touchesPackage(await files(o.sha, next), t.package, ws) === false) {
                prove(
                    t,
                    "next-master",
                    `${o.lane} failed at ${short(o.sha)} and passed at ${short(next)}; nothing between touched ${t.package}`,
                );
            }
        }
    }
}

/**
 * The next commit after `sha` that finished a lane run, when that run passed.
 * @param {string[]} chain master's first-parent commits, head first
 * @param {Record<string, string> | undefined} shas the lane's outcome by commit
 * @param {string} sha the failing commit
 * @returns {string | null} the passing commit, or null when the next finished run failed or none did
 */
function nextGreen(chain, shas, sha) {
    const i = chain.indexOf(sha);
    if (!shas || i <= 0) return null;
    const next = chain
        .slice(0, i)
        .reverse()
        .find((c) => shas[c] === "green" || shas[c] === "red");
    return next && shas[next] === "green" ? next : null;
}

/**
 * Proof (4): the test failed on two or more pull requests whose changes do not touch its package.
 * @param {Store} store the record
 */
function provePrs(store) {
    for (const t of Object.values(store.tests)) {
        const prs = [...new Set(t.occurrences.filter((o) => o.where === "pr" && o.touched === false).map((o) => o.pr))];
        const list = prs.map((n) => "#" + n).join(", ");
        if (prs.length >= 2) prove(t, "untouched-prs", `failed on ${list}, none of which touches ${t.package}`);
        const pushed = untouchedBranches(t);
        if (pushed.length >= 2) {
            prove(
                t,
                "untouched-pushes",
                `failed the pre-push gate of ${pushed.join(", ")}, none of which touches ${t.package}`,
            );
        }
    }
}

/**
 * The branches whose pre-push gate the test failed although their changes do not touch its package.
 * @param {Test} t the test
 * @returns {string[]} the branches
 */
const untouchedBranches = (t) => [
    ...new Set(
        t.occurrences.filter((o) => o.where === "push" && o.touched === false && o.branch).map((o) => String(o.branch)),
    ),
];

/**
 * The priority a test's harm calls for: critical once it failed on master or a merge batch, high
 * once on two or more pull requests or in the pre-push gates of two or more branches, medium
 * otherwise.
 * @param {Test} t the test
 * @returns {string} the label
 */
function priorityFor(t) {
    if (t.occurrences.some((o) => o.where === "master" || o.where === "queue")) return PRIORITIES[0];
    const prs = new Set(t.occurrences.filter((o) => o.where === "pr").map((o) => o.pr)).size;
    const branches = new Set(t.occurrences.filter((o) => o.where === "push").map((o) => o.branch)).size;
    return prs >= 2 || branches >= 2 ? PRIORITIES[1] : PRIORITIES[2];
}

/**
 * The known flaky tests: those whose issue is open.
 * @param {Store} store the record
 * @param {Record<string, any>} [issues] `state.issues.byNumber`
 * @returns {Map<string, number>} issue by test id
 */
function knownFlakes(store, issues = {}) {
    const out = new Map();
    for (const t of Object.values(store.tests)) {
        if (t.issue && issues[t.issue]?.state !== "closed") out.set(t.id, t.issue);
    }
    return out;
}

/**
 * One occurrence as an evidence line.
 * @param {string} repo `owner/name`
 * @param {Test} t the test
 * @param {Occurrence} o the occurrence
 * @returns {string} the line
 */
function occurrenceLine(repo, t, o) {
    if (o.where === "push") {
        const touch = o.touched === false ? `; the push does not touch ${t.package}` : "";
        return `- pre-push gate on this machine, branch ${o.branch ?? "?"} at ${short(o.sha)}, ${o.at}${touch}`;
    }
    const where = { master: "master", queue: `merge batch #${o.pr}`, pr: `#${o.pr}` }[
        /** @type {"master"} */ (o.where)
    ];
    const run = `https://github.com/${repo}/actions/runs/${o.runId}/job/${o.jobId}`;
    const touch = o.touched === false ? `; the change does not touch ${t.package}` : "";
    const line = o.line ? `: \`${o.line.replaceAll("`", "'")}\`` : "";
    return `- ${where}, ${o.job}, run ${o.runId} attempt ${o.attempt ?? "?"} at ${short(o.sha)} (${run})${touch}${line}`;
}

/**
 * The counts line: runs, never time.
 * @param {Test} t the test
 * @returns {string} the counts
 */
function counts(t) {
    const n = (/** @type {string} */ w) => t.occurrences.filter((o) => o.where === w).length;
    const prs = new Set(t.occurrences.filter((o) => o.where === "pr").map((o) => o.pr)).size;
    const pushes = n("push") ? `, ${n("push")} in local pre-push gates` : "";
    return `Failed in ${t.occurrences.length} runs: ${n("master")} on master, ${n("queue")} in merge batches, ${n("pr")} on ${prs} pull requests${pushes}.`;
}

/**
 * Creates the issue writer over one GitHub client.
 * @param {{github: ReturnType<typeof import("./github.mjs").createGitHub>, repo: string, store: Store,
 *   now?: () => number}} options the client (its write gate decides dry-run), `owner/name`, the
 *   record (changed in place; the caller saves it), and the clock
 * @returns the writer: `sync`
 */
export function createFlakeIssues({ github, repo, store, now = Date.now }) {
    const r = `repos/${repo}/`;
    const iso = () => new Date(now()).toISOString();
    /** @type {any[] | null} */
    let listed = null;

    /**
     * Records a would-do once per key while the group does not act; true when it was already
     * recorded, so nothing is sent again.
     * @param {string} key the would-do
     * @returns {boolean} true to skip
     */
    function ledgered(key) {
        if (github.acting(GROUP)) return false;
        if (store.wouldDo[key]) return true;
        store.wouldDo[key] = iso();
        return false;
    }

    /**
     * Files the issue of a proven test, or finds the one an earlier filing made.
     * @param {Test} t the test
     */
    async function file(t) {
        listed ??= (await github.get(`${r}issues?labels=intermittent&state=all&per_page=100`)).body ?? [];
        const found = /** @type {any[]} */ (listed).find(
            (i) => !i.pull_request && (i.body ?? "").split("\n").includes(`${MARKER}${t.id}`),
        );
        if (found) {
            t.issue = found.number;
            return;
        }
        if (ledgered(`file ${t.id}`)) return;
        const title = `Flaky test: ${t.name} (${t.package ?? "unknown package"})`.slice(0, 250);
        const body = [
            `\`${t.file}\` > ${t.name} fails intermittently.`,
            "",
            "Proof:",
            ...t.proofs.map((p) => `- ${p.text}`),
            "",
            counts(t),
            ...t.occurrences.map((o) => occurrenceLine(repo, t, o)),
            "",
            "githerd files and updates this issue. A known flaky test failing on a pull request is not the pull request's; it still needs a fix here.",
            "",
            `${MARKER}${t.id}`,
        ].join("\n");
        const res = await github.write(
            "POST",
            `${r}issues`,
            { title, body, labels: [...LABELS, priorityFor(t)] },
            { group: GROUP, check: "created", fields: { situation: "flaky-test", test: t.id } },
        );
        const n = Number(res.body?.number ?? 0);
        if (!n) return;
        Object.assign(t, { issue: n, reported: t.occurrences.length, proofsReported: t.proofs.length });
    }

    /**
     * Appends new occurrences and proofs, reopens a closed issue on a recurrence, and raises its
     * priority when the harm calls for more.
     * @param {Test} t the test
     */
    async function update(t) {
        const fresh = t.occurrences.slice(t.reported);
        const proofs = t.proofs.slice(t.proofsReported);
        const issue = /** @type {number} */ (t.issue);
        const path = `${r}issues/${issue}`;
        const want = priorityFor(t);
        if (!fresh.length && !proofs.length) return;
        if (ledgered(`update ${t.id} ${t.occurrences.length} ${t.proofs.length}`)) return;
        const current = (await github.get(path, { fresh: true })).body ?? {};
        const fields = { situation: "flaky-test", test: t.id, issue };
        if (current.state === "closed" && fresh.length) {
            await github.write(
                "PATCH",
                path,
                { state: "open" },
                { group: GROUP, check: { path, expect: { state: "open" } }, retry: true, fields },
            );
        }
        const text = [
            fresh.length ? "Again:" : "More proof:",
            ...proofs.map((p) => `- proof: ${p.text}`),
            ...fresh.map((o) => occurrenceLine(repo, t, o)),
            "",
            counts(t),
        ].join("\n");
        const res = await github.write(
            "POST",
            `${path}/comments`,
            { body: text },
            { group: GROUP, check: "created", fields },
        );
        const labels = (current.labels ?? []).map((/** @type {any} */ l) => (typeof l === "string" ? l : l.name));
        const rank = (/** @type {string} */ l) => (PRIORITIES.includes(l) ? PRIORITIES.indexOf(l) : PRIORITIES.length);
        const best = Math.min(...labels.map(rank), PRIORITIES.length);
        if (rank(want) < best) {
            const at = `${path}/labels`;
            await github.write(
                "POST",
                at,
                { labels: [want] },
                { group: GROUP, check: { path: at, expect: [{ name: want }] }, retry: true, fields },
            );
            for (const l of labels.filter((x) => PRIORITIES.includes(x))) {
                await github.write("DELETE", `${at}/${encodeURIComponent(l)}`, undefined, {
                    group: GROUP,
                    check: { path: at, lacks: [{ name: l }] },
                    retry: true,
                    fields,
                });
            }
        }
        if (res.performed) Object.assign(t, { reported: t.occurrences.length, proofsReported: t.proofs.length });
    }

    /**
     * Files or updates the issue of every proven test.
     * @returns {Promise<void>}
     */
    async function sync() {
        listed = null;
        for (const t of Object.values(store.tests)) {
            if (!t.proofs.length) continue;
            if (!t.issue) await file(t);
            else await update(t);
        }
    }

    return { sync };
}

/**
 * Whether a red master job is a flake to re-run: not the GPU lane, at least one failing test read,
 * and every one either a known flake or in a package the red range did not touch.
 * @param {{lane: string, workflow: string, tests: string[] | undefined, store: Store,
 *   known: Map<string, number>, files: string[] | null, ws: Workspace}} job the job's lane, workflow
 *   and failing tests, the record, the known flakes, the red range's files, and the workspace
 * @returns {{issues: number[]} | null} the issues of its known flakes, or null when it is not one
 */
function masterFlake({ lane, workflow, tests, store, known, files, ws }) {
    if (NO_RERUN.has(lane) || NO_RERUN.has(workflow) || !tests?.length) return null;
    const ok = tests.every(
        (id) => known.has(id) || touchesPackage(files, store.tests[id]?.package ?? null, ws) === false,
    );
    if (!ok) return null;
    return { issues: [...new Set(tests.map((id) => known.get(id)).filter((n) => n !== undefined))] };
}

/**
 * Re-runs one failed master job once per (commit, failure key), through the write group
 * `worker-writes`. The re-run is recorded where the incident's own re-run and a worker's
 * `githerd_rerun` look, so neither starts another; while the group does not act it is one would-do.
 * @param {{github: ReturnType<typeof import("./github.mjs").createGitHub>, repo: string, state: any,
 *   job: {id: number, runId: number, attempt: number, name: string}, sha: string, key: string,
 *   now: string}} args the client, `owner/name`, the daemon state, the job, its commit, its failure
 *   key and the time
 * @returns {Promise<boolean>} true when a re-run was sent
 */
async function rerunFlake({ github, repo, state, job, sha, key, now }) {
    const store = flakeStore(state);
    state.incidentActions ??= {};
    state.incidentActions.reruns ??= {};
    const reruns = state.incidentActions.reruns;
    const id = `${sha} ${key}`;
    if (reruns[id]) return false;
    const send = () =>
        github.write("POST", `repos/${repo}/actions/jobs/${job.id}/rerun`, undefined, {
            group: RERUN_GROUP,
            check: {
                path: `repos/${repo}/actions/runs/${job.runId}/attempts/${job.attempt + 1}`,
                expect: { run_attempt: job.attempt + 1 },
            },
            fields: { situation: "flaky-test-rerun", key, sha },
        });
    if (!github.acting(RERUN_GROUP)) {
        if (store.wouldDo[`rerun ${id}`]) return false;
        store.wouldDo[`rerun ${id}`] = now;
        await send();
        return false;
    }
    const worker = (state.reruns ??= {});
    reruns[id] = { why: "flaky-test", at: now };
    worker[`${sha}:${job.name}`] = { at: now, job: "githerd", reason: "flaky test on master" };
    try {
        const res = await send();
        if (!res.performed) {
            delete reruns[id];
            delete worker[`${sha}:${job.name}`];
        }
        return res.performed;
    } catch (err) {
        if (notSent(err)) {
            delete reruns[id];
            delete worker[`${sha}:${job.name}`];
        }
        throw err;
    }
}

/**
 * Reads the failed `Test (...)` jobs of every open pull request and merge-queue batch once, records
 * their failing tests, and collects the jobs that passed, for proofs (1) and (2).
 * @param {{nodes: any[], store: Store, ws: Workspace, required: string[], at: string,
 *   files: (n: number, sha: string) => string[] | null,
 *   get: (path: string) => Promise<any>, log: (jobId: number) => Promise<string | null>, repo: string}} ctx
 *   the GraphQL pull request nodes, the record, the workspace, the required checks, the time, a pull
 *   request's changed files at a head, the client's read, the job log reader and `owner/name`
 * @returns {Promise<{passes: Pass[], heads: Record<string, string>}>} the passes and each head
 */
async function observeRollups({ nodes, store, ws, required, at, files, get, log, repo }) {
    /** @type {Pass[]} */
    const passes = [];
    /** @type {Record<string, string>} */
    const heads = {};
    for (const node of nodes) {
        const sha = node.headRefOid;
        const queue = isMergeQueuePr(node);
        if (!queue) heads[node.number] = sha;
        const contains = queue ? [...String(node.title ?? "").matchAll(/#(\d+)/g)].map((m) => Number(m[1])) : [];
        const contexts = checkRuns(node).filter((c) => !isSummaryJob(c.name, required));
        const where = /** @type {"queue" | "pr"} */ (queue ? "queue" : "pr");
        for (const c of contexts.filter((x) => x.conclusion === "SUCCESS"))
            passes.push({ sha, job: c.name, where, contains });
        const failed = contexts.filter(
            (c) => FAILED.has(c.conclusion) && isTestJob(c.name) && c.databaseId && !store.jobs[String(c.databaseId)],
        );
        const changed = queue ? null : files(node.number, sha);
        const base = { sha, where, pr: node.number, at };
        await recordRuns({ store, ws, log, get, repo, failed, base, files: changed });
    }
    return { passes, heads };
}

/**
 * Records the failed test jobs of a head, run by run: one jobs list per run (for the attempts),
 * one log per job.
 * @param {{store: Store, ws: Workspace, log: (jobId: number) => Promise<string | null>,
 *   get: (path: string) => Promise<any>, repo: string, failed: any[],
 *   base: {sha: string, where: "pr" | "queue", pr: number, at: string}, files: string[] | null}} ctx
 *   the record, the workspace, the log reader, the client's read, `owner/name`, the failed check
 *   runs not read yet, the head's facts and the change's files
 */
async function recordRuns({ store, ws, log, get, repo, failed, base, files }) {
    for (const runId of new Set(failed.map(runOf).filter(Boolean))) {
        const jobs = (await get(`repos/${repo}/actions/runs/${runId}/jobs?filter=latest&per_page=100`))?.jobs ?? [];
        for (const c of failed.filter((x) => runOf(x) === runId)) {
            const attempt = jobs.find((/** @type {any} */ x) => x.id === c.databaseId)?.run_attempt ?? null;
            const occ = { ...base, runId, attempt, job: c.name, jobId: c.databaseId };
            await recordJob({ store, ws, log, check: c, occ, files });
        }
    }
}

/**
 * Reads one failed check run's log and records its failing tests.
 * @param {{store: Store, ws: Workspace, log: (jobId: number) => Promise<string | null>, check: any,
 *   occ: Omit<Occurrence, "line" | "touched">, files: string[] | null}} ctx the record, the
 *   workspace, the log reader, the check run, the occurrence and the change's files
 */
async function recordJob({ store, ws, log, check, occ, files }) {
    const workflow = check.checkSuite?.workflowRun?.workflow?.name ?? "";
    const tests = failingTests(await log(check.databaseId), { job: check.name, workflow, packages: ws.packages });
    recordTests(store, tests, { ...occ, files }, ws);
}

/** Check run conclusions that fail a job. */
const FAILED = new Set(["FAILURE", "TIMED_OUT"]);

/**
 * A pull request head's check runs, from the GraphQL rollup.
 * @param {any} node the pull request node
 * @returns {any[]} its check runs
 */
const checkRuns = (node) =>
    (node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.contexts?.nodes ?? []).filter(
        (/** @type {any} */ c) => c.__typename === "CheckRun",
    );

/**
 * A check run's workflow run id.
 * @param {any} c the check run
 * @returns {number | undefined} the run
 */
const runOf = (c) => c.checkSuite?.workflowRun?.databaseId;

/**
 * The failing test jobs of a pull request's head, each with the tests it failed on, for the
 * classifier. A job whose log named no test has an empty list.
 * @param {Store} store the record
 * @param {any} node the GraphQL pull request node
 * @param {string[]} required the required checks
 * @returns {{job: string, tests: string[]}[]} the failing jobs that are not summaries
 */
function headFailures(store, node, required) {
    return checkRuns(node)
        .filter((c) => FAILED.has(c.conclusion) && !isSummaryJob(c.name, required))
        .map((/** @type {any} */ c) => ({
            job: c.name,
            tests: Object.values(store.tests)
                .filter((t) => t.occurrences.some((o) => o.jobId === c.databaseId))
                .map((t) => t.id),
        }));
}

/**
 * The tracked tests as the board shows them: counts of runs by where they ran, the proofs, and
 * the issue.
 * @param {any} state the daemon state
 * @returns {{test: string, runs: number, master: number, batch: number, pr: number, push: number,
 *   proofs: Proof[], issue: number | null}[]} one entry per test
 */
export function flakeData(state) {
    return Object.values(/** @type {Store | undefined} */ (state?.flakes)?.tests ?? {}).map((t) => {
        const n = (/** @type {string} */ w) => t.occurrences.filter((o) => o.where === w).length;
        return {
            test: t.id,
            runs: t.occurrences.length,
            master: n("master"),
            batch: n("queue"),
            pr: n("pr"),
            push: n("push"),
            proofs: t.proofs,
            issue: t.issue,
        };
    });
}

/**
 * A test's pre-push gate count for the board, when it has one.
 * @param {{push?: number}} t the tracked test
 * @returns {string} `, 3 pre-push` or nothing
 */
const pushCount = (t) => (t.push ? `, ${t.push} pre-push` : "");

/**
 * The board's flaky-tests section.
 * @param {ReturnType<typeof flakeData>} tests the tracked tests
 * @returns {string[]} the lines
 */
export function flakeLines(tests) {
    if (!tests.length) return ["FLAKY TESTS: none"];
    const issue = (/** @type {ReturnType<typeof flakeData>[number]} */ t) => {
        if (t.issue) return `issue #${t.issue}`;
        return t.proofs.length ? "issue not filed yet" : "no proof yet";
    };
    return [
        `FLAKY TESTS (${tests.length}):`,
        ...tests.flatMap((t) => [
            `  ${t.test} -- ${t.runs} runs (${t.master} master, ${t.batch} batch, ${t.pr} PR${pushCount(t)}); ${issue(t)}`,
            ...t.proofs.map((p) => `    proof ${p.kind}: ${p.text}`),
        ]),
    ];
}

/**
 * The files a range of master commits changes, read once per range (`compare`); null when GitHub
 * cut the list short, so an unseen file may touch anything.
 * @param {Store} store the record, whose `ranges` caches the answers
 * @param {{get: (path: string) => Promise<{body: any}>}} github the client
 * @param {string} repo `owner/name`
 * @param {string} base the older commit
 * @param {string} head the newer commit
 * @returns {Promise<string[] | null>} the paths
 */
async function rangeFiles(store, github, repo, base, head) {
    const id = `${base}...${head}`;
    if (!(id in store.ranges)) {
        const listed = (await github.get(`repos/${repo}/compare/${id}`)).body?.files;
        store.ranges[id] =
            Array.isArray(listed) && listed.length < 300 ? listed.map((/** @type {any} */ f) => f.filename) : null;
    }
    return store.ranges[id];
}

/**
 * Records the failing tests of a red master job whose log the classifier read.
 * @param {any} state the daemon state
 * @param {Workspace} ws the workspace
 * @param {string | null} log the job's log
 * @param {{workflow: string, lane: string, runId: number, attempt: number, job: string, jobId: number,
 *   sha: string, at: string}} job the job
 * @returns {string[]} the failing tests' ids
 */
export function noteMasterLog(state, ws, log, { workflow, ...job }) {
    const tests = failingTests(log, { job: job.job, workflow, packages: ws.packages });
    return recordTests(flakeStore(state), tests, { ...job, where: "master", pr: null, files: null }, ws);
}

/**
 * The flake step of a master incident's key (the one run githerd starts for flakiness): a red job
 * whose failing tests are all known flakes, or all in packages the red range did not touch, is
 * re-run once, and the incident points at the tests' issue. The GPU lane only records.
 * @param {{state: any, ws: Workspace, github: ReturnType<typeof import("./github.mjs").createGitHub>,
 *   repo: string, incident: any, lane: string, workflow: string, key: string, now: string,
 *   job: {id: number, runId: number, attempt: number, name: string, tests?: string[]}}} ctx the
 *   daemon state, the workspace, the client, `owner/name`, the open incident, the job's lane, its
 *   workflow, its failure key, the time and the job
 * @returns {Promise<{issue: number | null} | null>} the flaky-test issue, or null when the job is
 *   not a flake
 */
export async function masterFlakeStep({ state, ws, github, repo, incident, lane, workflow, key, now, job }) {
    const store = flakeStore(state);
    const sha = incident.lanes[lane].sha;
    if (NO_RERUN.has(lane) || NO_RERUN.has(workflow) || !job.tests?.length) return null;
    const files = incident.lastGreenSha ? await rangeFiles(store, github, repo, incident.lastGreenSha, sha) : null;
    const known = knownFlakes(store, state.issues?.byNumber);
    const hit = masterFlake({ lane, workflow, tests: job.tests, store, known, files, ws });
    if (!hit) return null;
    await rerunFlake({ github, repo, state, job, sha, key, now });
    const issue = hit.issues[0] ?? null;
    incident.flakyTests ??= {};
    incident.flakyTests[key] = { tests: job.tests, issues: hit.issues };
    if (issue) incident.issue = issue;
    return { issue };
}

/**
 * The flake work of one poll, after the pull requests were read: the failed test jobs of pull
 * requests and merge batches, the four proofs, the issues, and each pull request's known-flake
 * classification (`rec.knownFlake`, the reason its job gets; classify.mjs class `intermittent`).
 * @param {{state: any, nodes: any[], ws: Workspace, config: {repo: string, requiredChecks: string[]},
 *   github: ReturnType<typeof import("./github.mjs").createGitHub>, log: (jobId: number) => Promise<string | null>,
 *   commits: any[], at: string, pushes?: Parameters<typeof notePushes>[1]}} ctx the daemon state (its
 *   `prs` already this poll's), the GraphQL pull request nodes, the workspace, the config, the
 *   client, the job log reader, master's recent commits, the time, and the local pushes
 *   (prepush.mjs `readPushes`)
 */
export async function flakePoll({ state, nodes, ws, config, github, log, commits, at, pushes = [] }) {
    const store = flakeStore(state);
    const repo = config.repo;
    const gateHeads = state.mergeGate?.heads ?? {};
    const { passes, heads } = await observeRollups({
        nodes,
        store,
        ws,
        required: config.requiredChecks,
        at,
        repo,
        log,
        get: async (path) => (await github.get(path)).body,
        files: (n, sha) =>
            nodes.find((x) => x.number === n)?.detail?.files ??
            (gateHeads[n]?.sha === sha ? (gateHeads[n].files ?? null) : null),
    });
    passes.push(...notePushes(store, pushes, ws));
    for (const [lane, rec] of Object.entries(state.master?.lanes ?? {})) {
        for (const [sha, out] of Object.entries(/** @type {any} */ (rec).shas ?? {})) {
            if (out === "green") passes.push({ sha, job: "*", lane, where: "master" });
        }
    }
    provePasses(store, passes, heads);
    await proveMaster(store, {
        lanes: state.master?.lanes ?? {},
        commits,
        ws,
        files: (base, head) => rangeFiles(store, github, repo, base, head),
    });
    provePrs(store);
    await createFlakeIssues({ github, repo, store, now: () => Date.parse(at) }).sync();
    const known = knownFlakes(store, state.issues?.byNumber);
    for (const node of nodes) {
        const rec = state.prs?.[node.number];
        if (!rec) continue;
        delete rec.knownFlake;
        // A check in its warning period (advisory.mjs) is no failure of the pull request's.
        const failures = headFailures(store, node, config.requiredChecks).filter(
            (f) => !advisoryFailure(state.advisory, utcDay(at), { job: f.job }),
        );
        const verdicts = failures.map((f) =>
            classify({ workflow: "", job: f.job, steps: [], tests: f.tests }, { flakyTests: [...known.keys()] }),
        );
        if (!failures.length || verdicts.some((v) => v.class !== "intermittent")) continue;
        const ids = [...new Set(failures.flatMap((f) => f.tests))];
        const issues = [...new Set(ids.map((id) => `#${known.get(id)}`))];
        rec.knownFlake = `known flaky test${ids.length > 1 ? "s" : ""} ${ids.join("; ")} (${issues.join(", ")}), not this pull request's failure: ask githerd_rerun for the failed job`;
    }
}
