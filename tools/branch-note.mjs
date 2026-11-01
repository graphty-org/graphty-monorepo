#!/usr/bin/env node
// Every branch belongs to an issue, and the issue says who owns the branch and where it stands: one
// progress-note comment per branch, edited in place, found by its first line `<!-- branch-note: <branch> -->`.
//
//   node tools/branch-note.mjs start --issue N --branch B --worktree P [--owner O]
//       labels the issue in-progress and writes (or rewrites) the branch's note
//   node tools/branch-note.mjs update [--branch B] [--done T] [--left T] [--next T] [--owner O] [--worktree P]
//       refreshes the latest commit and sets the fields given; run it when you stop working
//   node tools/branch-note.mjs commit [--branch B]
//       the post-commit hook's call: refreshes the latest commit, at most once per 10 minutes per branch
//   node tools/branch-note.mjs new-issue --title T --branch B [--type T] [--priority P] [--effort E]
//       opens an issue with a type, a priority and an effort label, and prints its number
//   node tools/branch-note.mjs check-issue --issue N
//       exits 0 when N is an open issue, 1 when it is closed, a pull request or missing
//
// A branch's issue: --issue, else `git config branch.<branch>.issue` (tools/worktree-new.sh writes it), else
// the first number of three or more digits in the branch's name. The owner: --owner, else the Claude Code
// session (CLAUDE_CODE_SESSION_ID, else the session file of a parent process in ~/.claude/sessions), else
// user@host. Every GitHub call is tried three times (DNS for github.com fails now and then).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir, hostname, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const FIELDS = ["branch", "worktree", "owner", "latest commit", "done", "left", "next"];
const PLACEHOLDER = "(not written yet)";
const COMMIT_EVERY_MS = 10 * 60 * 1000;
const TYPES = { fix: "bug", feat: "enhancement", docs: "documentation" };

export const noteMarker = (branch) => `<!-- branch-note: ${branch} -->`;

/**
 * The progress note's text.
 * @param branch the branch
 * @param fields the values by FIELDS name; a missing one is the placeholder
 * @returns the comment body
 */
export function noteBody(branch, fields) {
    const lines = FIELDS.map((f) => `- ${f}: ${fields[f] || PLACEHOLDER}`);
    return [
        noteMarker(branch),
        `Work in progress on branch \`${branch}\`. This note is kept current by \`tools/branch-note.mjs\`.`,
        "",
        ...lines,
        "",
    ].join("\n");
}

/**
 * The fields of a progress note.
 * @param body the comment body
 * @returns the values by FIELDS name (placeholders left out)
 */
export function parseNote(body) {
    const fields = {};
    if (!body) return fields;
    for (const [, key, value] of body.matchAll(/^- ([a-z ]+): (.*)$/gm)) {
        if (FIELDS.includes(key) && value !== PLACEHOLDER) fields[key] = value;
    }
    return fields;
}

/**
 * The issue number in a branch's name: its first run of three or more digits.
 * @param branch the branch
 * @returns the number, or null
 */
