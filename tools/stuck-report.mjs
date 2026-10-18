#!/usr/bin/env node
// Lists every unit of work that has not reached master: each branch (local or on origin) with
// commits master does not have, and each open pull request. For each it gives its age, whether it
// touches product code (`<package>/src/`) and the one thing it is waiting on.
//
//   node tools/stuck-report.mjs           a table, oldest first
//   node tools/stuck-report.mjs --json    the full list as JSON
//   node tools/stuck-report.mjs --page    also page the owner once when product work has waited
//                                         over 24 hours (not the same branch again within 24 hours)
//   node tools/stuck-report.mjs --watch   fetch origin and run --page every hour (for servherd)
//
// Pull requests come from tmp/pr-status/status.json, which tools/pr-status-broker.mjs keeps fresh;
// this tool never calls the GitHub API. Branches are read from the repository's shared refs, so any
// checkout gives the same answer; its files go in the main checkout's tmp/.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const MASTER = "origin/master";
// STUCK_REPORT_NOTIFY replaces the notifier, to try --page without paging anyone.
const NOTIFY = process.env.STUCK_REPORT_NOTIFY ?? "/home/apowers/.claude/scripts/claude-notify.sh";

// Checks that only summarize others; a failure in one of them is explained by the others.
const SUMMARY = new Set(["All Checks Pass", "Queue Checks Pass", "Mergify Merge Protections", "Mergify Merge Queue"]);
const FAILED = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE", "ERROR"]);
const RUNNING = new Set(["IN_PROGRESS", "QUEUED", "PENDING", "WAITING", "REQUESTED", "EXPECTED"]);

/**
 * The one thing a unit of unlanded work is waiting on: the first that applies, in the order below.
 * The visual-review gate is a step of "All Checks Pass", so that check red with no other check red
 * is the gate refusing images the owner has not accepted (status.json carries no annotation text).
 * @param pr the pull request's record from status.json, or null when there is none
 * @returns the blocker
 */
export function classify(pr) {
    if (!pr) {
        return "no pull request";
    }
    if (pr.draft) {
        return "draft";
    }
    if (pr.mergeable === "CONFLICTING") {
        return `conflicts with ${pr.base}`;
    }
    const checks = Object.entries(pr.checks ?? {});
    const failing = checks.filter(([name, s]) => FAILED.has(s) && !SUMMARY.has(name)).map(([name]) => name);
    if (failing.length > 0) {
        return `failing check: ${failing[0]}${failing.length > 1 ? ` (+${failing.length - 1} more)` : ""}`;
    }
    if (FAILED.has(pr.checks?.["All Checks Pass"])) {
        return "waiting for the owner's screenshot review";
    }
    const failedSummary = checks.find(([, s]) => FAILED.has(s));
    if (failedSummary) {
        return `failing check: ${failedSummary[0]}`;
    }
    if (checks.some(([name, s]) => RUNNING.has(s) && !name.startsWith("Mergify"))) {
        return "checks running";
    }
    if (pr.labels?.includes("queued")) {
        return "queued";
    }
    if (pr.labels?.includes("hold")) {
        return "held";
    }
    if (pr.base !== "master") {
        return `stacked on ${pr.base}`;
    }
    return "ready but not queued (BUG: green, no hold, no conflict, not merging)";
}

const git = (...args) =>
    execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const lines = (s) => s.split("\n").filter(Boolean);
const skipped = (name) => name === "HEAD" || name === "master" || /^(backup|mergify)\//.test(name);

/**
 * One git ref's unlanded commits, or null when it has none master lacks.
 * @param ref the ref
 * @returns its facts
 */
function branchFacts(ref) {
    const times = lines(git("log", "--no-merges", "--format=%ct", `${MASTER}..${ref}`)).map(Number);
    if (times.length === 0) {
        return null;
    }
    return {
        commits: times.length,
        oldest: Math.min(...times) * 1000,
        // ponytail: the tip's committer date stands in for the push time; git keeps no push time.
        lastPush: Number(git("log", "-1", "--format=%ct", ref).trim()) * 1000,
        product: lines(git("log", "--no-merges", "--name-only", "--format=", `${MASTER}..${ref}`)).some((f) =>
            /^[^/]+\/src\//.test(f),
        ),
        onMaster: !lines(git("cherry", MASTER, ref)).some((l) => l.startsWith("+")),
    };
}

/**
 * Every unit of unlanded work: branches ahead of master whose content is not already there, and
 * every open pull request.
 * @param prs status.json's pullRequests
 * @returns the items, oldest first
 */
