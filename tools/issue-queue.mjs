#!/usr/bin/env node
// The only way an agent reads this repository's issues (#5719). Anyone on GitHub can open or comment on an issue, and
// an agent that reads that text while holding graphty-agent's push rights can be steered by it. This tool passes on
// only text written (and last edited) by a trusted account.
//
//   node tools/issue-queue.mjs list [--limit N] [--json]   open issues an issue round may take, in its order
//   node tools/issue-queue.mjs show <n>                    one trusted issue, untrusted comments withheld
//   gh api graphql ... | node tools/issue-queue.mjs filter  any GraphQL answer with untrusted titles and bodies withheld
//   node tools/issue-queue.mjs jobs [--json]               the jobs to start, grouped, from the free-queue scan; top
//                                                          issues the scan missed as `unscanned` jobs and a `rescan:`
//                                                          line; exits 3 "stale: rebuild the free queue" when the
//                                                          cache is missing, old-format or over 2 hours old
//   node tools/issue-queue.mjs taken <branch> <worktree> <n>... --files <path>... --why "<reason>"
//                                                          marks a job's issues in-progress with the taken marker
//   node tools/issue-queue.mjs claims [--fix] [--json]     judges every in-progress claim live or dead; --fix
//                                                          releases dead ones with no commits of their own, lifts
//                                                          `blocked` whose cited pull request closed, and writes
//                                                          tmp/issue-round/state.json
//   node tools/issue-queue.mjs list --held [--json]        issues held only by an owner label or a missing ux label
//
// It reads GitHub through `gh api graphql` (as whoever gh is logged in as; agents are graphty-agent).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, readlinkSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Optional: tools/pr-review.sh runs a copy of this file alone, extracted from master into a bare temporary directory,
// so it imports no sibling module statically. Without test-slots.mjs the claims sweep sees no tickets.
const slots = await import("./test-slots.mjs").catch(() => null);

let rootCache = null;

/**
 * The main checkout: the parent of git's common directory, so a copy of this tool run from a worktree or from
 * tmp/issue-round/ reads and writes the main checkout's files (a copy once read the wrong free-queue.json). The
 * checkout above this file when git cannot say.
 * @returns an absolute path
 */
export function mainRoot() {
    if (rootCache) return rootCache;
    const here = dirname(fileURLToPath(import.meta.url));
    try {
        const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd: here,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        rootCache = dirname(common);
    } catch {
        rootCache = resolve(here, "..");
    }
    return rootCache;
}

/**
 * The issue round's data directory in the main checkout.
 * @returns tmp/issue-round of mainRoot()
 */
export const roundDir = () => join(mainRoot(), "tmp", "issue-round");

/**
 * GUARD_PATHS of tools/pr-open.sh (files whose pull requests the owner merges), read from the script so the two never
 * drift apart.
 * @returns the regular expression
 */
export function guardPaths() {
    const text = readFileSync(fileURLToPath(new URL("./pr-open.sh", import.meta.url)), "utf8");
    const m = /^GUARD_PATHS='([^']+)'/m.exec(text);
    if (!m) throw new Error("GUARD_PATHS not found in tools/pr-open.sh");
    return new RegExp(m[1]);
}

const REPO = { owner: "graphty-org", name: "graphty-monorepo" };

// login -> the GraphQL actor type it must have. A user account named like a bot is a different type and fails.
const TRUSTED = new Map([
    ["apowers313", "User"],
    ["graphty-agent", "User"],
    ["github-actions", "Bot"],
    ["graphty-release-scheduler", "Bot"],
]);

// priority:critical is work, taken first (owner, 2026-11-14); only its non-code alarms are skipped below.
const SKIP_LABELS = [
    "in-progress",
    "needs-decision",
    "needs-info",
    "blocked",
    "hold",
    "tracking",
    "release-status",
    "dead-links",
    "research",
    "ux-owner",
    "githerd-heartbeat",
    "ci-budget",
];
// The priority:critical alarms tools file that are not code work, or whose code fix pipeline-round owns (master-guard's
// revert, bisect, the fix that opens while master is red, owner-only screenshots and keys). Load-sensitive and flaky
// test issues are code work and stay in the queue.
const ALARM_TITLES = [
    "Full run red:", // tools/full-run.mjs RED_TITLE
    "Master baselines tree unsigned", // tools/full-run.mjs UNSIGNED_TITLE
    "Failing on master:", // tools/results/run-group.mjs
    "Red master: CI failed on", // tools/master-guard.mjs RED_PREFIX
    "canary deploy failed on", // tools/master-guard.mjs DEPLOY_PREFIX
    "Nightly stalled since", // tools/channel/nightly.mjs STALL_TITLE
    "Nightly site deploy failed", // tools/channel/nightly.mjs FAILED_TITLE
    "Nightly promotion failed:", // release.yml
    "Shadow release run:", // release.yml
    "Release scheduler could not start", // tools/release-scheduler/src/worker.js ISSUE_TITLE
    "graphty-monorepo's write deploy keys", // tools/release-scheduler/src/worker.js DEPLOY_KEY_ISSUE_TITLE
];
const HELD_MAJOR = new Set([676, 702, 843, 1370]);
const PRIORITIES = ["critical", "high", "medium", "low"];
const EFFORTS = ["low", "medium", "high"];
const TYPES = ["bug", "infrastructure", "enhancement"];

/**
 * Whether a GraphQL actor is on the allowlist.
 * @param actor `{ __typename, login }`, or null for a deleted account
 * @returns true when trusted
 */
export function trusted(actor) {
    return Boolean(actor) && TRUSTED.get(actor.login) === actor.__typename;
}

/**
 * Whether a piece of text (an issue body or a comment) is trusted: written by a trusted author and, when edited,
 * last edited by a trusted account.
 * @param node a GraphQL Issue or IssueComment with author, editor and lastEditedAt
 * @returns true when its text may be read
 */
export function trustedText(node) {
    if (!trusted(node.author)) return false;
    if (node.lastEditedAt && !trusted(node.editor)) return false;
    return true;
}

const labelsOf = (issue) => (issue.labels?.nodes ?? []).map((l) => l.name);
const pick = (labels, prefix, order) => {
    const found = order.find((v) => labels.includes(`${prefix}:${v}`));
    return found ?? "none";
};

