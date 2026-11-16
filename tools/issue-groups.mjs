#!/usr/bin/env node
// The issue-group ledger (design/ci/issue-grouping.md): which open issues are fixed together on one branch, why, and
// where each group is in its life. issue-round routes issues into groups with it and takes its jobs from it.
//
// The ledger is a local cache, tmp/issue-round/groups.json in the checkout that holds this tool (ISSUE_GROUPS_LEDGER
// overrides the path). It is not the record of truth for started work: the `pipeline-round:` markers on the issues
// are, and `check --fix` brings the ledger back in line with them and with each pull request's state. Proposed groups
// (nobody working on them yet) live only here and are re-judged by every free-queue scan.
//
//   seed <file> [--force]                  load a ledger file (the first ledger, or a rebuilt one)
//   show [<group>|<issue>] [--json]        one group, the group holding an issue, or the summary line
//   create <lead> [<n>:<test>...] --why <reason> [--files <path>...]
//                                          a proposed group; tests are T1, T1-fold, T2, T3, T4, T5
//   add <group> <n> --test <T#> [--why <reason>]
//                                          a member for a proposed group, or a join to a ready branch (2 at most)
//   route <n> [--to <group> --test <T#>] [--why <reason>]
//                                          puts an issue where the target's state says: in it, waiting on it, in
//                                          its follow-up group, or in a new group of its own
//   import-scan [<free-queue.json>]        replaces the proposed groups with the free-queue scan's jobs
//   start <group> <branch> | ready <group> <sha> | freeze <group> <pr> | close <group> --merged|--unmerged
//   release <group> <n> --why <reason>     a member that turned out not to belong (never routed back there)
//   wait <n> --on <group|branch|#pr> [--x9 <sha>] --why <reason>
//   archive                                moves groups closed or dissolved over 7 days ago to groups-archive.jsonl
//   compact                                archive, plus drops stale proposals, settled waits and old history
//   check [--fix] [--json]                 drift against GitHub: markers, labels, pull request states
//   jobs [--json]                          the jobs to start, from the ledger (issue-queue.mjs jobs while empty)
//   metrics [--append] [--json]            throughput and guardrails over the last 7 days
//
// Exit codes: 0 done, 1 refused (the reason is printed), 2 usage, 3 the ledger is busy (run it again).
import { execFileSync } from "node:child_process";
import {
    appendFileSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
    closeSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { fetchOpen, queue, trustedText } from "./issue-queue.mjs";

const REPO = "graphty-org/graphty-monorepo";
const DEFAULT_LEDGER = fileURLToPath(new URL("../tmp/issue-round/groups.json", import.meta.url));

export const MAX_ISSUES = 4;
export const MAX_POINTS = 6;
export const MAX_JOINS = 2;
const HOUR = 3_600_000;
const ARCHIVE_AFTER_MS = 7 * 24 * HOUR;
const PROPOSED_TTL_MS = 24 * HOUR; // a proposal no scan has confirmed in a day is dropped; the next scan re-judges it
const SCAN_STALE_MS = 2 * HOUR;
const WAIT_LIMIT_MS = 24 * HOUR;
const RED_PR_IDLE_MS = 6 * HOUR;
const HISTORY_KEEP = 30;
const POINTS = { low: 1, medium: 2, high: 3 };
const TESTS = ["T1", "T1-fold", "T2", "T3", "T4", "T5"];
const LIVE = new Set(["proposed", "started", "ready", "frozen"]);
// Labels that keep an issue out of every group (rubric X3 owner-only, X7 tracker).
const OWNER_LABELS = ["needs-decision", "hold", "blocked", "ux-owner"];
const TRACKER_LABELS = ["tracking"];
const FOLLOW_UP_WAIT = /^(T[1-5]|X8)/;
const STATE_MARKER = /^pipeline-round: (taken|ready|opened|released|restarted)\b(.*)/;

/** A command refused for a reason the caller can act on (exit code 1). */
export class Refused extends Error {}

// ---------------------------------------------------------------------------------------------------------------
// The ledger file: read, and change under a lock with an atomic write.

/**
 * A ledger with no groups.
 * @returns the ledger
 */
export const emptyLedger = () => ({ builtAt: null, scannedAt: null, groups: [], waits: [] });

/**
 * The ledger at a path. A missing file is an empty ledger; a file that does not parse is an error, never "no groups".
 * @param path the ledger file
 * @returns the ledger
 */
export function readLedger(path) {
    let text;
    try {
        text = readFileSync(path, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") return emptyLedger();
        throw error;
    }
    const ledger = JSON.parse(text);
    if (!Array.isArray(ledger.groups)) throw new Error(`${path} has no groups list`);
    ledger.waits ??= [];
    return ledger;
}

const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const alive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === "EPERM";
    }
};

// Takes the lock file: O_EXCL create; a dead holder's lock is broken; a live holder is retried for about 2 s.
const acquire = (lock) => {
    let attempt = 0;
    for (;;) {
        try {
            return openSync(lock, "wx");
        } catch (error) {
            if (error.code !== "EEXIST") throw error;
        }
        const holder = lockHolder(lock);
        if (holder && !alive(holder)) breakLock(lock);
        else if (attempt++ >= 100) {
            throw Object.assign(new Error(`the ledger is busy (lock ${lock} held by ${holder})`), { busy: true });
        } else sleepMs(20);
    }
};

const lockHolder = (lock) => {
    try {
        return Number(readFileSync(lock, "utf8"));
    } catch {
        return 0; // the holder removed it between our open and our read
    }
};

const breakLock = (lock) => {
    try {
        unlinkSync(lock);
    } catch {
        // another process broke it first
    }
};

/**
 * Changes the ledger under an exclusive lock file and writes it atomically (a temporary file, then a rename). A lock
 * left by a dead process is broken; a live holder is retried for about two seconds, then the call fails with Busy.
 * @param path the ledger file
 * @param change `(ledger) => result`; it mutates the ledger it is given
 * @returns the change's result
 */