export function issueInName(branch) {
    const m = /(?:^|\D)(\d{3,})(?!\d)/.exec(branch);
    return m ? Number(m[1]) : null;
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * Runs gh, three tries.
 * @param args gh's arguments
 * @param [env] the environment
 * @returns stdout
 */
export function gh(args, env = process.env) {
    let last = "";
    for (let tries = 1; tries <= 3; tries++) {
        const r = spawnSync("gh", args, { env, encoding: "utf8" });
        // A GraphQL answer with errors (one asked-for issue does not exist) still carries the rest.
        if (r.status === 0 || r.stdout?.startsWith('{"data":{')) return r.stdout.trim();
        last = r.stderr?.trim() || String(r.error);
        if (tries < 3) sleep(tries * 2000);
    }
    throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${last}`);
}

/**
 * Several issues in one GraphQL query: number, title, state, labels and their last 100 comments.
 * @param run runs gh with the given arguments and returns stdout
 * @param numbers the issue numbers
 * @returns a Map from number to `{ number, title, state, labels, comments: [{ databaseId, body }] }`
 */
export function readIssues(run, numbers) {
    const unique = [...new Set(numbers)].filter(Boolean);
    const found = new Map();
    if (!unique.length) return found;
    const fields =
        "number title state labels(first: 20) { nodes { name } } comments(last: 100) { nodes { databaseId body } }";
    const body = unique.map((n) => `i${n}: issue(number: ${n}) { ${fields} }`).join("\n");
    const query = `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${body} } }`;
    const out = JSON.parse(run(["api", "graphql", "-F", "owner={owner}", "-F", "name={repo}", "-f", `query=${query}`]));
    for (const issue of Object.values(out.data?.repository ?? {})) {
        if (!issue) continue;
        found.set(issue.number, {
            ...issue,
            labels: issue.labels.nodes.map((l) => l.name),
            comments: issue.comments.nodes,
        });
    }
    return found;
}

/**
 * A branch's note on its issue.
 * @param issue as readIssues returns it
 * @param branch the branch
 * @returns the comment `{ databaseId, body }`, or null
 */
export const findNote = (issue, branch) =>
    issue?.comments.findLast((c) => c.body.startsWith(noteMarker(branch))) ?? null;

/**
 * Whether a number is an open issue; says why not on stderr.
 * @param run runs gh
 * @param n the number
 * @returns 0 for an open issue, else 1
 */
function checkIssue(run, n) {
    // GraphQL's issue() answers null for a pull request's number, so only an open issue passes.
    const found = readIssues(run, [n]).get(n);
    if (found?.state === "OPEN") return 0;
    console.error(`branch-note: #${n} is ${found ? "closed" : "a pull request or no issue at all"}`);
    return 1;
}

/**
 * Writes or rewrites a branch's note: the fields given replace the note's, the rest are kept.
 * @param run runs gh
 * @param n the issue
 * @param branch the branch
 * @param fields the values to set
 * @returns the note's text
 */
export function writeNote(run, n, branch, fields) {
    const issue = readIssues(run, [n]).get(n);
    if (!issue) throw new Error(`issue #${n} not found`);
    const note = findNote(issue, branch);
    // A field left undefined or empty keeps the note's value.
    const given = Object.fromEntries(Object.entries(fields).filter(([, v]) => v));
    const body = noteBody(branch, { ...(note ? parseNote(note.body) : {}), branch, ...given });
    if (note) {
        run(["api", "-X", "PATCH", `repos/{owner}/{repo}/issues/comments/${note.databaseId}`, "-f", `body=${body}`]);
    } else {
        run(["api", "-X", "POST", `repos/{owner}/{repo}/issues/${n}/comments`, "-f", `body=${body}`]);
    }
    return body;
}

const git = (cwd, args) => {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : "";
};

/**
 * The branch's issue: the one given, its `branch.<b>.issue` setting, or the number in its name.
 * @param cwd a directory of the repository
 * @param branch the branch
 * @param [given] --issue
 * @returns the number, or null
 */
export function branchIssue(cwd, branch, given) {
    if (given) return Number(given);
    const set = git(cwd, ["config", `branch.${branch}.issue`]);
    return set ? Number(set) : issueInName(branch);
}

/**
 * Who owns the work: the owner given, else the Claude Code session, else user@host.
 * @param [given] --owner
 * @param [env] the environment
 * @returns a short description
 */
export function owner(given, env = process.env) {
    if (given) return given;
    if (env.CLAUDE_CODE_SESSION_ID) return `session ${env.CLAUDE_CODE_SESSION_ID}`;
    // A parent process's session file (~/.claude/sessions/<pid>.json) names the session that runs us.
    const sessions = join(homedir(), ".claude/sessions");
    for (let pid = process.ppid, depth = 0; pid > 1 && depth < 20; depth++) {
        try {
            const s = JSON.parse(readFileSync(join(sessions, `${pid}.json`), "utf8"));
            if (s.sessionId) return `session ${s.sessionId}`;
        } catch {
            // not a session's process
        }
        const stat = existsSync(`/proc/${pid}/stat`) ? readFileSync(`/proc/${pid}/stat`, "utf8") : "";
        pid = Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
    }
    return `${userInfo().username}@${hostname()}`;
}

const latestCommit = (cwd) => git(cwd, ["log", "-1", "--format=%h %s (%cI)"]);