/**
 * Why an issue is not work for an issue round, or null when it is.
 * @param issue a trusted GraphQL Issue
 * @returns the reason, or null
 */
export function skipReason(issue) {
    const labels = labelsOf(issue);
    const label = SKIP_LABELS.find((l) => labels.includes(l));
    if (label) return `label ${label}`;
    // An enhancement only when labelled ux-safe (owner, 2026-11-10); ux-owner ones are owner-ordered only.
    if (labels.includes("enhancement") && !labels.includes("ux-safe")) return "label enhancement";
    if (labels.includes("documentation") && !TYPES.some((t) => labels.includes(t)))
        return "documentation with no type label";
    if (HELD_MAJOR.has(issue.number)) return "held major";
    if (issue.title.startsWith("Release held:")) return "release held";
    if (issue.title.includes("lane red on master")) return "lane red on master";
    if (/^Nightly (held on|missed slot)/.test(issue.title)) return "nightly alarm";
    if (ALARM_TITLES.some((t) => issue.title.startsWith(t))) return "pipeline alarm";
    if (/design\/brand|brand kit/i.test(issue.title)) return "design/brand";
    return null;
}

/**
 * The fields the round sorts and prints by.
 * @param issue a trusted GraphQL Issue
 * @param now the time ages are measured from, in ms
 * @returns `{ number, title, priority, type, effort, family, loadSensitive, createdAt, ageDays }`
 */
export function describe(issue, now) {
    const labels = labelsOf(issue);
    let type = "other";
    if (labels.includes("bug")) type = "bug";
    else if (labels.includes("infrastructure")) type = "infrastructure";
    else if (labels.includes("enhancement")) type = "enhancement";
    return {
        number: issue.number,
        title: issue.title,
        priority: pick(labels, "priority", PRIORITIES),
        type,
        effort: pick(labels, "effort", EFFORTS),
        // Sibling issues filed from one investigation share a `family:<topic>` label; jobs() puts them in one job.
        family: labels.find((l) => l.startsWith("family:")) ?? null,
        loadSensitive:
            issue.title.startsWith("Load-sensitive test:") || /restricted CPU|CPU restriction/i.test(issue.body ?? ""),
        createdAt: issue.createdAt,
        ageDays: Math.floor((now - Date.parse(issue.createdAt)) / 86_400_000),
    };
}

const rank = (list, v) => (list.includes(v) ? list.indexOf(v) : list.length);

/**
 * The round's order: load-sensitive first, then priority, then bug, infrastructure, enhancement, then effort, then oldest.
 * @param a described issue
 * @param b described issue
 * @returns a sort comparison
 */
export function compare(a, b) {
    return (
        Number(b.loadSensitive) - Number(a.loadSensitive) ||
        rank(PRIORITIES, a.priority) - rank(PRIORITIES, b.priority) ||
        rank(TYPES, a.type) - rank(TYPES, b.type) ||
        rank(EFFORTS, a.effort) - rank(EFFORTS, b.effort) ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );
}

/**
 * The queue from every open issue.
 * @param issues GraphQL Issues
 * @param now ms
 * @returns `{ queue, untrusted }`, the queue sorted
 */
export function queue(issues, now) {
    const kept = issues.filter(trustedText);
    return {
        queue: kept
            .filter((i) => !skipReason(i))
            .map((i) => describe(i, now))
            .sort(compare),
        untrusted: issues.length - kept.length,
    };
}

const ascii = (s) => s.replaceAll(/[^\x20-\x7e\n\t]/g, "?");

/**
 * The `list` output lines.
 * @param result from queue()
 * @param limit how many issues to print
 * @returns lines
 */
export function listLines(result, limit) {
    const { queue: q, untrusted } = result;
    const lines = q.slice(0, limit).map((i) => {
        const tag = i.loadSensitive ? "load-sensitive " : "";
        return ascii(`#${i.number} ${tag}${i.priority} ${i.type} effort:${i.effort} ${i.ageDays}d ${i.title}`);
    });
    lines.push(`${q.length} issues in the queue; ${untrusted} open issues dropped as untrusted (author or editor)`);
    return lines;
}

/**
 * The `show` output, or null when the issue itself is untrusted.
 * @param issue a GraphQL Issue with comments
 * @returns text, or null
 */
export function showText(issue) {
    if (!trustedText(issue)) return null;
    const out = [
        `#${issue.number} ${issue.title}`,
        `author: ${issue.author.login}  state: ${issue.state}  created: ${issue.createdAt}`,
        `labels: ${labelsOf(issue).join(", ") || "(none)"}`,
        "",
        issue.body ?? "",
    ];
    for (const c of issue.comments.nodes) {
        const who = c.author?.login ?? "ghost";
        const text = trustedText(c) ? c.body : `[comment by ${who} withheld: untrusted author]`;
        out.push("", `--- comment by ${who} at ${c.createdAt}`, text);
    }
    const more = issue.comments.totalCount - issue.comments.nodes.length;
    // ponytail: only the first 100 comments; page through comments if an issue ever passes that
    if (more > 0) out.push("", `[${more} later comments not shown]`);
    return ascii(out.join("\n"));
}

/**
 * Any GraphQL answer with every untrusted `title` and `body` replaced: an object carrying either must also carry
 * `author` (and `editor lastEditedAt`, or an edit is not seen), or it counts as untrusted.
 * @param value parsed GraphQL JSON
 * @returns the same shape, withheld
 */
export function withhold(value) {
    if (Array.isArray(value)) return value.map(withhold);
    if (!value || typeof value !== "object") return value;
    const out = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withhold(v)]));
    if (("body" in value || "title" in value) && !trustedText(value)) {
        const who = value.author?.login ?? "ghost";
        for (const k of ["body", "title"]) if (k in out) out[k] = `[${k} by ${who} withheld: untrusted author]`;
    }
    return out;
}

// The free-queue scan's cache (main checkout): { builtAt, jobs: [{ issues, files, why }], blocked: [{ issue, ... }] }.
const FREE_QUEUE_MAX_AGE_MS = 2 * 3_600_000;
const MAX_JOB = 4;
const hashes = (numbers) => numbers.map((n) => `#${n}`).join(" ");
// Generated, append-mostly or registry files: sharing one is not a reason to group (issue-round step 4's list).
const SHARED_FILES = [
    /\/api\/[^/]+\.api\.md$/,
    /(^|\/)pnpm-lock\.yaml$/,
    /(^|\/)package\.json$/,
    /(^|\/)README[^/]*$/,
    /\/stories\/helpers/,
    /^graphty-element\/src\/errors\/codes\.ts$/,
    /^graphty-element\/test\/cost-coverage\//,
    /^graphty-element\/src\/session\/commands\/doors\.ts$/,
];