export function collect(prs) {
    // For a branch both local and on origin, the ref with more commits ahead stands for it.
    const best = new Map();
    for (const row of lines(
        git("for-each-ref", `--format=%(refname) %(ahead-behind:${MASTER})`, "refs/heads", "refs/remotes/origin"),
    )) {
        const [refname, ahead] = row.split(" ");
        const name = refname.replace(/^refs\/(heads|remotes\/origin)\//, "");
        if (Number(ahead) > 0 && !skipped(name) && !(best.get(name)?.ahead >= Number(ahead))) {
            best.set(name, { ref: refname, ahead: Number(ahead) });
        }
    }
    const byHead = new Map(prs.filter((p) => !p.head.startsWith("mergify/")).map((p) => [p.head, p]));
    const items = [];
    for (const name of new Set([...best.keys(), ...byHead.keys()])) {
        const pr = byHead.get(name) ?? null;
        const ref = best.get(name)?.ref;
        const facts = ref ? branchFacts(ref) : null;
        if (!pr && (!facts || facts.onMaster)) {
            continue;
        }
        items.push({
            branch: name,
            pr: pr?.number ?? null,
            commits: facts?.commits ?? 0,
            oldest: facts ? new Date(facts.oldest).toISOString() : null,
            lastPush: facts ? new Date(facts.lastPush).toISOString() : null,
            product: facts?.product ?? false,
            blocker: classify(pr),
        });
    }
    const t = (i) => (i.oldest ? Date.parse(i.oldest) : Infinity);
    return items.sort((a, b) => t(a) - t(b));
}

const age = (iso, now) => {
    if (!iso) {
        return "-";
    }
    const h = Math.floor((now - Date.parse(iso)) / HOUR);
    return h >= 48 ? `${Math.floor(h / 24)}d` : `${h}h`;
};

function table(items, now) {
    const rows = [["AGE", "PUSHED", "PR", "SRC", "COMMITS", "BRANCH", "BLOCKER"]];
    for (const i of items) {
        rows.push([
            age(i.oldest, now),
            age(i.lastPush, now),
            i.pr ? `#${i.pr}` : "NO PR",
            i.product ? "yes" : "no",
            String(i.commits),
            i.branch,
            i.blocker,
        ]);
    }
    const width = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
    return rows
        .map((r) => r.map((cell, c) => (c === r.length - 1 ? cell : cell.padEnd(width[c]))).join("  "))
        .join("\n");
}

/**
 * Pages the owner once about product work that has waited over 24 hours, leaving out branches
 * paged in the last 24 hours, and records what it paged.
 * @param items the report
 * @param pagedFile where paged branches are remembered
 * @param now the time
 */
function page(items, pagedFile, now) {
    let paged = {};
    try {
        paged = JSON.parse(readFileSync(pagedFile, "utf8"));
    } catch {
        // First run, or an unreadable file: page everything due.
    }
    const due = items.filter((i) => i.product && i.oldest && now - Date.parse(i.oldest) > DAY);
    const fresh = due.filter((i) => !(now - (paged[i.branch] ?? 0) < DAY));
    if (fresh.length === 0) {
        return;
    }
    const oldest = fresh
        .slice(0, 3)
        .map((i) => `${i.branch} (${i.pr ? `#${i.pr}` : "NO PR"}, ${age(i.oldest, now)}): ${i.blocker}`);
    const message = `${due.length} product changes have waited over 24h to reach master. Oldest: ${oldest.join("; ")}`;
    execFileSync(NOTIFY, ["waiting", message, `Stuck work: ${due.length} unlanded`], { stdio: "inherit" });
    for (const i of fresh) {
        paged[i.branch] = now;
    }
    mkdirSync(dirname(pagedFile), { recursive: true });
    writeFileSync(pagedFile, `${JSON.stringify(paged, null, 2)}\n`);
}

function run(args, mainCheckout) {
    const status = JSON.parse(readFileSync(join(mainCheckout, "tmp/pr-status/status.json"), "utf8"));
    const now = Date.now();
    const items = collect(status.pullRequests ?? []);
    if (args.includes("--json")) {
        console.log(JSON.stringify({ at: new Date(now).toISOString(), prStatusAt: status.fetchedAt, items }, null, 2));
    } else {
        console.log(table(items, now));
        console.log(`\n${items.length} items; pull request status from ${status.fetchedAt}`);
    }
    if (args.includes("--page") || args.includes("--watch")) {
        page(items, join(mainCheckout, "tmp/stuck-report/paged.json"), now);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const mainCheckout = dirname(git("rev-parse", "--path-format=absolute", "--git-common-dir").trim());
    if (args.includes("--watch")) {
        const cycle = () => {
            try {
                git("fetch", "--prune", "--quiet", "origin");
                run(args, mainCheckout);
            } catch (e) {
                console.error(`stuck-report: ${e.message}`);
            }
        };
        cycle();
        setInterval(cycle, HOUR);
    } else {
        run(args, mainCheckout);
    }
}
