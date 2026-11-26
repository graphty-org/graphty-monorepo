#!/usr/bin/env node
// The commitments ledger: every promise of later work a Claude Code session makes, and the thing that keeps it. On
// 2026-11-25 a reply said "the routine that starts issue work will pick them up" while no issue-round loop had run for
// a day, and eight high-priority issues sat untouched overnight. A promise is only real when something running or
// scheduled will keep it; this ledger names that thing, and `check` says whether it is still alive.
// tools/claude-promise-hook.mjs (a Stop hook) reads the same ledger.
//
// The ledger is tmp/commitments/ledger.json in the main checkout (shared by every worktree and session). An entry is
// { id, what, backing, session, at, done? }; backing is "<kind>:<ref>", "owner" or "next":
//   task:<id>        a background task, agent or workflow of the session (alive while the session lists it running)
//   pid:<n>          a process (alive while it runs)
//   file:<path>      a log or output file (alive while written in the last 30 minutes)
//   cron:<id>        a CronCreate or /loop job (alive while the session lists it, or its round loop record is live)
//   round:<name>     issue-round or pipeline-round (alive while tmp/<name>/last-round is under 75 minutes old)
//   servherd:<name>  a servherd server (alive while its pm2 process runs)
//   pr:<n>           a pull request waiting on CI (alive while open and not red, from tmp/pr-status/status.json)
//   issue:<n>        an issue a routine or agent works (alive while labeled in-progress; `check --refresh` reads GitHub)
//   owner            waiting only on the owner (always alive; the reply needs an ACTION NEEDED line)
//   next             unblocked work not started yet (never a backing: the hook blocks idle waits while one is open)
//
//   node tools/commitments.mjs add "<what>" <backing> [--session <id>]   prints the new id
//   node tools/commitments.mjs done <id>...
//   node tools/commitments.mjs list [--all]                              open entries (--all: every session)
//   node tools/commitments.mjs check [--all] [--refresh]                 exit 1 when any is stale
// --session defaults to $CLAUDE_CODE_SESSION_ID; list and check show that session's entries unless --all.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MIN = 60 * 1000;
const FILE_MS = 30 * MIN;
const ROUND_MS = 75 * MIN;
const LOOP_MS = 7 * 24 * 60 * MIN;
const ISSUE_CACHE_MS = 2 * 60 * MIN;
const KINDS = ["task", "pid", "file", "cron", "round", "servherd", "pr", "issue"];

/**
 * The main checkout for a project dir that may be a worktree under .worktrees/.
 * @param dir a checkout
 * @returns the main checkout
 */
export const mainRoot = (dir) => dir.split("/.worktrees/")[0];

const readJson = (path) => {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
        throw error;
    }
};

const mtime = (path) => {
    try {
        return statSync(path).mtimeMs;
    } catch {
        return null;
    }
};

const ledgerPath = (root) => join(root, "tmp", "commitments", "ledger.json");

/**
 * The ledger's entries.
 * @param root the main checkout
 * @returns the entries, oldest first
 */
export const readLedger = (root) => readJson(ledgerPath(root))?.commitments ?? [];

const writeLedger = (root, commitments) => {
    mkdirSync(join(root, "tmp", "commitments"), { recursive: true });
    const tmp = `${ledgerPath(root)}.${process.pid}`;
    writeFileSync(tmp, `${JSON.stringify({ commitments }, null, 1)}\n`);
    renameSync(tmp, ledgerPath(root));
};

/**
 * Checks a backing's spelling.
 * @param backing the backing text
 * @returns an error line, or null
 */
export function backingError(backing) {
    if (backing === "owner" || backing === "next") return null;
    const [kind, ref] = String(backing).split(/:(.*)/s);
    if (!KINDS.includes(kind) || !ref) return `backing must be owner, next or one of ${KINDS.join("|")}:<ref>`;
    if (["pid", "pr", "issue"].includes(kind) && !/^\d+$/.test(ref)) return `${kind}:<ref> needs a number`;
    return null;
}

/**
 * Adds an entry.
 * @param root the main checkout
 * @param what what was promised
 * @param backing what keeps it
 * @param session the session that promised it
 * @param now ms
 * @returns the entry
 */