/**
 * Opens an issue with a type, a priority and an effort label.
 * @param run runs gh
 * @param opts `title`, `branch`, `type` (default from the branch's prefix), `priority` and `effort` (default medium)
 * @returns its number
 */
export function newIssue(run, opts) {
    const prefix = opts.branch?.split("/")[0];
    const labels = [
        opts.type ?? TYPES[prefix] ?? "infrastructure",
        `priority:${opts.priority ?? "medium"}`,
        `effort:${opts.effort ?? "medium"}`,
    ];
    const body = `Opened by \`tools/worktree-new.sh\` for the branch \`${opts.branch}\`.`;
    const out = run([
        "api",
        "-X",
        "POST",
        "repos/{owner}/{repo}/issues",
        "-f",
        `title=${opts.title}`,
        "-f",
        `body=${body}`,
        ...labels.flatMap((l) => ["-f", `labels[]=${l}`]),
    ]);
    const number = JSON.parse(out).number;
    console.error(`branch-note: opened issue #${number} (${labels.join(", ")}): ${opts.title}`);
    return number;
}

/**
 * Whether the post-commit refresh for a branch is due, and if so marks it done now.
 * @param main the main checkout
 * @param branch the branch
 * @param [now] the time
 * @returns true when due
 */
export function commitDue(main, branch, now = Date.now()) {
    const file = join(main, "tmp/branch-note", `${branch.replaceAll("/", "-")}.stamp`);
    try {
        if (now - Number(readFileSync(file, "utf8")) < COMMIT_EVERY_MS) return false;
    } catch {
        // never refreshed
    }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, String(now));
    return true;
}

function parseArgs(argv) {
    const opts = {};
    argv.forEach((arg, i) => {
        const m = /^--([a-z-]+)$/.exec(arg);
        if (m) opts[m[1]] = argv[i + 1];
    });
    return opts;
}

/**
 * Runs one command.
 * @param argv the arguments after the script
 * @param [run] runs gh
 * @param [cwd] where
 * @returns the exit code
 */
export function main(argv, run = gh, cwd = process.cwd()) {
    const [command, ...rest] = argv;
    const o = parseArgs(rest);
    if (command === "new-issue") {
        if (!o.title) return usage();
        console.log(newIssue(run, o));
        return 0;
    }
    if (command === "check-issue") return checkIssue(run, Number(o.issue));
    const branch = o.branch ?? git(cwd, ["symbolic-ref", "-q", "--short", "HEAD"]);
    if (!["start", "update", "commit"].includes(command) || !branch) return usage();
    const n = branchIssue(cwd, branch, o.issue);
    if (!n) {
        console.error(`branch-note: ${branch} has no issue (give --issue N, or tools/worktree-new.sh --issue N)`);
        return command === "commit" ? 0 : 1;
    }
    if (command === "commit") {
        const main = dirname(git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]));
        if (!commitDue(main, branch)) return 0;
        writeNote(run, n, branch, { "latest commit": latestCommit(cwd) });
        return 0;
    }
    if (command === "start") {
        run(["api", "-X", "POST", `repos/{owner}/{repo}/issues/${n}/labels`, "-f", "labels[]=in-progress"]);
    }
    const fields = {
        worktree: o.worktree,
        owner: command === "start" || o.owner ? owner(o.owner) : undefined,
        "latest commit": latestCommit(o.worktree ?? cwd),
        done: o.done,
        left: o.left,
        next: o.next,
    };
    writeNote(run, n, branch, fields);
    console.error(`branch-note: the progress note of ${branch} on #${n} is current`);
    return 0;
}

function usage() {
    console.error(
        "usage: node tools/branch-note.mjs start --issue N --branch B --worktree P [--owner O]\n" +
            "     | update [--branch B] [--done T] [--left T] [--next T] [--owner O] [--worktree P]\n" +
            "     | commit [--branch B]\n" +
            "     | check-issue --issue N\n" +
            "     | new-issue --title T --branch B [--type T] [--priority P] [--effort E]",
    );
    return 1;
}

// realpath: run through a symlinked tools/ directory, argv names the link and import.meta.url the file.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        process.exitCode = main(process.argv.slice(2));
    } catch (e) {
        console.error(`branch-note: ${e.message}`);
        process.exitCode = 1;
    }
}