/**
 * The jobs a round starts, from the free-queue scan's cache and the live queue. Claude judges the groups in the scan;
 * this enforces them: issues no longer in the queue drop out, and jobs that share a (non-shared) file or a family label
 * merge, up to four issues, each job led by its issue earliest in the queue, in the queue's order. A scan job of more
 * than four splits into consecutive jobs in queue order. A top-10 issue the scan put nowhere becomes its own job marked
 * `unscanned`, and `rescan` names those issues so the round starts the scan again without waiting for it.
 * @param cache the parsed free-queue.json, or null when missing
 * @param q the queue, from queue()
 * @param now ms
 * @returns `{ stale }` with the reason the scan must run again, or `{ jobs, rescan }`
 */
export function jobs(cache, q, now) {
    if (!cache) return { stale: "no free queue" };
    if (!Array.isArray(cache.jobs)) return { stale: "the free queue has no jobs list" };
    const age = now - Date.parse(cache.builtAt);
    if (Number.isNaN(age) || age > FREE_QUEUE_MAX_AGE_MS)
        return { stale: `the free queue is older than 2 hours (${cache.builtAt})` };
    const pos = new Map(q.map((i, k) => [i.number, k]));
    const byNumber = new Map(q.map((i) => [i.number, i]));
    const blocked = new Set((cache.blocked ?? []).map((b) => b.issue));
    const seen = new Set();
    const cleaned = cache.jobs
        .flatMap((j) => {
            const issues = [...new Set(j.issues ?? [])]
                .filter((n) => pos.has(n) && !seen.has(n))
                .sort((a, b) => pos.get(a) - pos.get(b));
            for (const n of issues) seen.add(n);
            const files = (j.files ?? []).filter((f) => !SHARED_FILES.some((r) => r.test(f)));
            const chunks = [];
            for (let k = 0; k < issues.length; k += MAX_JOB)
                chunks.push({ issues: issues.slice(k, k + MAX_JOB), files, why: [j.why ?? ""] });
            return chunks;
        })
        .sort((a, b) => pos.get(a.issues[0]) - pos.get(b.issues[0]));
    const free = q.map((i) => i.number).filter((n) => !seen.has(n) && !blocked.has(n));
    const top = new Set(q.slice(0, 10).map((i) => i.number));
    let rescan = free.filter((n) => top.has(n));
    // Nothing scanned is left but work is: offer the first free issue rather than an empty round.
    if (!rescan.length && !cleaned.length && free.length) rescan = [free[0]];
    const families = (j) => j.issues.map((n) => byNumber.get(n).family).filter(Boolean);
    const merged = [];
    for (const j of cleaned) {
        const fam = families(j);
        const into = merged.find(
            (m) =>
                m.issues.length + j.issues.length <= MAX_JOB &&
                (m.files.some((f) => j.files.includes(f)) || families(m).some((f) => fam.includes(f))),
        );
        if (!into) {
            merged.push(j);
            continue;
        }
        into.issues = [...into.issues, ...j.issues].sort((a, b) => pos.get(a) - pos.get(b));
        into.files = [...new Set([...into.files, ...j.files])];
        into.why.push(...j.why);
    }
    const out = merged.map((m) => ({
        lead: m.issues[0],
        priority: byNumber.get(m.issues[0]).priority,
        issues: m.issues,
        files: m.files,
        why: m.why.filter(Boolean).join("; "),
    }));
    for (const n of rescan) {
        out.push({ lead: n, priority: byNumber.get(n).priority, issues: [n], files: [], why: "", unscanned: true });
    }
    return { jobs: out.sort((a, b) => pos.get(a.lead) - pos.get(b.lead)), rescan };
}

/**
 * The `taken` marker for a job's issues; refuses a job with no files, which step 4's collision check needs.
 * @param argv `<branch> <worktree> <n>... --files <path>... --why <reason>`
 * @param session the session id
 * @returns `{ issues, body }` or `{ error }`
 */
export function takenMarker(argv, session) {
    const flag = argv.findIndex((a) => a.startsWith("--"));
    const [branch, worktree, ...nums] = flag < 0 ? argv : argv.slice(0, flag);
    const files = [];
    let why = "";
    let mode = "";
    for (const a of flag < 0 ? [] : argv.slice(flag)) {
        if (a === "--files" || a === "--why") mode = a;
        else if (mode === "--files") files.push(a);
        else if (mode === "--why") why = a;
    }
    const usage = "usage: taken <branch> <worktree> <n>... --files <path>... --why <reason>";
    if (!branch || !worktree || !nums.length || !nums.every((n) => /^\d+$/.test(n))) return { error: usage };
    if (!files.length) return { error: "taken: --files is required: name the files the fix will touch" };
    if (!why.trim()) return { error: "taken: --why is required: name the rule or job that picked it" };
    if (!session) return { error: "taken: CLAUDE_CODE_SESSION_ID is not set" };
    const group = nums.length > 1 ? `, group ${hashes(nums)}` : "";
    const body = `pipeline-round: taken by session ${session}, branch ${branch}, worktree ${worktree}${group} -- ${why}; files ${files.join(" ")}`;
    return { issues: nums.map(Number), body };
}