export function add(root, what, backing, session, now = Date.now()) {
    const error = backingError(backing);
    if (error) throw new Error(error);
    const all = readLedger(root);
    const id = `c${now.toString(36)}${all.length.toString(36)}`;
    const entry = { id, what, backing, session: session ?? null, at: new Date(now).toISOString() };
    writeLedger(root, [...all, entry]);
    return entry;
}

/**
 * Marks entries done.
 * @param root the main checkout
 * @param ids the entry ids
 * @param now ms
 * @returns the ids not found
 */
export function done(root, ids, now = Date.now()) {
    const all = readLedger(root);
    const missing = ids.filter((id) => !all.some((c) => c.id === id && !c.done));
    writeLedger(
        root,
        all.map((c) => (ids.includes(c.id) && !c.done ? { ...c, done: new Date(now).toISOString() } : c)),
    );
    return missing;
}

const pidAlive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === "EPERM";
    }
};

const servherdAlive = (name) => {
    const dir = join(homedir(), ".servherd", "pm2", "pids");
    let files;
    try {
        files = readdirSync(dir);
    } catch {
        return null;
    }
    const mine = files.filter((f) => f.startsWith(`servherd-${name}-`) && /-\d+\.pid$/.test(f));
    if (mine.length === 0) return false;
    return mine.some((f) => pidAlive(Number(readFileSync(join(dir, f), "utf8"))));
};

const yes = (why) => ({ live: true, why });
const no = (why) => ({ live: false, why });
const unknown = (why) => ({ live: null, why });

const cronLive = (ref, root, now, own, hook) => {
    if (own && (hook.session_crons ?? []).some((x) => x.id === ref)) return yes(`cron ${ref} scheduled`);
    for (const round of ["issue-round", "pipeline-round"]) {
        const rec = readJson(join(root, "tmp", round, "loop-created"));
        if (rec?.id !== ref) continue;
        if (rec.deleted) return no(`cron ${ref} deleted ${rec.deleted}`);
        if (now - Date.parse(rec.createdAt) < LOOP_MS) return yes(`${round} loop ${ref} recorded`);
        return no(`cron ${ref} expired (7 days)`);
    }
    return own ? no(`cron ${ref} is not scheduled`) : unknown("cron not recorded");
};

const fresh = (at, now, limit, path) => {
    if (at === null) return no(`${path} does not exist`);
    const age = Math.round((now - at) / MIN);
    return now - at < limit ? yes(`${path} written ${age} min ago`) : no(`${path} unchanged for ${age} min`);
};

// One check per backing kind: (ref, root, now, own, hook) => { live, why }.
const CHECKS = {
    task: (ref, _root, _now, own, hook) => {
        if (!own) return unknown("only its own session can see its tasks");
        const t = (hook.background_tasks ?? []).find((x) => x.id === ref);
        return t?.status === "running" ? yes(`task ${ref} running`) : no(`task ${ref} is ${t?.status ?? "gone"}`);
    },
    pid: (ref) => (pidAlive(Number(ref)) ? yes(`pid ${ref} running`) : no(`pid ${ref} exited`)),
    file: (ref, _root, now) => fresh(mtime(ref), now, FILE_MS, ref),
    cron: cronLive,
    round: (ref, root, now) => {
        const at = mtime(join(root, "tmp", ref, "last-round"));
        if (at === null) return no(`${ref} has never run here`);
        const age = Math.round((now - at) / MIN);
        if (now - at < ROUND_MS) return yes(`${ref} ran ${age} min ago`);
        return no(`${ref} last ran ${new Date(at).toISOString()} (${age} min ago): no loop is running it`);
    },
    servherd: (ref) => {
        const alive = servherdAlive(ref);
        if (alive === null) return unknown("no servherd here");
        return alive ? yes(`servherd ${ref} running`) : no(`servherd ${ref} stopped`);
    },
    pr: (ref, root) => {
        const status = readJson(join(root, "tmp", "pr-status", "status.json"));
        if (!status) return unknown("no tmp/pr-status/status.json");
        const pr = status.pullRequests?.find((p) => p.number === Number(ref));
        if (!pr) return no(`PR ${ref} is merged or closed: mark it done`);
        if (pr.state === "FAILURE") return no(`PR ${ref} is red: nothing will merge it until someone fixes it`);
        return yes(`PR ${ref} ${String(pr.state ?? "open").toLowerCase()}`);
    },
    issue: (ref, root, now) => {
        const cache = readJson(join(root, "tmp", "commitments", "in-progress.json"));
        if (!cache || now - cache.at >= ISSUE_CACHE_MS) return unknown("run check --refresh");
        if (cache.numbers.includes(Number(ref))) return yes(`issue ${ref} in progress`);
        return no(`issue ${ref} is not labeled in-progress: nobody is working it`);
    },
};