export function mutate(path, change) {
    mkdirSync(dirname(path), { recursive: true });
    const lock = `${path}.lock`;
    const fd = acquire(lock);
    try {
        writeFileSync(fd, String(process.pid));
        const ledger = readLedger(path);
        const result = change(ledger);
        const tmp = `${path}.${process.pid}.tmp`;
        writeFileSync(tmp, `${JSON.stringify(ledger, null, 2)}\n`);
        renameSync(tmp, path);
        return result;
    } finally {
        closeSync(fd);
        unlinkSync(lock);
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Groups and their sizes.

const counted = (m) => !String(m.test).startsWith("X7");
export const isLive = (g) => LIVE.has(g.state);

/**
 * A group's size against the cap: trackers never count, a T1 fold counts no points.
 * @param group a group
 * @returns `{ issues, points }`
 */
export function size(group) {
    const members = group.members.filter((m) => counted(m));
    return {
        issues: members.length,
        points: members.reduce((t, m) => t + (m.test === "T1-fold" ? 0 : (m.points ?? 2)), 0),
    };
}

const fitsWith = (group, member) => {
    const { issues, points } = size(group);
    const extra = member.test === "T1-fold" ? 0 : member.points;
    if (issues + 1 > MAX_ISSUES) return `full: ${issues} issues already (cap ${MAX_ISSUES})`;
    if (points + extra > MAX_POINTS) return `full: ${points} + ${extra} effort points (cap ${MAX_POINTS})`;
    return null;
};

/**
 * The live group holding an issue as a member.
 * @param ledger the ledger
 * @param n an issue number
 * @returns the group, or undefined
 */
export function groupOf(ledger, n) {
    return ledger.groups.find((g) => isLive(g) && g.members.some((m) => m.n === n));
}

const groupById = (ledger, id) => {
    const g = ledger.groups.find((x) => x.id === id);
    if (!g) throw new Refused(`no group ${id}`);
    return g;
};

/**
 * The group a wait or an argument names: a group id, a branch (or an old branch name of a batch), or `#<pr>`.
 * @param ledger the ledger
 * @param on the name, for example `g8189`, `fix/8246-dash-lengths (#8263)` or `#8263`
 * @returns the group, or undefined
 */
export function resolveTarget(ledger, on) {
    const text = String(on);
    const byId = ledger.groups.find((g) => g.id === text);
    if (byId) return byId;
    const pr = /#(\d+)/.exec(text);
    const branch = text.split(" ")[0];
    const newest = (list) => list.find((g) => isLive(g)) ?? list.at(-1);
    return newest(
        ledger.groups.filter(
            (g) => (pr && g.pr === Number(pr[1])) || g.branch === branch || (g.aliases ?? []).includes(branch),
        ),
    );
}

const event = (group, at, name, extra = {}) => {
    group.history.push({ at, event: name, by: process.env.CLAUDE_CODE_SESSION_ID ?? "cli", ...extra });
};

const freshId = (ledger, lead) => {
    let id = `g${lead}`;
    let k = 2;
    while (ledger.groups.some((g) => g.id === id)) id = `g${lead}-${k++}`;
    return id;
};

/**
 * Points for an issue from its effort label: low 1, medium 2, high 3, none 2.
 * @param labels label names
 * @returns points
 */
export function pointsOf(labels) {
    const effort = Object.keys(POINTS).find((e) => labels.includes(`effort:${e}`));
    return effort ? POINTS[effort] : 2;
}

/**
 * Why an issue may not be in any group (rubric X3 owner-only, X7 tracker), or null.
 * @param facts `{ labels }`
 * @returns the reason, or null
 */
export function excluded(facts) {
    const owner = OWNER_LABELS.find((l) => facts.labels.includes(l));
    if (owner) return `X3 owner-only (label ${owner})`;
    if (TRACKER_LABELS.some((l) => facts.labels.includes(l)))
        return "X7 tracker (name it with Refs, never as a member)";
    return null;
}

const critical = (facts) => facts.labels.includes("priority:critical");

const checkTest = (test) => {
    if (!TESTS.includes(test)) throw new Refused(`test must be one of ${TESTS.join(", ")} (got ${test ?? "none"})`);
};

/**
 * A member record from GitHub facts.
 * @param n the issue
 * @param test its rubric test, or "lead"
 * @param facts `{ labels }`
 * @returns the member
 */
const memberOf = (n, test, facts) => ({ n, test, points: pointsOf(facts.labels), triage: false, unreadable: false });

/**
 * Creates a proposed group.
 * @param ledger the ledger
 * @param spec `{ lead, members: [{ n, test }], why, files, now, facts }`, facts a Map of issue -> `{ labels }`
 * @returns the new group
 */
export function createGroup(ledger, spec) {
    const { lead, members = [], why, files = [], now, facts } = spec;
    if (!why?.trim()) throw new Refused("--why is required: the rubric test and the reason the issues belong together");
    const all = [{ n: lead, test: "lead" }, ...members];
    for (const m of all) {
        const other = groupOf(ledger, m.n);
        if (other) throw new Refused(`#${m.n} is already in ${other.id} (${other.state})`);
        const f = facts.get(m.n);
        if (!f) throw new Refused(`#${m.n} could not be read`);
        const reason = excluded(f);
        if (reason) throw new Refused(`#${m.n}: ${reason}`);
        if (m.test !== "lead") checkTest(m.test);
    }
    const group = {
        id: freshId(ledger, lead),
        branch: null,
        aliases: [],
        lead,
        state: "proposed",
        lane: null,
        batch: false,
        members: [],
        files,
        why,
        pr: null,
        prState: null,
        held: null,
        parked: null,
        followUp: null,
        after: null,
        joins: 0,
        created: new Date(now).toISOString(),
        refreshed: new Date(now).toISOString(),
        started: null,
        readySince: null,
        frozen: null,
        closed: null,
        history: [],
    };
    for (const m of all) {
        const member = memberOf(m.n, m.test, facts.get(m.n));
        checkCritical(member, group, facts);
        const full = group.members.length ? fitsWith(group, member) : null;
        if (full) throw new Refused(`#${m.n}: ${full}`);
        group.members.push(member);
    }
    event(group, group.created, "create", { why, members: all.map((m) => m.n) });
    ledger.groups.push(group);
    return group;
}

// Rubric X2: a critical issue joins, or takes members, only through T1 or T2.
const checkCritical = (member, group, facts) => {
    if (member.test === "lead" || !group.members.length) return;
    const leadCritical = critical(facts.get(group.lead) ?? { labels: [] });
    const memberCritical = critical(facts.get(member.n) ?? { labels: [] });
    if ((leadCritical || memberCritical) && !["T1", "T1-fold", "T2"].includes(member.test)) {
        throw new Refused(`#${member.n}: a critical issue groups only through T1 or T2 (rubric X2)`);
    }
};

/**
 * Adds a member: to a proposed group, or as a join to a ready branch (at most MAX_JOINS over its life, which makes
 * it started again until its joiner writes `ready`). Started, frozen, closed and dissolved groups never take members.
 * @param ledger the ledger
 * @param id the group
 * @param spec `{ n, test, why, now, facts }`
 * @returns `{ group, joined }`
 */
export function addMember(ledger, id, spec) {
    const { n, test, why, now, facts } = spec;
    checkTest(test);
    const group = groupById(ledger, id);
    const other = groupOf(ledger, n);
    if (other) throw new Refused(`#${n} is already in ${other.id} (${other.state})`);
    if (wasReleased(group, n)) throw new Refused(`#${n} was released from ${group.id}; it is never routed back there`);
    const f = facts.get(n);
    if (!f) throw new Refused(`#${n} could not be read`);
    const reason = excluded(f);
    if (reason) throw new Refused(`#${n}: ${reason}`);
    if (group.held) throw new Refused(`${group.id} is held (${group.held})`);
    const member = memberOf(n, test, f);
    checkCritical(member, group, facts);
    const full = fitsWith(group, member);
    if (full) throw new Refused(`${group.id} is ${full}`);
    const at = new Date(now).toISOString();
    if (group.state === "proposed") {
        group.members.push(member);
        group.refreshed = at;
        event(group, at, "add", { issue: n, test, why });
        return { group, joined: false };
    }
    if (group.state === "ready") {
        if (group.joins >= MAX_JOINS) throw new Refused(`${group.id} has had ${group.joins} joins (cap ${MAX_JOINS})`);
        group.members.push(member);
        group.joins += 1;
        group.state = "started";
        event(group, at, "join", { issue: n, test, why });
        return { group, joined: true };
    }
    throw new Refused(`${group.id} is ${group.state}: it takes no members (route the issue instead)`);
}

const wasReleased = (group, n) => group.history.some((h) => h.event === "release" && h.issue === n);

// Why an issue may never be routed to this group again: it was released from it, or its wait on it expired.
const barred = (ledger, target, n) => {
    if (wasReleased(target, n)) return `released from ${target.id} before`;
    const expired = ledger.waits.some((w) => w.issue === n && w.expired && resolveTarget(ledger, w.on) === target);
    return expired ? `its wait on ${target.id} expired before` : null;
};

const refuseExcluded = (n, facts, suffix = "") => {
    const f = facts.get(n);
    if (!f) throw new Refused(`#${n} could not be read`);
    const reason = excluded(f);
    if (reason) throw new Refused(`#${n}: ${reason}${suffix}`);
    return f;
};

const liveWaits = (ledger) => ledger.waits.filter((w) => !w.ended && !w.expired);

/**
 * Routes an issue (design section "Routing a new issue"). With no target, or a closed or dissolved one, it starts a
 * new group of its own. A proposed target takes it; a started or ready one makes it wait (a ready branch takes it as a
 * join only with `join`, which the round passes only after checking the join rule of issue-round step 4); a frozen
 * one (its pull request open) puts it in that group's single follow-up group, which starts when the pull request
 * merges.
 * @param ledger the ledger
 * @param spec `{ n, to, test, why, now, facts, join }`
 * @returns one line saying where it went
 */
export function route(ledger, spec) {
    const { n, to, test, why, now, facts, join = false } = spec;
    const at = new Date(now).toISOString();
    const already = groupOf(ledger, n);
    if (already) return `#${n} is already in ${already.id} (${already.state})`;
    refuseExcluded(n, facts, "; not routed");
    const own = (note) => {
        const g = createGroup(ledger, { lead: n, why: why || note, now, facts });
        return `#${n} starts ${g.id} (${note})`;
    };
    if (!to) return own("no group fits");
    checkTest(test);
    const target = resolveTarget(ledger, to);
    if (!target || !isLive(target)) return own(`${to} is ${target?.state ?? "unknown"}`);
    const before = barred(ledger, target, n);
    if (before) return own(before);
    const spec2 = { n, test, why, now, facts, at, own };
    if (target.state === "frozen") return routeToFrozen(ledger, target, spec2);
    const waiting = liveWaits(ledger).filter((w) => w.issue === n && resolveTarget(ledger, w.on) === target);
    if (target.state === "started" || (target.state === "ready" && !join))
        return waitOn(ledger, target, spec2, waiting);
    try {
        const { joined } = addMember(ledger, target.id, { n, test, why, now, facts });
        for (const w of waiting) w.ended = `${at} joined`;
        return `#${n} ${joined ? "joins ready" : "added to"} ${target.id} (${test})`;
    } catch (error) {
        if (!(error instanceof Refused)) throw error;
        return own(error.message);
    }
}

// A started branch, or a ready one the round did not join: the issue waits (one live wait per issue and branch).
const waitOn = (ledger, target, spec, waiting) => {
    const { n, test, why, at } = spec;
    if (!waiting.length) {
        ledger.waits.push({ issue: n, on: target.id, test, since: at, why: why ?? "", ended: null, expired: null });
    }
    const until = target.state === "started" ? "is ready" : "merges, or a join (route --join) takes it";
    return `#${n} waits on ${target.id} (${test}): it goes on once ${target.branch} ${until}`;
};

// A frozen group's pull request is open and never takes another issue: the issue goes to its single follow-up group.
const routeToFrozen = (ledger, target, spec) => {
    const { n, test, why, now, facts, at, own } = spec;
    let follow = target.followUp ? ledger.groups.find((g) => g.id === target.followUp && isLive(g)) : undefined;
    if (follow) {
        if (follow.state !== "proposed") return own(`follow-up ${follow.id} of ${target.id} already ${follow.state}`);
        try {
            addMember(ledger, follow.id, { n, test, why, now, facts });
        } catch (error) {
            if (!(error instanceof Refused)) throw error;
            throw new Refused(`#${n}: follow-up full (${follow.id} of ${target.id}: ${error.message})`);
        }
    } else {
        follow = createGroup(ledger, { lead: n, why: why || `follow-up of ${target.id} (${test})`, now, facts });
        follow.after = target.id;
        target.followUp = follow.id;
    }
    ledger.waits.push({ issue: n, on: target.id, test, since: at, why: why ?? "", ended: null, expired: null });
    return `#${n} waits on ${target.id} (#${target.pr}) in follow-up ${follow.id}`;
};

// ---------------------------------------------------------------------------------------------------------------
// State changes.

const needState = (group, states, verb) => {
    if (!states.includes(group.state)) throw new Refused(`${group.id} is ${group.state}: cannot ${verb}`);
};

/**
 * Moves the named members of a proposed group into a group of their own, so a job that took only some of a group
 * takes only those. When they are all its counted members, the group itself is returned; otherwise the named members
 * go to a new proposed group (a fresh id, led by the first of them) and the rest stay under the old id, which takes
 * its next member as lead when it lost its lead.
 * @param ledger the ledger
 * @param group a proposed group
 * @param numbers the issues taken
 * @param at ISO time
 * @returns the group holding exactly the named issues (and, when it is the whole group, its trackers)
 */
const splitOff = (ledger, group, numbers, at) => {
    const want = new Set(numbers);
    for (const n of want) if (!group.members.some((m) => m.n === n)) throw new Refused(`#${n} is not in ${group.id}`);
    if (group.members.filter((m) => counted(m)).every((m) => want.has(m.n))) return group;
    const taken = group.members.filter((m) => want.has(m.n));
    group.members = group.members.filter((m) => !want.has(m.n));
    if (want.has(group.lead)) group.lead = group.members.find((m) => counted(m)).n;
    const part = {
        ...createShell(ledger, taken[0].n, group, at),
        members: taken,
        history: [{ at, event: "split", by: process.env.CLAUDE_CODE_SESSION_ID ?? "cli", from: group.id }],
    };
    ledger.groups.push(part);
    event(group, at, "split", { issues: [...want], to: part.id });
    return part;
};

/**
 * proposed -> started: a job took issues of the group on a branch. Only the issues the job took start; the other
 * members stay proposed under the group's id (see splitOff). A started group may be recorded again on its own branch.
 * @param ledger the ledger
 * @param id the group
 * @param branch the branch
 * @param now ms
 * @param issues the issues the job took; default every member
 * @returns the started group
 */
export function start(ledger, id, branch, now, issues = null) {
    let group = groupById(ledger, id);
    needState(group, ["proposed", "started"], "start");
    const at = new Date(now).toISOString();
    if (group.state === "started") {
        if (group.branch !== branch) throw new Refused(`${group.id} is started on ${group.branch}, not ${branch}`);
        const outside = (issues ?? []).filter((n) => !group.members.some((m) => m.n === n));
        if (outside.length) throw new Refused(`${hashes(outside)} not in ${group.id}`);
        return group;
    }
    if (issues?.length) group = splitOff(ledger, group, issues, at);
    group.state = "started";
    group.branch = branch;
    group.started ??= at;
    event(group, at, "start", { branch, issues: group.members.map((m) => m.n) });
    return group;
}

/**
 * started -> ready: the branch's work is finished and pushed. Issues waiting on the branch stop waiting, so the next
 * route can join them.
 * @param ledger the ledger
 * @param id the group
 * @param sha the finished commit
 * @param now ms
 * @returns the issues whose wait ended
 */
export function ready(ledger, id, sha, now) {
    const group = groupById(ledger, id);
    needState(group, ["started", "ready"], "be ready");
    const at = new Date(now).toISOString();
    group.state = "ready";
    group.readySince ??= at;
    event(group, at, "ready", { sha });
    return endWaits(ledger, group, at, "ready");
}

const endWaits = (ledger, group, at, why) => {
    const ended = liveWaits(ledger).filter((w) => resolveTarget(ledger, w.on) === group && !isX9(w));
    for (const w of ended) w.ended = `${at} ${why}`;
    return ended.map((w) => w.issue);
};

const isX9 = (w) => String(w.test).startsWith("X9");

/**
 * ready (or started) -> frozen: its pull request opened. Members never change after this. Issues waiting on the
 * started branch move to its follow-up group.
 * @param ledger the ledger
 * @param id the group
 * @param pr the pull request number
 * @param now ms
 * @param facts issue facts, for the follow-up group's points
 * @returns the group
 */
export function freeze(ledger, id, pr, now, facts = new Map()) {
    const group = groupById(ledger, id);
    needState(group, ["proposed", "started", "ready"], "freeze");
    const at = new Date(now).toISOString();
    group.state = "frozen";
    group.pr = pr;
    group.frozen = at;
    event(group, at, "freeze", { pr });
    for (const w of liveWaits(ledger).filter((x) => resolveTarget(ledger, x.on) === group && !isX9(x))) {
        w.ended = `${at} moved to the follow-up group`;
        try {
            route(ledger, { n: w.issue, to: group.id, test: w.test, why: w.why, now, facts: withFallback(facts) });
        } catch (error) {
            if (!(error instanceof Refused)) throw error;
            w.ended = null;
            w.expired = `${at} ${error.message}`;
        }
    }
    return group;
}

const withFallback = (facts) => ({ get: (n) => facts.get(n) ?? { labels: [] } });

/**
 * frozen -> closed (merged) or -> dissolved (closed unmerged). A merge ends every wait on it and makes its follow-up
 * group startable; closing unmerged dissolves the follow-up group and expires the waits, so all of them are routed
 * again.
 * @param ledger the ledger
 * @param id the group
 * @param merged whether the pull request merged
 * @param now ms
 * @returns one line
 */
export function close(ledger, id, merged, now) {
    const group = groupById(ledger, id);
    needState(group, ["proposed", "started", "ready", "frozen"], "close");
    const at = new Date(now).toISOString();
    group.state = merged ? "closed" : "dissolved";
    group.closed = at;
    event(group, at, merged ? "merged" : "closed-unmerged");
    const follow = group.followUp && ledger.groups.find((g) => g.id === group.followUp);
    const waiting = liveWaits(ledger).filter((w) => resolveTarget(ledger, w.on) === group && !isX9(w));
    for (const w of waiting) {
        if (merged) w.ended = `${at} merged`;
        else w.expired = `${at} base closed unmerged`;
    }
    if (follow && isLive(follow)) {
        if (merged) {
            follow.after = null;
            event(follow, at, "startable", { why: `${group.id} merged` });
        } else {
            follow.state = "dissolved";
            follow.closed = at;
            event(follow, at, "dissolve", { why: `${group.id} closed unmerged` });
        }
    }
    let fate = "";
    if (follow) fate = merged ? "; follow-up startable" : "; follow-up dissolved";
    return `${group.id} ${group.state}; ${waiting.length} waits settled${fate}`;
}

/**
 * Removes a member that does not belong (the split). It is never routed back to this group. A group left with no
 * member dissolves; a proposed group that lost its lead takes its next member as lead.
 * @param ledger the ledger
 * @param id the group
 * @param n the issue
 * @param why the reason
 * @param now ms
 * @returns the group
 */
export function release(ledger, id, n, why, now) {
    const group = groupById(ledger, id);
    needState(group, ["proposed", "started", "ready"], "release a member");
    if (!group.members.some((m) => m.n === n)) throw new Refused(`#${n} is not in ${group.id}`);
    const at = new Date(now).toISOString();
    group.members = group.members.filter((m) => m.n !== n);
    event(group, at, "release", { issue: n, why });
    if (!group.members.some((m) => counted(m))) {
        group.state = "dissolved";
        group.closed = at;
        event(group, at, "dissolve", { why: "every member released" });
    } else if (group.lead === n && group.state === "proposed") {
        group.lead = group.members.find((m) => counted(m)).n;
    }
    return group;
}

/**
 * Records that an issue waits on another branch or pull request (rubric X6, X8 or X9).
 * @param ledger the ledger
 * @param spec `{ n, on, x9, why, now }`
 * @returns one line
 */
export function addWait(ledger, spec) {
    const { n, on, x9, why, now } = spec;
    if (!on) throw new Refused("--on is required");
    if (!why?.trim()) throw new Refused("--why is required");
    const test = x9 ? `X9 ${x9}` : "X6";
    const at = new Date(now).toISOString();
    if (liveWaits(ledger).some((w) => w.issue === n && w.on === on)) return `#${n} already waits on ${on}`;
    ledger.waits.push({ issue: n, on, test, since: at, why, ended: null, expired: null });
    return `#${n} waits on ${on} (${test})`;
}

/**
 * Moves groups closed or dissolved more than 7 days ago out of the ledger.
 * @param ledger the ledger
 * @param now ms
 * @returns the groups moved out
 */
export function archive(ledger, now) {
    const old = (g) => !isLive(g) && g.closed && now - Date.parse(g.closed) > ARCHIVE_AFTER_MS;
    const out = ledger.groups.filter((g) => old(g));
    ledger.groups = ledger.groups.filter((g) => !old(g));
    return out;
}

/**
 * Archive, then: drop proposed groups no scan has confirmed in a day, drop waits settled more than 7 days ago, and
 * keep each group's newest history events only.
 * @param ledger the ledger
 * @param now ms
 * @returns `{ archived, dropped, waits }`
 */
export function compact(ledger, now) {
    const archived = archive(ledger, now);
    const stale = (g) =>
        g.state === "proposed" && !g.after && now - Date.parse(g.refreshed ?? g.created) > PROPOSED_TTL_MS;
    const dropped = ledger.groups.filter((g) => stale(g)).map((g) => g.id);
    ledger.groups = ledger.groups.filter((g) => !stale(g));
    const settledAt = (w) => Date.parse(String(w.ended || w.expired).split(" ")[0]);
    const before = ledger.waits.length;
    ledger.waits = ledger.waits.filter((w) => !(w.ended || w.expired) || now - settledAt(w) <= ARCHIVE_AFTER_MS);
    for (const g of ledger.groups) g.history = g.history.slice(-HISTORY_KEEP);
    return { archived, dropped, waits: before - ledger.waits.length };
}

/**
 * Replaces every proposed group with the free-queue scan's jobs. Members already in a started, ready or frozen group
 * are left out; a job over the cap is cut into consecutive groups.
 * @param ledger the ledger
 * @param scan the parsed free-queue.json: `{ builtAt, jobs: [{ issues, files, why, members?: [{ n, test, points }] }] }`
 * @param now ms
 * @returns `{ groups, issues }` counts
 */
export function importScan(ledger, scan, now) {
    if (!Array.isArray(scan?.jobs)) throw new Refused("the scan has no jobs list");
    const keep = ledger.groups.filter((g) => g.state !== "proposed" || g.after);
    const taken = new Set(keep.filter((g) => isLive(g)).flatMap((g) => g.members.map((m) => m.n)));
    for (const w of liveWaits(ledger)) taken.add(w.issue);
    ledger.groups = keep;
    let groups = 0;
    let issues = 0;
    for (const job of scan.jobs) {
        const given = new Map((job.members ?? []).map((m) => [m.n, m]));
        const numbers = [...new Set(job.issues ?? [])].filter((n) => !taken.has(n));
        let current = null;
        for (const n of numbers) {
            const m = given.get(n) ?? {};
            const member = { n, test: m.test ?? "scan", points: m.points ?? 2, triage: false, unreadable: false };
            if (!current || fitsWith(current, member)) {
                const at = new Date(now).toISOString();
                current = {
                    ...createShell(ledger, n, job, at),
                    members: [{ ...member, test: "lead" }],
                };
                ledger.groups.push(current);
                groups += 1;
            } else {
                current.members.push(member);
            }
            taken.add(n);
            issues += 1;
        }
    }
    ledger.blocked = Array.isArray(scan.blocked) ? scan.blocked : [];
    ledger.scannedAt = scan.builtAt ?? new Date(now).toISOString();
    return { groups, issues };
}

const createShell = (ledger, lead, job, at) => ({
    id: freshId(ledger, lead),
    branch: null,
    aliases: [],
    lead,
    state: "proposed",
    lane: null,
    batch: false,
    files: job.files ?? [],
    why: job.why ?? "",
    pr: null,
    prState: null,
    held: null,
    parked: null,
    followUp: null,
    after: null,
    joins: 0,
    created: at,
    refreshed: at,
    started: null,
    readySince: null,
    frozen: null,
    closed: null,
    history: [{ at, event: "scan", by: "free-queue scan" }],
});

/**
 * Checks a ledger file before it replaces the ledger: every group has an id, a known state and members, and no
 * issue is in two live groups.
 * @param ledger the parsed file
 * @returns problems, empty when it may be loaded
 */
export function validate(ledger) {
    const problems = [];
    if (!Array.isArray(ledger?.groups)) return ["no groups list"];
    const where = new Map();
    for (const g of ledger.groups) {
        if (!g.id || !Array.isArray(g.members) || !Array.isArray(g.history)) problems.push(`${g.id}: malformed`);
        if (!["proposed", "started", "ready", "frozen", "closed", "dissolved"].includes(g.state)) {
            problems.push(`${g.id}: unknown state ${g.state}`);
        }
        if (!isLive(g)) continue;
        for (const m of g.members ?? []) {
            if (where.has(m.n)) problems.push(`#${m.n} is in ${where.get(m.n)} and ${g.id}`);
            where.set(m.n, g.id);
        }
    }
    return problems;
}

// ---------------------------------------------------------------------------------------------------------------
// Jobs.

// The rubric's precondition: a group of two or more opens only once pr-open.sh writes Fixes for every member and
// pr-review.sh reviews every member's issue (design/ci/issue-grouping.md section 8, step 1, owner-guarded). Until then
// a group's job holds its lead and its T1 folds, and every other member is a job of its own. True since that change
// (pull request #8525): pr-open.sh refuses a branch closing an issue besides its own unless the review judged every
// member, so a group opened before master runs the new pr-review.sh stops at pr-open instead of closing unreviewed.
export const EVERY_MEMBER_REVIEWED = true;

const reviewable = (members, everyMemberReviewed = EVERY_MEMBER_REVIEWED) => {
    if (everyMemberReviewed) return [members];
    const [lead, ...rest] = members;
    const folds = rest.filter((m) => m.test === "T1-fold");
    return [[lead, ...folds], ...rest.filter((m) => m.test !== "T1-fold").map((m) => [m])];
};

// Issues no job may take now: members of started, ready, frozen and held groups, of follow-up groups whose base is
// still live, members recorded under an exclusion (a test starting with X: owner-only, tracker, unmerged cause), and
// issues with a live wait.
const busyIssues = (ledger) => {
    const busy = new Set(liveWaits(ledger).map((w) => w.issue));
    for (const g of ledger.groups.filter((x) => isLive(x))) {
        const base = g.after && ledger.groups.find((x) => x.id === g.after);
        const blocked = g.state !== "proposed" || g.held || (base && isLive(base));
        for (const m of g.members) if (blocked || /^X/.test(m.test)) busy.add(m.n);
    }
    return busy;
};

/**
 * The jobs a round may start, from the ledger and the live queue (in the queue's order). A proposed group is a job of
 * its members still in the queue; members of started, ready and frozen groups, held groups, follow-up groups whose
 * base is still open, and issues with a live wait are not offered. A top-10 queue issue in no group is offered alone,
 * marked `unscanned`, and named in `rescan`, unless the last scan listed it as blocked; the rescan is also asked for
 * when the last scan is over 2 hours old.
 * @param ledger the ledger
 * @param q the queue, from issue-queue.mjs queue()
 * @param now ms
 * @param options `{ everyMemberReviewed }`, default EVERY_MEMBER_REVIEWED
 * @returns `{ jobs, rescan, stale }`
 */
export function ledgerJobs(ledger, q, now, options = {}) {
    const pos = new Map(q.map((i, k) => [i.number, k]));
    const byNumber = new Map(q.map((i) => [i.number, i]));
    const busy = busyIssues(ledger);
    const seen = new Set();
    const out = [];
    for (const g of ledger.groups.filter((x) => x.state === "proposed")) {
        const members = g.members
            .filter((m) => counted(m) && pos.has(m.n) && !busy.has(m.n) && !seen.has(m.n))
            .sort((a, b) => pos.get(a.n) - pos.get(b.n));
        if (!members.length) continue;
        for (const m of members) seen.add(m.n);
        for (const part of reviewable(members, options.everyMemberReviewed)) {
            const lead = part[0].n;
            out.push({
                group: g.id,
                lead,
                priority: byNumber.get(lead).priority,
                issues: part.map((m) => m.n),
                tests: part.map((m) => m.test),
                files: g.files ?? [],
                why:
                    part.length < members.length
                        ? `${g.why ?? ""} (split until every member is reviewed)`
                        : (g.why ?? ""),
            });
        }
    }
    const blocked = new Set((ledger.blocked ?? []).map((b) => b.issue));
    const free = q.map((i) => i.number).filter((n) => !seen.has(n) && !busy.has(n) && !blocked.has(n));
    const top = new Set(q.slice(0, 10).map((i) => i.number));
    let rescan = free.filter((n) => top.has(n));
    if (!rescan.length && !out.length && free.length) rescan = [free[0]];
    for (const n of rescan) {
        out.push({
            group: null,
            lead: n,
            priority: byNumber.get(n).priority,
            issues: [n],
            tests: ["lead"],
            files: [],
            why: "",
            unscanned: true,
        });
    }
    const age = now - Date.parse(ledger.scannedAt ?? 0);
    const stale =
        Number.isNaN(age) || age > SCAN_STALE_MS ? `the last scan is older than 2 hours (${ledger.scannedAt})` : null;
    return { jobs: out.sort((a, b) => pos.get(a.lead) - pos.get(b.lead)), rescan, stale };
}

const hashes = (numbers) => numbers.map((n) => `#${n}`).join(" ");
const ascii = (s) => s.replaceAll(/[^\x20-\x7e\n\t]/g, "?");

/**
 * The `jobs` lines, in the shape of `issue-queue.mjs jobs` plus the group and each member's test.
 * @param result from ledgerJobs()
 * @returns lines
 */
export function jobLines(result) {
    const lines = result.jobs.map((j) => {
        if (j.unscanned) return `job ${hashes(j.issues)} ${j.priority} unscanned -- in no group of the ledger`;
        const pairs = j.issues.map((n, k) => n + ":" + j.tests[k]).join(" ");
        const tests = j.issues.length > 1 ? ` tests ${pairs}` : "";
        const why = j.why || "no reason given";
        return ascii(
            `job ${hashes(j.issues)} ${j.priority} ${j.group}${tests} -- ${why}; files ${j.files.join(" ") || "none named"}`,
        );
    });
    const issues = result.jobs.reduce((t, j) => t + j.issues.length, 0);
    const grouped = result.jobs.filter((j) => j.issues.length > 1).length;
    lines.push(`${result.jobs.length} jobs, ${issues} issues, ${grouped} grouped`);
    if (result.rescan.length || result.stale) {
        const why = result.stale ?? "not in the ledger";
        lines.push(`rescan: ${hashes(result.rescan) || "(none unscanned)"} -- start the free-queue scan (${why})`);
    }
    return lines;
}

// ---------------------------------------------------------------------------------------------------------------
// Drift against GitHub.

const parseMarker = (id, kind, rest) => {
    const words = rest.trim().split(/\s+/);
    const marker = { id, kind, text: rest.trim(), branch: null, sha: null, pr: null };
    if (kind === "taken") marker.branch = /branch ([^,\s]+)/.exec(rest)?.[1] ?? null;
    else if (kind !== "released") marker.branch = words[0] || null;
    if (kind === "ready") marker.sha = words[1] ?? null;
    if (kind === "opened") marker.pr = Number(/\/pull\/(\d+)/.exec(rest)?.[1]) || null;
    return marker;
};

/**
 * The newest state-changing `pipeline-round:` marker among trusted comments, ordered by comment databaseId (never
 * by time, so every reader picks the same one).
 * @param comments GraphQL IssueComment nodes with databaseId, author, editor, lastEditedAt, body
 * @param skip a marker kind to pass over (for the newest marker before a `released`)
 * @returns `{ id, kind, branch, sha, pr, text }`, or null
 */
export function newestMarker(comments, skip = null) {
    let best = null;
    for (const c of comments) {
        if (!trustedText(c)) continue;
        const m = STATE_MARKER.exec((c.body ?? "").split("\n")[0]);
        if (!m || (best && best.id > c.databaseId)) continue;
        if (m[1] === skip) continue;
        const marker = parseMarker(c.databaseId, m[1], m[2]);
        best = marker;
    }
    return best;
}

/**
 * What differs between the ledger and GitHub, each with the fix `check --fix` applies (or none, to report only).
 * @param ledger the ledger
 * @param facts `{ issues: Map n -> { state, labels, comments }, prs: Map pr -> { state, mergeable, headAt, checks } }`
 * @param now ms
 * @param isAncestor `(sha) => boolean`: whether a commit is on origin/master
 * @returns `[{ group, issue?, kind, detail, fix? }]`, fix one of the transition descriptors applied by applyFix()
 */
export function drift(ledger, facts, now, isAncestor = () => false) {
    const out = [];
    const seen = new Map();
    for (const g of ledger.groups.filter((g) => isLive(g))) {
        for (const m of g.members) {
            if (seen.has(m.n))
                out.push({ group: g.id, issue: m.n, kind: "two-groups", detail: `also in ${seen.get(m.n)}` });
            seen.set(m.n, g.id);
        }
        const { issues, points } = size(g);
        if (issues > MAX_ISSUES || points > MAX_POINTS) {
            out.push({ group: g.id, kind: "over-cap", detail: `${issues} issues, ${points} points` });
        }
        if (g.state === "frozen") {
            out.push(...frozenDrift(ledger, g, facts.prs.get(g.pr), now));
            continue;
        }
        out.push(...memberDrift(g, facts.issues));
    }
    for (const w of liveWaits(ledger).filter((w) => isX9(w))) {
        const sha = String(w.test).split(" ")[1];
        if (sha && isAncestor(sha)) {
            out.push({
                group: null,
                issue: w.issue,
                kind: "x9-landed",
                detail: `${sha} is on master`,
                fix: { op: "end-wait", wait: w },
            });
        }
    }
    return out;
}

const frozenDrift = (ledger, g, pr, now) => {
    if (!pr) return [{ group: g.id, kind: "unreadable", detail: `pull request #${g.pr} could not be read` }];
    if (pr.state === "MERGED")
        return [{ group: g.id, kind: "merged", detail: `#${g.pr} merged`, fix: { op: "close", merged: true } }];
    if (pr.state === "CLOSED") {
        return [
            { group: g.id, kind: "closed", detail: `#${g.pr} closed unmerged`, fix: { op: "close", merged: false } },
        ];
    }
    // Only waits for a frozen group to merge expire this way (follow-up waits, X8); an X6 or X9 wait is a dependency.
    const waiting = liveWaits(ledger).filter((w) => resolveTarget(ledger, w.on) === g && FOLLOW_UP_WAIT.test(w.test));
    if (!waiting.length) return [];
    const heldLong = g.held && now - Date.parse(g.frozen ?? g.created) > WAIT_LIMIT_MS;
    const stuck = pr.checks === "FAILURE" || pr.mergeable === "CONFLICTING";
    const red = !g.held && stuck && now - Date.parse(pr.headAt) > RED_PR_IDLE_MS;
    if (!heldLong && !red) return [];
    const reason = heldLong ? "owner-held over 24 hours" : "red or conflicting with no new commit in 6 hours";
    return waiting.map((w) => ({
        group: g.id,
        issue: w.issue,
        kind: "wait-expired",
        detail: reason,
        fix: { op: "expire-wait", wait: w, reason },
    }));
};

// One member's own finding (unreadable, closed, released), or its newest state-changing marker for the group.
const memberFinding = (g, m, f) => {
    if (!f) return { finding: { group: g.id, issue: m.n, kind: "unreadable", detail: "issue could not be read" } };
    if (f.state === "CLOSED") {
        const fix = g.state === "proposed" ? { op: "release", issue: m.n, why: "issue closed" } : undefined;
        return { finding: { group: g.id, issue: m.n, kind: "member-closed", detail: `#${m.n} closed`, fix } };
    }
    // A proposed member's markers count only while a claim holds it: old markers of a finished job are history.
    if (g.state === "proposed" && !f.labels.includes("in-progress")) return {};
    const marker = newestMarker(f.comments ?? []);
    if (marker?.kind !== "released") return { marker };
    if (g.state === "proposed") return {};
    // A released member leaves; what the job did before it (for example `opened` with Refs) still moves the group.
    const fix = { op: "release", issue: m.n, why: marker.text };
    const finding = { group: g.id, issue: m.n, kind: "released", detail: marker.text, fix };
    return { finding, marker: newestMarker(f.comments, "released") };
};

// The state change the group's newest marker asks for, or a report when its branch differs.
const markerFinding = (g, newest) => {
    const detail = `newest marker: ${newest.kind} ${newest.text}`;
    const { branch } = newest;
    if (newest.kind === "opened" && newest.pr) {
        return { group: g.id, kind: "opened", detail, fix: { op: "freeze", pr: newest.pr, branch } };
    }
    if (newest.kind === "ready" && g.state !== "ready") {
        return { group: g.id, kind: "ready", detail, fix: { op: "ready", sha: newest.sha, branch } };
    }
    if (newest.kind !== "ready" && g.state === "proposed" && branch) {
        return { group: g.id, kind: "started", detail, fix: { op: "start", branch } };
    }
    if (branch && g.branch && branch !== g.branch) {
        return { group: g.id, kind: "branch", detail: `ledger says ${g.branch}; ${detail}` };
    }
    return null;
};

// The members of a proposed group a job took: those whose own newest marker (counted only while a claim holds them)
// names the same branch. A `taken` marker is written on every issue of its job, so this is the job's issue list, and
// a join (`taken ... joins ready <branch>` on one member) takes that member alone.
const markerIssues = (g, newest, issues) =>
    g.members
        .filter((m) => counted(m))
        .filter((m) => {
            const marker = memberFinding(g, m, issues.get(m.n)).marker;
            return marker && marker.branch === newest.branch;
        })
        .map((m) => m.n);

const memberDrift = (g, issues) => {
    const out = [];
    let newest = null;
    for (const m of g.members.filter((x) => counted(x))) {
        const { finding, marker } = memberFinding(g, m, issues.get(m.n));
        if (finding) out.push(finding);
        if (marker && (!newest || marker.id > newest.id)) newest = marker;
    }
    const last = newest && markerFinding(g, newest);
    if (last?.fix) last.fix.issues = g.state === "proposed" ? markerIssues(g, newest, issues) : null;
    if (last) out.push(last);
    return out;
};

/**
 * Applies one drift finding's fix.
 * @param ledger the ledger
 * @param finding from drift()
 * @param now ms
 * @returns one line
 */
export function applyFix(ledger, finding, now) {
    const { fix } = finding;
    if (fix.op === "close") return close(ledger, finding.group, fix.merged, now);
    if (fix.op === "release")
        return `${release(ledger, finding.group, fix.issue, fix.why, now).id} released #${fix.issue}`;
    if (fix.op === "end-wait" || fix.op === "expire-wait") return settleWait(ledger, fix, now);
    const group = groupById(ledger, finding.group);
    const host = ledger.groups.find(
        (g) => g !== group && isLive(g) && ((fix.branch && g.branch === fix.branch) || (fix.pr && g.pr === fix.pr)),
    );
    if (host) return absorb(ledger, host, group, now, fix.issues);
    if (fix.op === "start")
        return `${start(ledger, group.id, fix.branch, now, fix.issues).id} started on ${fix.branch}`;
    // A proposed group whose job already finished: only the issues the job took move on.
    const moved = group.state === "proposed" ? start(ledger, group.id, fix.branch, now, fix.issues) : group;
    if (fix.branch && !moved.branch) moved.branch = fix.branch;
    if (fix.op === "ready") {
        ready(ledger, moved.id, fix.sha, now);
        return `${moved.id} ready at ${fix.sha}`;
    }
    if (fix.op === "freeze") return `${freeze(ledger, moved.id, fix.pr, now).id} frozen on #${fix.pr}`;
    throw new Error(`unknown fix ${fix.op}`);
}

// One job took issues of several ledger groups on one branch (its taken marker is on each of them), or an issue
// joined a ready branch: the branch's group takes in only the issues the job took (every member when `issues` is
// null), as it is, cap or not (check reports a group over the cap). The rest of a proposed group stays proposed.
const absorb = (ledger, host, group, now, issues) => {
    const at = new Date(now).toISOString();
    const part = issues?.length && group.state === "proposed" ? splitOff(ledger, group, issues, at) : group;
    const taken = part.members.map((m) => m.n);
    host.members.push(...part.members.map((m) => ({ ...m, test: m.test === "lead" ? "legacy" : m.test })));
    event(host, at, "absorb", { why: `${part.id} was taken on the same branch`, issues: taken });
    part.state = "dissolved";
    part.closed = at;
    event(part, at, "dissolve", { why: `absorbed into ${host.id} (same branch)` });
    const rest = part === group ? "" : `; ${group.id} keeps ${hashes(group.members.map((m) => m.n))}`;
    return `${part.id} (${hashes(taken)}) absorbed into ${host.id} (same branch)${rest}`;
};

const settleWait = (ledger, fix, now) => {
    const at = new Date(now).toISOString();
    const w = ledger.waits.find(
        (x) => x.issue === fix.wait.issue && x.on === fix.wait.on && x.since === fix.wait.since,
    );
    const ending = fix.op === "end-wait";
    if (w && ending) w.ended = `${at} landed`;
    if (w && !ending) w.expired = `${at} ${fix.reason}`;
    return `wait of #${fix.wait.issue} on ${fix.wait.on} ${ending ? "ended" : "expired"}`;
};

// ---------------------------------------------------------------------------------------------------------------
// Metrics.

const median = (xs, q = 0.5) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const share = (part, whole) => (whole ? Number((part / whole).toFixed(3)) : null);

/**
 * Throughput and guardrails (design section "Monitoring") from the ledger and the pull requests closed in the window.
 * A pull request is grouped when it closes two or more issues or its ledger group has two or more members.
 * @param ledger the ledger
 * @param prs `[{ number, state, createdAt, mergedAt, closedAt, closes, lastCommitAt }]`
 * @param now ms
 * @returns the metrics record
 */
export function metrics(ledger, prs, now) {
    const groupedPr = new Set(ledger.groups.filter((g) => g.pr && size(g).issues >= 2).map((g) => g.pr));
    const isGrouped = (p) => p.closes >= 2 || groupedPr.has(p.number);
    const stats = (list) => {
        const merged = list.filter((p) => p.mergedAt);
        const unmerged = list.filter((p) => !p.mergedAt);
        const hours = merged.map((p) => (Date.parse(p.mergedAt) - Date.parse(p.createdAt)) / HOUR);
        const late = list.filter((p) => p.lastCommitAt && Date.parse(p.lastCommitAt) > Date.parse(p.createdAt));
        return {
            n: list.length,
            merged: merged.length,
            closedUnmergedRate: share(unmerged.length, list.length),
            p75MergeHours: hours.length ? Number(median(hours, 0.75).toFixed(2)) : null,
            commitAfterOpenShare: share(late.length, list.length),
        };
    };
    const grouped = stats(prs.filter((p) => isGrouped(p)));
    const single = stats(prs.filter((p) => !isGrouped(p)));
    const merged = prs.filter((p) => p.mergedAt);
    const count = (state) => ledger.groups.filter((g) => g.state === state).length;
    const waits = liveWaits(ledger);
    const releases = ledger.groups.flatMap((g) =>
        g.history.filter((h) => h.event === "release" && /not part/.test(h.why ?? "")),
    );
    const memberCount = ledger.groups.reduce((t, g) => t + g.members.filter((m) => counted(m)).length, 0);
    const oldWaits = waits.filter((w) => now - Date.parse(w.since) > WAIT_LIMIT_MS && !isX9(w)).length;
    const ledgerStats = {
        proposed: count("proposed"),
        started: count("started"),
        ready: count("ready"),
        frozen: count("frozen"),
        parked: ledger.groups.filter((g) => isLive(g) && g.parked).length,
        waiting: waits.length,
        waitsOver24h: oldWaits,
        releasedNotPartShare: share(releases.length, releases.length + memberCount),
    };
    const applies = grouped.n >= 20;
    const guard = (name, value, ok) => ({
        name,
        value,
        applies: applies && value !== null,
        breach: applies && value !== null && !ok,
    });
    const guardrails = [
        guard(
            "closed-unmerged rate, grouped",
            grouped.closedUnmergedRate,
            grouped.closedUnmergedRate <= Math.min(0.03, 2 * (single.closedUnmergedRate ?? 1)),
        ),
        guard("commit after opening, grouped", grouped.commitAfterOpenShare, grouped.commitAfterOpenShare <= 0.3),
        guard("75th percentile hours to merge, grouped", grouped.p75MergeHours, grouped.p75MergeHours <= 4),
        {
            ...guard(
                "members released as not part",
                ledgerStats.releasedNotPartShare,
                ledgerStats.releasedNotPartShare <= 0.15,
            ),
            applies: memberCount >= 20,
            breach: memberCount >= 20 && ledgerStats.releasedNotPartShare > 0.15,
        },
        { name: "live waits over 24 hours", value: oldWaits, applies: true, breach: oldWaits > 0 },
    ];
    return {
        at: new Date(now).toISOString(),
        windowDays: 7,
        issuesPerMergedPr: merged.length
            ? Number((merged.reduce((t, p) => t + p.closes, 0) / merged.length).toFixed(2))
            : null,
        multiFixShare: share(merged.filter((p) => p.closes >= 2).length, merged.length),
        grouped,
        single,
        ledger: ledgerStats,
        guardrails,
        breaches: guardrails.filter((g) => g.breach).map((g) => g.name),
    };
}

/**
 * The one-line summary the round's last line carries.
 * @param ledger the ledger
 * @returns the line
 */
export function summary(ledger) {
    const c = (s) => ledger.groups.filter((g) => g.state === s).length;
    const waiting = liveWaits(ledger).length;
    const parked = ledger.groups.filter((g) => isLive(g) && g.parked).length;
    const grouped = ledger.groups.filter((g) => g.state === "frozen" && size(g).issues >= 2).length;
    return `groups: ${c("started")} started, ${c("ready")} ready, ${waiting} waiting, ${c("frozen")} frozen, ${parked} parked, ${grouped} grouped PRs open; ${c("proposed")} proposed`;
}

// ---------------------------------------------------------------------------------------------------------------
// GitHub.

function graphql(query) {
    const out = execFileSync("gh", ["api", "graphql", "-f", `query=${query}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
        maxBuffer: 1 << 28,
    });
    return JSON.parse(out).data;
}

const ACTOR = "{ __typename login }";
const [OWNER, NAME] = REPO.split("/");

/**
 * Issue and pull request facts in batches of 40 per GraphQL query (aliases), never one call per issue.
 * @param numbers issue numbers
 * @param prNumbers pull request numbers
 * @param run `(query) => data`
 * @param comments whether to read each issue's last 30 comments (for markers)
 * @returns `{ issues: Map, prs: Map }`
 */
export function fetchFacts(numbers, prNumbers, run = graphql, comments = false) {
    const issues = new Map();
    const prs = new Map();
    const commentPart = comments
        ? `comments(last: 30) { nodes { databaseId createdAt body author ${ACTOR} editor ${ACTOR} lastEditedAt } }`
        : "";
    const items = [
        ...[...new Set(numbers)].map(
            (n) => `i${n}: issue(number: ${n}) { number state labels(first: 30) { nodes { name } } ${commentPart} }`,
        ),
        ...[...new Set(prNumbers)].map(
            (n) =>
                `p${n}: pullRequest(number: ${n}) { number state mergeable commits(last: 1) { nodes { commit { committedDate statusCheckRollup { state } } } } }`,
        ),
    ];
    for (let k = 0; k < items.length; k += 40) {
        const data = run(
            `query { repository(owner: "${OWNER}", name: "${NAME}") { ${items.slice(k, k + 40).join("\n")} } }`,
        );
        for (const [key, v] of Object.entries(data?.repository ?? {})) {
            if (!v) continue;
            if (key.startsWith("i")) {
                issues.set(v.number, {
                    state: v.state,
                    labels: v.labels.nodes.map((l) => l.name),
                    comments: v.comments?.nodes ?? [],
                });
            } else {
                const head = v.commits?.nodes?.[0]?.commit;
                prs.set(v.number, {
                    state: v.state,
                    mergeable: v.mergeable,
                    headAt: head?.committedDate ?? null,
                    checks: head?.statusCheckRollup?.state ?? null,
                });
            }
        }
    }
    return { issues, prs };
}

const SEARCH_QUERY = (q, after) => {
    const page = after ? `, after: "${after}"` : "";
    return `query { search(query: "${q}", type: ISSUE, first: 100${page}) {
  pageInfo { hasNextPage endCursor }
  nodes { ... on PullRequest { number state createdAt mergedAt closedAt closingIssuesReferences(first: 1) { totalCount }
    commits(last: 1) { nodes { commit { committedDate } } } } } } }`;
};

/**
 * Pull requests closed (merged or not) in the last 7 days, one paged search.
 * @param now ms
 * @param run `(query) => data`
 * @returns records for metrics()
 */
export function fetchClosedPrs(now, run = graphql) {
    const since = new Date(now - ARCHIVE_AFTER_MS).toISOString().slice(0, 10);
    const q = `repo:${REPO} is:pr is:closed closed:>=${since}`;
    const out = [];
    let after;
    do {
        const page = run(SEARCH_QUERY(q, after)).search;
        for (const p of page.nodes) {
            if (!p?.number) continue;
            out.push({
                number: p.number,
                state: p.state,
                createdAt: p.createdAt,
                mergedAt: p.mergedAt,
                closedAt: p.closedAt,
                closes: p.closingIssuesReferences?.totalCount ?? 0,
                lastCommitAt: p.commits?.nodes?.[0]?.commit?.committedDate ?? null,
            });
        }
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
    } while (after);
    return out;
}

const gitAncestor = (sha) => {
    try {
        execFileSync("git", ["merge-base", "--is-ancestor", sha, "origin/master"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
};

const fallbackJobs = (rest) => {
    const script = fileURLToPath(new URL("./issue-queue.mjs", import.meta.url));
    try {
        return {
            code: 0,
            out: execFileSync(process.execPath, [script, "jobs", ...rest], { encoding: "utf8" }).trimEnd(),
        };
    } catch (error) {
        return { code: error.status ?? 1, out: `${error.stdout ?? ""}${error.stderr ?? ""}`.trimEnd() };
    }
};

// ---------------------------------------------------------------------------------------------------------------
// The command line.

const OPTIONS = {
    why: { type: "string" },
    files: { type: "string", multiple: true },
    test: { type: "string" },
    to: { type: "string" },
    on: { type: "string" },
    x9: { type: "string" },
    merged: { type: "boolean" },
    unmerged: { type: "boolean" },
    json: { type: "boolean" },
    force: { type: "boolean" },
    fix: { type: "boolean" },
    append: { type: "boolean" },
    join: { type: "boolean" },
};

const USAGE =
    "usage: issue-groups.mjs seed <file> [--force] | show [<group>|<issue>] [--json] | create <lead> [<n>:<test>...] --why <r> [--files <p>...] | add <group> <n> --test <T#> | route <n> [--to <group> --test <T#> [--join]] [--why <r>] | import-scan [<file>] | start <group> <branch> <n>... | ready <group> <sha> | freeze <group> <pr> | close <group> --merged|--unmerged | release <group> <n> --why <r> | wait <n> --on <target> [--x9 <sha>] --why <r> | archive | compact | check [--fix] [--json] | jobs [--json] | metrics [--append] [--json]";

const num = (s) => {
    if (!/^#?\d+$/.test(s ?? "")) throw new Refused(`not an issue number: ${s}`);
    return Number(String(s).replace("#", ""));
};

const ok = (out) => ({ code: 0, out });
const archiveFile = (ledgerPath, groups) => {
    if (!groups.length) return;
    appendFileSync(`${dirname(ledgerPath)}/groups-archive.jsonl`, groups.map((g) => `${JSON.stringify(g)}\n`).join(""));
};

const seedInto = (current, ledger, force, now) => {
    if (current.groups.length && !force) {
        throw new Refused(`the ledger already holds ${current.groups.length} groups (--force replaces them)`);
    }
    Object.assign(current, emptyLedger(), ledger);
    current.waits ??= [];
    current.scannedAt ??= ledger.reviewedAt ?? ledger.builtAt ?? new Date(now).toISOString();
    for (const g of current.groups) {
        g.after ??= null;
        g.refreshed ??= current.scannedAt;
    }
    for (const g of current.groups) {
        const child = g.followUp && current.groups.find((x) => x.id === g.followUp);
        if (child) child.after ??= g.id;
    }
    return ok(`seeded ${current.groups.length} groups, ${current.waits.length} waits\n${summary(current)}`);
};

const showCommand = (ledger, arg, json) => {
    if (!arg) return ok(json ? JSON.stringify(ledger, null, 2) : summary(ledger));
    const byId = arg.startsWith("g");
    const g = byId ? ledger.groups.find((x) => x.id === arg) : groupOf(ledger, num(arg));
    const waits = byId ? [] : ledger.waits.filter((w) => w.issue === num(arg));
    if (!g && !waits.length) return { code: 1, out: `${arg}: in no live group` };
    return ok(JSON.stringify({ group: g ?? null, waits }, null, 2));
};

const metricsCommand = (ctx) => {
    const record = metrics(readLedger(ctx.ledgerPath), fetchClosedPrs(ctx.now, ctx.run), ctx.now);
    if (ctx.o.append) appendFileSync(ctx.metricsLog, `${JSON.stringify(record)}\n`);
    if (ctx.o.json) return ok(JSON.stringify(record, null, 2));
    const g = record.grouped;
    const breaches = record.breaches.join(", ") || "none";
    return ok(
        `issues per merged PR ${record.issuesPerMergedPr}; PRs closing 2+ issues ${record.multiFixShare}; grouped ${g.n} (closed unmerged ${g.closedUnmergedRate}, p75 ${g.p75MergeHours} h, commit after opening ${g.commitAfterOpenShare}); breaches: ${breaches}`,
    );
};

// Each command: (ctx) => { code, out }. ctx: { o, pos, now, ledgerPath, change, facts, run, ... }.
const COMMANDS = {
    seed: (c) => {
        const ledger = JSON.parse(c.readFile(c.pos[0]));
        const problems = validate(ledger);
        if (problems.length) return { code: 1, out: `seed refused:\n${problems.join("\n")}` };
        return c.change((current) => seedInto(current, ledger, c.o.force, c.now));
    },
    show: (c) => showCommand(readLedger(c.ledgerPath), c.pos[0], c.o.json),
    create: (c) => {
        const lead = num(c.pos[0]);
        const members = c.pos.slice(1).map((arg) => {
            const [n, test] = arg.split(":");
            return { n: num(n), test };
        });
        const facts = c.facts([lead, ...members.map((m) => m.n)]);
        return c.change((ledger) => {
            const g = createGroup(ledger, { lead, members, why: c.o.why, files: c.o.files ?? [], now: c.now, facts });
            return ok(`created ${g.id}: ${hashes(g.members.map((m) => m.n))}`);
        });
    },
    add: (c) => {
        const n = num(c.pos[1]);
        const lead = readLedger(c.ledgerPath).groups.find((g) => g.id === c.pos[0])?.lead;
        const facts = c.facts(lead ? [n, lead] : [n]);
        return c.change((ledger) => {
            const spec = { n, test: c.o.test, why: c.o.why, now: c.now, facts };
            const { group, joined } = addMember(ledger, c.pos[0], spec);
            return ok(`#${n} ${joined ? "joins ready" : "added to"} ${group.id}`);
        });
    },
    route: (c) => {
        const n = num(c.pos[0]);
        const target = c.o.to ? resolveTarget(readLedger(c.ledgerPath), c.o.to) : null;
        const facts = c.facts(target ? [n, target.lead] : [n]);
        const spec = { n, to: c.o.to, test: c.o.test, why: c.o.why, now: c.now, facts, join: Boolean(c.o.join) };
        return c.change((ledger) => ok(route(ledger, spec)));
    },
    "import-scan": (c) => {
        const scan = JSON.parse(c.readFile(c.pos[0] ?? FREE_QUEUE));
        return c.change((ledger) => {
            const r = importScan(ledger, scan, c.now);
            return ok(`imported ${r.groups} proposed groups, ${r.issues} issues\n${summary(ledger)}`);
        });
    },
    start: (c) => {
        const issues = c.pos.slice(2).map((s) => num(s));
        if (!c.pos[1] || !issues.length) return { code: 2, out: "start needs <group> <branch> and the job's issues" };
        return c.change((ledger) => {
            const g = start(ledger, c.pos[0], c.pos[1], c.now, issues);
            return ok(`${g.id} started on ${c.pos[1]}: ${hashes(g.members.map((m) => m.n))}`);
        });
    },
    ready: (c) =>
        c.change((ledger) => {
            const freed = ready(ledger, c.pos[0], c.pos[1], c.now);
            const again = freed.length ? `; route again: ${hashes(freed)}` : "";
            return ok(`${c.pos[0]} ready${again}`);
        }),
    freeze: (c) => {
        const pr = num(c.pos[1]);
        return c.change((ledger) => ok(`${freeze(ledger, c.pos[0], pr, c.now).id} frozen on #${pr}`));
    },
    close: (c) => {
        if (Boolean(c.o.merged) === Boolean(c.o.unmerged)) {
            return { code: 2, out: "close needs exactly one of --merged, --unmerged" };
        }
        return c.change((ledger) => ok(close(ledger, c.pos[0], Boolean(c.o.merged), c.now)));
    },
    release: (c) => {
        if (!c.o.why) return { code: 2, out: "release needs --why" };
        const n = num(c.pos[1]);
        return c.change((ledger) => ok(`${release(ledger, c.pos[0], n, c.o.why, c.now).id} released #${n}`));
    },
    wait: (c) => {
        const spec = { n: num(c.pos[0]), on: c.o.on, x9: c.o.x9, why: c.o.why, now: c.now };
        return c.change((ledger) => ok(addWait(ledger, spec)));
    },
    archive: (c) =>
        c.change((ledger) => {
            const out = archive(ledger, c.now);
            archiveFile(c.ledgerPath, out);
            return ok(`archived ${out.length} groups`);
        }),
    compact: (c) =>
        c.change((ledger) => {
            const r = compact(ledger, c.now);
            archiveFile(c.ledgerPath, r.archived);
            const dropped = `dropped ${r.dropped.length} stale proposals, ${r.waits} settled waits`;
            return ok(`archived ${r.archived.length} groups, ${dropped}`);
        }),
    check: (c) => check(c.ledgerPath, c.o, c.run, c.now, c.isAncestor),
    jobs: (c) => {
        const ledger = readLedger(c.ledgerPath);
        if (!ledger.groups.length) return c.fallback(c.o.json ? ["--json"] : []);
        const result = ledgerJobs(ledger, c.fetchQueue(), c.now);
        return ok(c.o.json ? JSON.stringify(result, null, 2) : jobLines(result).join("\n"));
    },
    metrics: (c) => metricsCommand(c),
};

const FREE_QUEUE = fileURLToPath(new URL("../tmp/issue-round/free-queue.json", import.meta.url));

/**
 * The command line.
 * @param argv arguments after the script
 * @param deps `{ ledgerPath, run, now, fetchQueue, readFile, isAncestor, fallback, metricsLog }`
 * @returns `{ code, out }`
 */
export function main(argv, deps = {}) {
    const ledgerPath = deps.ledgerPath ?? (process.env.ISSUE_GROUPS_LEDGER || DEFAULT_LEDGER);
    const now = deps.now ?? Date.now();
    const run = deps.run ?? graphql;
    let parsed;
    try {
        parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
    } catch (error) {
        return { code: 2, out: `${error.message}\n${USAGE}` };
    }
    const [cmd, ...pos] = parsed.positionals;
    const command = Object.hasOwn(COMMANDS, cmd ?? "") ? COMMANDS[cmd] : null;
    if (!command) return { code: 2, out: USAGE };
    const ctx = {
        o: parsed.values,
        pos,
        now,
        run,
        ledgerPath,
        metricsLog: deps.metricsLog ?? `${dirname(ledgerPath)}/grouping-metrics.jsonl`,
        readFile: deps.readFile ?? ((p) => readFileSync(p, "utf8")),
        fetchQueue: deps.fetchQueue ?? (() => queue(fetchOpen(), now).queue),
        isAncestor: deps.isAncestor ?? gitAncestor,
        fallback: deps.fallback ?? fallbackJobs,
        change: (fn) => mutate(ledgerPath, fn),
        facts: (numbers) => fetchFacts(numbers, [], run).issues,
    };
    try {
        return command(ctx);
    } catch (error) {
        if (error instanceof Refused) return { code: 1, out: `refused: ${error.message}` };
        if (error.busy) return { code: 3, out: error.message };
        throw error;
    }
}

const findingLine = (d) => {
    const issue = d.issue ? `#${d.issue} ` : "";
    const fix = d.fix ? ` (fix: ${d.fix.op})` : "";
    return `${d.group ?? "-"} ${issue}${d.kind}: ${d.detail}${fix}`;
};

/**
 * The `check` command: reads the facts once, then applies the fixes under the lock against the ledger as it is then.
 * @param ledgerPath the ledger file
 * @param o the options
 * @param run GraphQL runner
 * @param now ms
 * @param isAncestor git ancestry test
 * @returns `{ code, out }`, code 1 when drift was found and not fixed
 */
function check(ledgerPath, o, run, now, isAncestor) {
    const ledger = readLedger(ledgerPath);
    const live = ledger.groups.filter((g) => isLive(g));
    const numbers = live.filter((g) => g.state !== "frozen").flatMap((g) => g.members.map((m) => m.n));
    const prs = live.filter((g) => g.state === "frozen" && g.pr).map((g) => g.pr);
    const facts = fetchFacts(numbers, prs, run, true);
    if (!o.fix) {
        const found = drift(ledger, facts, now, isAncestor);
        if (o.json) return { code: found.length ? 1 : 0, out: JSON.stringify(found, null, 2) };
        const lines = found.map((d) => findingLine(d));
        lines.push(`${found.length} differences, ${found.filter((d) => d.fix).length} fixable with --fix`);
        return { code: found.length ? 1 : 0, out: ascii(lines.join("\n")) };
    }
    return mutate(ledgerPath, (current) => {
        const lines = [];
        for (const d of drift(current, facts, now, isAncestor)) {
            if (!d.fix) {
                lines.push(`report ${findingLine(d)}`);
                continue;
            }
            try {
                lines.push(`fixed ${applyFix(current, d, now)}`);
            } catch (error) {
                if (!(error instanceof Refused)) throw error;
                lines.push(`skipped ${d.group} ${d.kind}: ${error.message}`);
            }
        }
        lines.push(summary(current));
        return ok(ascii(lines.join("\n")));
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    try {
        const { code, out } = main(process.argv.slice(2));
        (code === 0 ? console.log : console.error)(out);
        process.exitCode = code;
    } catch (error) {
        console.error(`issue-groups: ${error.message.split("\n")[0]}`);
        process.exitCode = 2;
    }
}