const ACTOR = "{ __typename login }";
const TEXT = `author ${ACTOR} editor ${ACTOR} lastEditedAt body`;
const LIST_QUERY = `query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    issues(states: OPEN, first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { number title createdAt ${TEXT} labels(first: 30) { nodes { name } } }
    }
  }
}`;
const SHOW_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number title state createdAt ${TEXT} labels(first: 30) { nodes { name } }
      comments(first: 100) { totalCount nodes { createdAt ${TEXT} } }
    }
  }
}`;

// Only a command line reaches GitHub: runCli() sets this when node was started with the tool itself, so a test (whose
// argv[1] is the test runner) that forgets to pass its own runner gets a refusal, never a real gh call. On 2026-11-18
// a test-time `claims --fix` with the default runner released 18 live claims on GitHub.
let fromCli = false;

/** Throws unless this process is one of the tools' own command lines (runCli). */
export function ghAllowed() {
    if (!fromCli) throw new Error("gh refused: only a tool's command line reaches GitHub; pass a runner");
}

const ghCli = (args) => {
    ghAllowed();
    return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
};

const readFreeQueue = () => {
    try {
        return JSON.parse(readFileSync(join(roundDir(), "free-queue.json"), "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
};

/**
 * The real GraphQL runner, for a tool's command line only (ghAllowed).
 * @param query GraphQL
 * @param vars its variables
 * @returns the response's data
 */
export function gh(query, vars = {}) {
    ghAllowed();
    const args = ["api", "graphql", "-f", `query=${query}`];
    for (const [k, v] of Object.entries(vars)) {
        if (v !== undefined) args.push(typeof v === "number" ? "-F" : "-f", `${k}=${v}`);
    }
    const out = execFileSync("gh", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
        maxBuffer: 1 << 28,
    });
    return JSON.parse(out).data;
}

/**
 * Every open issue, one GraphQL call per 100.
 * @param run the GraphQL runner
 * @returns GraphQL Issues
 */
export function fetchOpen(run = gh) {
    const all = [];
    let after;
    do {
        const page = run(LIST_QUERY, { ...REPO, after }).repository.issues;
        all.push(...page.nodes);
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
    } while (after);
    return all;
}

// ---------------------------------------------------------------------------------------------------------------
// Claims: every in-progress label is a claim, and nothing but this sweep releases a dead one. On 2026-11-17 about 140
// issues carried in-progress, the queue held 49 of 403 open issues, and the prose step that released claims had not
// run for four days.

const MIN = 60_000;
const HOUR = 60 * MIN;
/** A claim with a marker, commit or changed worktree file this recent is live. */
export const CLAIM_ACTIVE_MS = 60 * MIN;
/** A claim whose session's subagent transcript naming its branch was written this recently is live. */
export const TRANSCRIPT_MS = 30 * MIN;
/** Another live session holds its claim while the branch was active this recently. */
export const OTHER_SESSION_MS = 24 * HOUR;
const CLAIM_MARKER = /^pipeline-round: (taken|ready|opened|released|restarted)\b/;

/**
 * An issue's claim, read from its newest state marker (by comment id) among trusted comments, or from its
 * in-progress label event when it has none (a bare label).
 * @param issue a GraphQL Issue with comments (databaseId, createdAt, body) and timelineItems (LabeledEvent)
 * @returns `{ n, kind, at, session, branch, worktree, taken }`; kind taken, ready, opened, released, restarted or label
 */
export function claimOf(issue) {
    const markers = (issue.comments?.nodes ?? [])
        .filter((c) => trustedText(c))
        .map((c) => {
            const line = (c.body ?? "").split("\n")[0];
            const m = CLAIM_MARKER.exec(line);
            return m && { id: c.databaseId, kind: m[1], at: Date.parse(c.createdAt), line };
        })
        .filter(Boolean)
        .sort((a, b) => a.id - b.id);
    const newest = markers.at(-1) ?? null;
    const taken = markers.findLast((m) => m.kind === "taken") ?? null;
    const labelled = Math.max(
        0,
        ...(issue.timelineItems?.nodes ?? [])
            .filter((e) => e?.label?.name === "in-progress")
            .map((e) => Date.parse(e.createdAt)),
    );
    // A label put back after a release is a new claim with no marker.
    if (!newest || (newest.kind === "released" && labelled > newest.at)) {
        return {
            n: issue.number,
            kind: "label",
            at: labelled,
            session: null,
            branch: null,
            worktree: null,
            taken: null,
        };
    }
    const field = (re) => (taken ? (re.exec(taken.line)?.[1] ?? null) : null);
    const named = ["ready", "opened", "restarted"].includes(newest.kind) ? newest.line.split(/\s+/)[2] : null;
    return {
        n: issue.number,
        kind: newest.kind,
        at: newest.at,
        session: field(/by session ([^,\s]+)/),
        branch: named ?? field(/branch ([^,\s]+)/),
        worktree: field(/worktree ([^,\s]+)/),
        taken: taken?.line ?? null,
    };
}

/**
 * Whether a claim is live. Live when ANY holds: an open pull request on its branch; a marker, commit or changed
 * worktree file in the last 60 minutes; a held or waiting test-slot ticket in its worktree; a subagent transcript of
 * its session naming its branch written in the last 30 minutes; or, for a session other than the round's, that the
 * session is alive and the branch was active in the last 24 hours. The round's own session is always alive, so its
 * liveness never holds a claim. A dead claim with commits of its own is stranded: never released here.
 * @param c from claimOf()
 * @param f `{ namedBy(n), openPrBranches: Set, branchCommitAt(b), worktreeChangedAt(wt), ticketIn(wt), transcriptAt(session, b),
 *   sessionAlive(session), commitsAhead(b, wt), roundSession }`, times in ms (0 for none)
 * @param now ms
 * @returns `{ live, why, at, stranded, commits }`
 */
export function judgeClaim(c, f, now) {
    // Work that names the issue holds it whatever the markers say: on 2026-11-18 #8604-#8606 and #8311 (a bare label,
    // named by commits on fix/8609-model-dialog-round-5) and #7284 (named by open pull request #8757 on another
    // branch) were released while live. A label after a `released` marker is checked here too, before it is removed.
    const named = f.namedBy?.(c.n);
    if (named) return { live: true, why: named, at: c.at };
    if (c.kind === "released") return { live: false, why: "released, label left on", at: c.at, labelOnly: true };
    const at = Math.max(
        c.at || 0,
        c.branch ? f.branchCommitAt(c.branch) : 0,
        c.worktree ? f.worktreeChangedAt(c.worktree) : 0,
    );
    const ago = `${Math.round((now - at) / MIN)} min`;
    if (c.branch && f.openPrBranches.has(c.branch)) return { live: true, why: "open pull request", at };
    if (now - at < CLAIM_ACTIVE_MS) return { live: true, why: `active ${ago} ago`, at };
    if (c.worktree && f.ticketIn(c.worktree)) return { live: true, why: "holds or waits for a test slot", at };
    if (c.session && c.branch && now - f.transcriptAt(c.session, c.branch) < TRANSCRIPT_MS)
        return { live: true, why: "its subagent is writing", at };
    if (c.session && c.session !== f.roundSession && now - at < OTHER_SESSION_MS && f.sessionAlive(c.session))
        return { live: true, why: "its session is alive", at };
    const commits = c.branch || c.worktree ? f.commitsAhead(c.branch, c.worktree) : 0;
    return { live: false, why: `no activity for ${ago}`, at, stranded: commits > 0, commits };
}

/**
 * Which issues open pull requests and recently active branches name, for judgeClaim's namedBy: a pull request names
 * an issue by `#n` in its title or body (Fixes, Refs and Closes lines included) or by the number its branch starts
 * with; an unmerged branch by `#n` in one of its own commit messages or by its name.
 * @param o the open pull requests and the active branches
 * @param o.prs open pull requests `[{ number, headRefName, title, body }]`
 * @param o.branches `[{ name, messages }]`, only unmerged branches with a commit in the last 24 h
 * @returns Map from issue number to the reason it is live
 */