/**
 * Whether an entry's backing is alive.
 * @param c the entry
 * @param root the main checkout
 * @param now ms
 * @param hook the Stop hook input of the entry's own session, when known: background_tasks and session_crons
 * @returns live (true, false, or null when it cannot be told here) and why
 */
export function liveness(c, root, now = Date.now(), hook = null) {
    if (c.backing === "owner") return yes("waiting on the owner");
    if (c.backing === "next") return no("not started");
    const [kind, ref] = c.backing.split(/:(.*)/s);
    const check = CHECKS[kind];
    return check ? check(ref, root, now, hook?.session_id === c.session, hook) : unknown("unknown backing");
}

/**
 * Caches the open issues labeled in-progress (one GitHub call).
 * @param root the main checkout
 * @param now ms
 */
function refreshIssues(root, now) {
    const out = execFileSync(
        "gh",
        ["issue", "list", "--label", "in-progress", "--state", "open", "--limit", "1000", "--json", "number"],
        { cwd: root, encoding: "utf8" },
    );
    mkdirSync(join(root, "tmp", "commitments"), { recursive: true });
    const numbers = JSON.parse(out).map((i) => i.number);
    writeFileSync(join(root, "tmp", "commitments", "in-progress.json"), `${JSON.stringify({ at: now, numbers })}\n`);
}

const flag = (args, name) => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    const value = args[i + 1];
    args.splice(i, 2);
    return value;
};

/**
 * Runs the CLI.
 * @param argv the arguments after the script
 * @param root the main checkout
 * @param env the environment
 * @param now ms
 * @returns the text to print and the exit code
 */
export function cli(argv, root, env = process.env, now = Date.now()) {
    const args = [...argv];
    const all = args.includes("--all");
    const refresh = args.includes("--refresh");
    const session = flag(args, "--session") ?? env.CLAUDE_CODE_SESSION_ID ?? null;
    const rest = args.filter((a) => a !== "--all" && a !== "--refresh");
    const [cmd, ...params] = rest;
    if (cmd === "add") {
        if (params.length !== 2) return { out: 'usage: add "<what>" <backing>', code: 2 };
        const c = add(root, params[0], params[1], session, now);
        return { out: c.id, code: 0 };
    }
    if (cmd === "done") {
        const missing = done(root, params, now);
        return missing.length ? { out: `not open: ${missing.join(" ")}`, code: 1 } : { out: "", code: 0 };
    }
    if (cmd === "list" || cmd === "check") {
        if (cmd === "check" && refresh) refreshIssues(root, now);
        const open = readLedger(root).filter((c) => !c.done && (all || c.session === session));
        let stale = 0;
        const lines = open.map((c) => {
            const l = cmd === "check" ? liveness(c, root, now) : null;
            if (l?.live === false && c.backing !== "next") stale++;
            const word = { true: "live", false: "STALE", null: "unknown" }[String(l?.live)];
            const state = l ? ` [${word}: ${l.why}]` : "";
            return `${c.id} ${c.backing} -- ${c.what}${state}`;
        });
        if (cmd === "check") lines.push(`${open.length} open, ${stale} stale`);
        return { out: lines.join("\n"), code: stale ? 1 : 0 };
    }
    return { out: "usage: commitments.mjs add|done|list|check (see the file's header)", code: 2 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { out, code } = cli(process.argv.slice(2), mainRoot(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()));
    if (out) console.log(out);
    process.exit(code);
}