export function namedIssues({ prs = [], branches = [] }) {
    const named = new Map();
    const add = (n, why) => named.has(n) || named.set(n, why);
    const refs = (text) => [...(text ?? "").matchAll(/#(\d+)(?!\d)/g)].map((m) => Number(m[1]));
    const numberOf = (b) => /(?:^|\/)(\d+)(?:-|$)/.exec(b ?? "")?.[1];
    for (const p of prs) {
        const why = `open pull request #${p.number} names it`;
        for (const n of refs(`${p.title}\n${p.body}`)) add(n, why);
        if (numberOf(p.headRefName)) add(Number(numberOf(p.headRefName)), why);
    }
    for (const b of branches) {
        const why = `branch ${b.name}, active in 24 h, names it`;
        for (const n of refs(b.messages)) add(n, why);
        if (numberOf(b.name)) add(Number(numberOf(b.name)), why);
    }
    return named;
}

/**
 * Every claim judged, with what --fix does about each dead one.
 * @param issues GraphQL Issues labelled in-progress (from fetchLabelled)
 * @param facts as judgeClaim()
 * @param now ms
 * @returns `{ claims: [{ ...claimOf, ...judgeClaim, id, labelId, action }] }`, action release, unlabel, stranded or
 *   null (live)
 */
export function sweepClaims(issues, facts, now) {
    const claims = issues.map((issue) => {
        const c = claimOf(issue);
        const v = judgeClaim(c, facts, now);
        let action = null;
        if (v.labelOnly) action = "unlabel";
        else if (!v.live) action = v.stranded ? "stranded" : "release";
        const labelId = (issue.labels?.nodes ?? []).find((l) => l.name === "in-progress")?.id ?? null;
        return { ...c, ...v, id: issue.id, labelId, action };
    });
    return { claims };
}

// Paths only the owner may change (CLAUDE.md, "Secrets, checks and what only the owner does"); a blocked issue citing
// one stays blocked. A GUARD_PATHS file only turns auto-merge off: agents may edit it.
const OWNER_ONLY =
    /^(visual-baselines\/|visual-review-approvals\/|visual-review\/(passkeys\.json|trusted\/)|compact-mantine\/|design\/brand\/|\.github\/workflows\/ci\.yml$)/;
const HELD_LABELS = ["ux-owner", "needs-decision", "blocked"];
const citedPaths = (text) => [...text.matchAll(/[\w.-]+(?:\/[\w.*-]+)*\/[\w.*-]*/g)].map((m) => m[0]);

/**
 * Why an issue is held only by an owner label (ux-owner, needs-decision, blocked) or an enhancement's missing ux
 * label, or null when anything else also skips it (in-progress, an alarm, a tracker).
 * @param issue a GraphQL Issue
 * @returns the held reasons, or null
 */
export function heldBy(issue) {
    const labels = labelsOf(issue);
    const held = HELD_LABELS.filter((l) => labels.includes(l));
    const noUx = labels.includes("enhancement") && !labels.includes("ux-safe") && !labels.includes("ux-owner");
    if (!held.length && !noUx) return null;
    // as if decided: owner labels gone and an enhancement ux-safe; anything still skipping it is another reason
    const rest = labels
        .filter((l) => !HELD_LABELS.includes(l))
        .concat(labels.includes("enhancement") ? ["ux-safe"] : []);
    if (skipReason({ ...issue, labels: { nodes: rest.map((name) => ({ name })) } })) return null;
    return noUx ? [...held, "no ux label"] : held;
}

/**
 * One held issue's listing: its labels, the owner's newest comment, the newest comment naming a held label, and
 * `misheld` when it is blocked for GUARD_PATHS files alone (no owner-only path).
 * @param issue a GraphQL Issue with comments
 * @param guard GUARD_PATHS
 * @returns `{ number, title, held, author, ownerComment, reasonComment, cites, misheld }`
 */
export function heldEntry(issue, guard) {
    const held = heldBy(issue);
    const comments = (issue.comments?.nodes ?? []).filter((c) => trustedText(c));
    const last = (pred) => comments.findLast((c) => pred(c)) ?? null;
    const brief = (c) => (c ? { createdAt: c.createdAt, body: ascii((c.body ?? "").split("\n")[0]) } : null);
    const owner = last((c) => c.author.login === "apowers313");
    const reason = last((c) => HELD_LABELS.some((l) => (c.body ?? "").includes(l)));
    const paths = reason ? citedPaths(reason.body) : [];
    const misheld =
        held.includes("blocked") &&
        paths.some((p) => guard.test(p)) &&
        paths.every((p) => guard.test(p)) &&
        !paths.some((p) => OWNER_ONLY.test(p));
    return {
        number: issue.number,
        title: ascii(issue.title),
        held,
        author: issue.author?.login ?? "ghost",
        ownerComment: brief(owner),
        reasonComment: brief(reason),
        cites: reason ? [...reason.body.matchAll(/#(\d+)/g)].map((m) => Number(m[1])) : [],
        misheld,
    };
}

const PAGE_TEXT = `comments(last: 30) { nodes { databaseId createdAt ${TEXT} } }`;
const labelledQuery = `query($owner: String!, $name: String!, $after: String, $label: String!) {
  repository(owner: $owner, name: $name) {
    issues(states: OPEN, labels: [$label], first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { id number title createdAt ${TEXT} labels(first: 30) { nodes { id name } } ${PAGE_TEXT}
        timelineItems(itemTypes: [LABELED_EVENT], last: 10) { nodes { ... on LabeledEvent { createdAt label { name } } } } }
    }
  }
}`;
const HELD_QUERY = LIST_QUERY.replace(
    "labels(first: 30) { nodes { name } }",
    `labels(first: 30) { nodes { name } } ${PAGE_TEXT}`,
);
const OPEN_PR_QUERY = `query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { number headRefName title body } }
  }
}`;

const paged = (run, query, vars, pick) => {
    const all = [];
    let after;
    do {
        const page = pick(run(query, { ...REPO, ...vars, after }).repository);
        all.push(...page.nodes);
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
    } while (after);
    return all;
};

/**
 * Every open issue with a label, with comments and label events, 50 per GraphQL call, never capped.
 * @param label the label
 * @param run the GraphQL runner
 * @returns GraphQL Issues
 */
export const fetchLabelled = (label, run = gh) => paged(run, labelledQuery, { label }, (r) => r.issues);

const git = (root, args) => {
    try {
        return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
        return null;
    }
};
const mtime = (p) => {
    try {
        return statSync(p).mtimeMs;
    } catch {
        return 0;
    }
};

// Whether a session's process still runs: session files outlive their sessions and a pid can be reused, so the
// process start time must match too (shared.md, "Alive").
const sessionAlive = (session) => {
    const dir = join(homedir(), ".claude", "sessions");
    let names = [];
    try {
        names = readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
        return false;
    }
    for (const f of names) {
        try {
            const s = JSON.parse(readFileSync(join(dir, f), "utf8"));
            if (s.sessionId !== session) continue;
            const stat = readFileSync(`/proc/${s.pid}/stat`, "utf8");
            if (stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19] === String(s.procStart)) return true;
        } catch {
            // gone
        }
    }
    return false;
};

/**
 * The facts judgeClaim() reads, from git, the test-slot tickets, the session files and the transcripts.
 * @param root the main checkout
 * @param openPrBranches Set of branches with an open pull request
 * @returns the facts
 */
export function machineFacts(root, openPrBranches) {
    const abs = (wt) => resolve(root, wt);
    let cwds = [];
    try {
        cwds = (slots?.liveTickets(slots.slotDir()) ?? []).map((t) => {
            try {
                return readlinkSync(`/proc/${t.pid}/cwd`);
            } catch {
                return "";
            }
        });
    } catch {
        // no ticket directory: nothing runs
    }
    const transcripts = join(homedir(), ".claude", "projects", root.replaceAll(/[^A-Za-z0-9]/g, "-"));
    let roundSession = null;
    try {
        roundSession = readFileSync(join(root, "tmp", "issue-round", "last-round"), "utf8")
            .trim()
            .split(/\s+/)[1];
    } catch {
        // no round has run
    }
    return {
        openPrBranches,
        roundSession,
        // every unmerged branch on GitHub with a commit in the last 24 h, and its own commit messages
        recentBranches: (now) =>
            (
                git(root, ["for-each-ref", "--format=%(refname:short) %(committerdate:unix)", "refs/remotes/origin"]) ??
                ""
            )
                .split("\n")
                .map((l) => l.split(" "))
                .filter(
                    ([ref, t]) =>
                        ref?.startsWith("origin/") && ref !== "origin/master" && now - t * 1000 < OTHER_SESSION_MS,
                )
                .map(([ref]) => ({
                    name: ref.slice("origin/".length),
                    messages: git(root, ["log", "--no-merges", "--format=%B", `origin/master..${ref}`]) ?? "",
                }))
                .filter((b) => b.messages),
        branchCommitAt: (b) => Number(git(root, ["log", "-1", "--format=%ct", `origin/${b}`]) ?? 0) * 1000,
        worktreeChangedAt: (wt) => {
            const dir = abs(wt);
            if (!existsSync(dir)) return 0;
            const files = (git(dir, ["status", "--porcelain"]) ?? "").split("\n").filter(Boolean);
            const times = files.map((l) => mtime(join(dir, l.slice(3).split(" -> ").at(-1))));
            return Math.max(Number(git(dir, ["log", "-1", "--format=%ct", "HEAD"]) ?? 0) * 1000, ...times);
        },
        ticketIn: (wt) => cwds.some((c) => c === abs(wt) || c.startsWith(`${abs(wt)}/`)),
        transcriptAt: (session, branch) => {
            const dir = join(transcripts, session, "subagents");
            let best = 0;
            let names = [];
            try {
                names = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
            } catch {
                return 0;
            }
            for (const f of names) {
                const t = mtime(join(dir, f));
                if (t <= best || Date.now() - t > TRANSCRIPT_MS) continue;
                // the prompt is the first line; it names the job's branch
                if (readFileSync(join(dir, f), "utf8").slice(0, 16_384).includes(branch)) best = t;
            }
            return best;
        },
        sessionAlive,
        commitsAhead: (b, wt) => {
            if (b && git(root, ["rev-parse", "--verify", "--quiet", `origin/${b}`])) {
                return Number(git(root, ["rev-list", "--count", "--no-merges", `origin/master..origin/${b}`]) ?? 0);
            }
            // not on GitHub: the worktree's own commits, if it still exists
            if (wt && existsSync(abs(wt))) {
                return Number(git(abs(wt), ["rev-list", "--count", "--no-merges", "origin/master..HEAD"]) ?? 0);
            }
            return 0;
        },
    };
}

// GraphQL string literals take JSON's escapes.
const releaseMutation = (claims, body) =>
    `mutation { ${claims
        .map((c, k) => {
            const comment = body(c)
                ? `c${k}: addComment(input: { subjectId: "${c.id}", body: ${JSON.stringify(body(c))} }) { clientMutationId } `
                : "";
            return `${comment}r${k}: removeLabelsFromLabelable(input: { labelableId: "${c.id}", labelIds: ["${c.labelId}"] }) { clientMutationId }`;
        })
        .join("\n")} }`;

const mutateBatches = (run, items, body) => {
    for (let k = 0; k < items.length; k += 20) run(releaseMutation(items.slice(k, k + 20), body), {});
};

const PRIVATE = new Set(["id", "labelId", "taken"]); // node ids and the marker text stay out of the claims list

/**
 * The state file every reader of claims uses (worktree-cleanup.mjs heldBranches, the rounds, `idle`): the claims,
 * and in the old `marked` shape the taken marker of every claim still holding a branch, so a worktree whose claim is
 * live or stranded keeps its `branch <b>,` text.
 * @param claims from sweepClaims()
 * @param now ms
 * @returns the JSON object
 */
export function stateRecord(claims, now) {
    const held = claims.filter((c) => c.action === null || c.action === "stranded");
    return {
        sweptAt: new Date(now).toISOString(),
        claims: claims.map((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !PRIVATE.has(k)))),
        marked: {
            nodes: held.map((c) => ({ number: c.n, comments: { nodes: c.taken ? [{ body: c.taken }] : [] } })),
        },
    };
}

/**
 * The `claims` command: reads every in-progress issue and open pull request (paged, no cap), judges each claim, and
 * with `fix` releases the dead ones with no commits (the `released` marker and the label removal in one mutation per
 * 20 issues), removes a label a `released` marker left on, lifts `blocked` from issues whose cited pull requests have
 * all closed, and writes state.json. Stranded claims are only reported: the `open` and `fix-red` jobs and
 * pipeline-round's stranded branches take them.
 * @param o `{ fix, run, now, dir, root, facts }`; facts replaces machineFacts (tests)
 * @returns `{ code, out, claims }`
 */
export function claimsCommand(o = {}) {
    const { fix = false, run, now = Date.now(), root = mainRoot() } = o;
    // no default runner: the caller names GitHub (the command line, sweepIfStale) or a fake (tests)
    if (typeof run !== "function") throw new Error("claims: no GraphQL runner given");
    const dir = o.dir ?? join(root, "tmp", "issue-round");
    if (!o.facts && git(root, ["fetch", "-q", "--prune", "--no-tags", "origin"]) === null) {
        throw new Error("git fetch failed: claims unknown");
    }
    const issues = fetchLabelled("in-progress", run);
    const prs = paged(run, OPEN_PR_QUERY, {}, (r) => r.pullRequests);
    const machine = o.facts ?? machineFacts(root, new Set(prs.map((p) => p.headRefName)));
    const named = namedIssues({ prs, branches: machine.recentBranches?.(now) ?? [] });
    const facts = { ...machine, namedBy: (n) => named.get(n) ?? null };
    const { claims } = sweepClaims(issues, facts, now);
    const by = (a) => claims.filter((c) => c.action === a);
    const lines = [];
    let lifted = [];
    if (fix) {
        const iso = new Date(now).toISOString();
        const release = by("release").filter((c) => c.labelId);
        mutateBatches(
            run,
            release,
            (c) => `pipeline-round: released -- claims sweep ${iso}: ${c.why}, no commits of its own`,
        );
        mutateBatches(
            run,
            by("unlabel").filter((c) => c.labelId),
            () => null,
        );
        lifted = liftBlocked(run);
        const tmp = join(dir, `state.json.${process.pid}.tmp`);
        writeFileSync(tmp, `${JSON.stringify(stateRecord(claims, now), null, 2)}\n`);
        renameSync(tmp, join(dir, "state.json"));
    }
    const list = (cs) => cs.map((c) => `#${c.n}`).join(" ");
    for (const c of claims.filter((x) => x.action)) {
        lines.push(ascii(`${c.action} #${c.n} ${c.kind} ${c.branch ?? "-"} -- ${c.why}`));
    }
    const verb = fix ? "released" : "to release";
    const stranded = by("stranded");
    const strandedList = stranded.length ? ` (${list(stranded)})` : "";
    const liftedList = lifted.length ? `; blocked lifted ${list(lifted.map((n) => ({ n })))}` : "";
    lines.push(
        `claims: ${claims.length} in-progress, ${claims.filter((c) => c.live).length} live, ${by("release").length} ${verb}, ` +
            `${by("unlabel").length} label-only, ${stranded.length} stranded${strandedList}${liftedList}`,
    );
    return { code: 0, out: o.json ? JSON.stringify(stateRecord(claims, now), null, 2) : lines.join("\n"), claims };
}

/**
 * Lifts `blocked` from an issue whose reason comment cites pull requests that have all closed or merged (never
 * because a date passed: an owner decision does not expire).
 * @param run the GraphQL runner
 * @returns the issue numbers lifted
 */
function liftBlocked(run) {
    const blocked = fetchLabelled("blocked", run);
    const guard = /$^/; // misheld is a listing only; it never lifts a label
    const entries = blocked.map((i) => ({ issue: i, e: heldEntry(i, guard) })).filter((x) => x.e.cites.length);
    const cited = [...new Set(entries.flatMap((x) => x.e.cites))];
    if (!cited.length) return [];
    const states = new Map();
    for (let k = 0; k < cited.length; k += 40) {
        const part = cited.slice(k, k + 40);
        const items = part.map(
            (n) => `p${n}: issueOrPullRequest(number: ${n}) { __typename ... on PullRequest { state } }`,
        );
        const data = run(
            `query { repository(owner: "${REPO.owner}", name: "${REPO.name}") { ${items.join("\n")} } }`,
            {},
        );
        for (const n of part) states.set(n, data?.repository?.[`p${n}`] ?? null);
    }
    const lift = entries.filter(({ e }) => {
        const prs = e.cites.map((n) => states.get(n)).filter((v) => v?.__typename === "PullRequest");
        return prs.length && prs.every((p) => p.state !== "OPEN");
    });
    const items = lift.map(({ issue }) => ({
        id: issue.id,
        labelId: issue.labels.nodes.find((l) => l.name === "blocked")?.id,
    }));
    mutateBatches(
        run,
        items.filter((x) => x.labelId),
        () => "pipeline-round: released -- the pull request this was blocked on closed; blocked label removed",
    );
    return lift.map(({ issue }) => issue.number);
}

/**
 * The `jobs` output.
 * @param result from jobs()
 * @param rest the arguments after `jobs`
 * @returns `{ code, out }`, code 3 when the free queue must be rebuilt
 */
function jobsCommand(result, rest) {
    if (result.stale) return { code: 3, out: `stale: rebuild the free queue (${result.stale})` };
    if (rest.includes("--json")) return { code: 0, out: JSON.stringify(result, null, 2) };
    const lines = result.jobs.map((j) => {
        if (j.unscanned) return `job ${hashes(j.issues)} ${j.priority} unscanned -- not in the free-queue scan`;
        const why = j.why || "no reason given";
        return ascii(`job ${hashes(j.issues)} ${j.priority} -- ${why}; files ${j.files.join(" ") || "none named"}`);
    });
    const issues = result.jobs.reduce((t, j) => t + j.issues.length, 0);
    const grouped = result.jobs.filter((j) => j.issues.length > 1).length;
    lines.push(`${result.jobs.length} jobs, ${issues} issues, ${grouped} grouped`);
    if (result.rescan.length) lines.push(`rescan: ${hashes(result.rescan)} -- start the free-queue scan`);
    return { code: 0, out: lines.join("\n") };
}

/**
 * Marks a job: the in-progress label and the taken marker on each of its issues. A gh failure on one issue does not
 * stop the rest; the output names the issues marked and the ones that failed, and the code is 1 when any failed.
 * @param marker from takenMarker()
 * @param cli runs a gh command
 * @returns `{ code, out }`
 */
function takenCommand(marker, cli) {
    if (marker.error) return { code: 2, out: marker.error };
    const repo = `${REPO.owner}/${REPO.name}`;
    const marked = [];
    const failed = [];
    for (const n of marker.issues) {
        try {
            cli(["issue", "edit", String(n), "-R", repo, "--add-label", "in-progress"]);
            cli(["issue", "comment", String(n), "-R", repo, "--body", marker.body]);
            marked.push(n);
        } catch (error) {
            failed.push(`#${n} (${String(error.message).split("\n")[0]})`);
        }
    }
    if (!failed.length) return { code: 0, out: marker.body };
    const done = marked.length ? hashes(marked) : "none";
    return { code: 1, out: `taken: marked ${done}; failed ${failed.join(", ")} -- mark the failed ones again` };
}

/**
 * The `list` output: the queue, in the round's order.
 * @param run the GraphQL runner
 * @param rest the arguments after `list`
 * @param now ms
 * @returns `{ code, out }`
 */
function listCommand(run, rest, now) {
    const i = rest.indexOf("--limit");
    const limit = i >= 0 ? Number(rest[i + 1]) : Infinity;
    const result = queue(fetchOpen(run), now);
    if (rest.includes("--json")) {
        return { code: 0, out: JSON.stringify({ ...result, queue: result.queue.slice(0, limit) }, null, 2) };
    }
    return { code: 0, out: listLines(result, limit).join("\n") };
}

/**
 * The `list --held` output.
 * @param run the GraphQL runner
 * @param rest the arguments after `list`
 * @param guard GUARD_PATHS
 * @returns `{ code, out }`
 */
function heldCommand(run, rest, guard) {
    const held = paged(run, HELD_QUERY, {}, (r) => r.issues)
        .filter((i) => trustedText(i) && heldBy(i))
        .map((i) => heldEntry(i, guard));
    if (rest.includes("--json")) return { code: 0, out: JSON.stringify(held, null, 2) };
    const lines = held.map((h) => {
        const mis = h.misheld ? " MISHELD (GUARD_PATHS only)" : "";
        return `#${h.number} ${h.held.join(",")}${mis} by ${h.author} -- ${h.reasonComment?.body ?? "no reason comment"}`;
    });
    lines.push(`${held.length} held issues, ${held.filter((h) => h.misheld).length} misheld`);
    return { code: 0, out: ascii(lines.join("\n")) };
}

/**
 * The command line.
 * @param argv arguments after the script
 * @param run the GraphQL runner
 * @param now ms
 * @param stdin reads standard input, for `filter`
 * @param deps `{ freeQueue, cli, env }`: reads the free-queue cache, runs a gh command, the environment
 * @returns `{ code, out }`
 */
export function main(argv, run = gh, now = Date.now(), stdin = () => readFileSync(0, "utf8"), deps = {}) {
    const { freeQueue = readFreeQueue, cli = ghCli, env = process.env } = deps;
    const [cmd, ...rest] = argv;
    if (cmd === "jobs") return jobsCommand(jobs(freeQueue(), queue(fetchOpen(run), now).queue, now), rest);
    if (cmd === "taken") return takenCommand(takenMarker(rest, env.CLAUDE_CODE_SESSION_ID), cli);
    const sweepOrHeld = {
        claims: () =>
            claimsCommand({ fix: rest.includes("--fix"), json: rest.includes("--json"), run, now, ...deps.claims }),
        held: () => heldCommand(run, rest, (deps.guard ?? guardPaths)()),
    }[cmd === "list" && rest.includes("--held") ? "held" : cmd];
    if (sweepOrHeld) return sweepOrHeld();
    if (cmd === "list") return listCommand(run, rest, now);
    if (cmd === "show" && /^\d+$/.test(rest[0] ?? "")) {
        const issue = run(SHOW_QUERY, { ...REPO, number: Number(rest[0]) }).repository.issue;
        const text = issue && showText(issue);
        if (!text)
            return {
                code: 1,
                out: `issue-queue: #${rest[0]} refused: missing, or written or edited by an untrusted account`,
            };
        return { code: 0, out: text };
    }
    if (cmd === "filter") return { code: 0, out: JSON.stringify(withhold(JSON.parse(stdin())), null, 2) };
    return {
        code: 2,
        out: "usage: issue-queue.mjs list [--limit N] [--json] | list --held [--json] | claims [--fix] [--json] | show <n> | filter < graphql.json | jobs [--json] | taken <branch> <worktree> <n>... --files <path>... --why <reason>",
    };
}

/**
 * Runs `main` as the command line when `url` is the script node was started with.
 * @param url - the calling module's import.meta.url
 * @param name - the tool name that prefixes an error
 * @param main - the command line
 */
export function runCli(url, name, main) {
    if (url !== pathToFileURL(process.argv[1] ?? "").href) return;
    fromCli = true;
    try {
        const { code, out } = main(process.argv.slice(2));
        (code === 0 ? console.log : console.error)(out);
        process.exitCode = code;
    } catch (error) {
        console.error(`${name}: ${error.message.split("\n")[0]}`);
        process.exitCode = 2;
    }
}

runCli(import.meta.url, "issue-queue", main);
