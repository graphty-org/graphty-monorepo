#!/usr/bin/env node
// The only way an agent reads this repository's issues (#5719). Anyone on GitHub can open or comment on an issue, and
// an agent that reads that text while holding graphty-agent's push rights can be steered by it. This tool passes on
// only text written (and last edited) by a trusted account.
//
//   node tools/issue-queue.mjs list [--limit N] [--json]   open issues an issue round may take, in its order
//   node tools/issue-queue.mjs show <n>                    one trusted issue, untrusted comments withheld
//   gh api graphql ... | node tools/issue-queue.mjs filter  any GraphQL answer with untrusted titles and bodies withheld
//
// It reads GitHub through `gh api graphql` (as whoever gh is logged in as; agents are graphty-agent).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REPO = { owner: "graphty-org", name: "graphty-monorepo" };

// login -> the GraphQL actor type it must have. A user account named like a bot is a different type and fails.
const TRUSTED = new Map([
    ["apowers313", "User"],
    ["graphty-agent", "User"],
    ["github-actions", "Bot"],
    ["graphty-release-scheduler", "Bot"],
]);

const SKIP_LABELS = [
    "priority:critical",
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
const HELD_MAJOR = new Set([676, 702, 843, 1370]);
const PRIORITIES = ["high", "medium", "low"];
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
    if (labels.includes("documentation") && !labels.includes("bug")) return "documentation, not a bug";
    if (HELD_MAJOR.has(issue.number)) return "held major";
    if (issue.title.startsWith("Release held:")) return "release held";
    if (issue.title.includes("lane red on master")) return "lane red on master";
    if (/^Nightly (held on|missed slot)/.test(issue.title)) return "nightly alarm";
    if (/design\/brand|brand kit/i.test(issue.title)) return "design/brand";
    return null;
}

/**
 * The fields the round sorts and prints by.
 * @param issue a trusted GraphQL Issue
 * @param now the time ages are measured from, in ms
 * @returns `{ number, title, priority, type, effort, loadSensitive, createdAt, ageDays }`
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

function gh(query, vars) {
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

/**
 * The command line.
 * @param argv arguments after the script
 * @param run the GraphQL runner
 * @param now ms
 * @param stdin reads standard input, for `filter`
 * @returns `{ code, out }`
 */
export function main(argv, run = gh, now = Date.now(), stdin = () => readFileSync(0, "utf8")) {
    const [cmd, ...rest] = argv;
    if (cmd === "list") {
        const i = rest.indexOf("--limit");
        const limit = i >= 0 ? Number(rest[i + 1]) : Infinity;
        const result = queue(fetchOpen(run), now);
        if (rest.includes("--json")) {
            return { code: 0, out: JSON.stringify({ ...result, queue: result.queue.slice(0, limit) }, null, 2) };
        }
        return { code: 0, out: listLines(result, limit).join("\n") };
    }
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
    return { code: 2, out: "usage: issue-queue.mjs list [--limit N] [--json] | show <n> | filter < graphql.json" };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    try {
        const { code, out } = main(process.argv.slice(2));
        (code === 0 ? console.log : console.error)(out);
        process.exitCode = code;
    } catch (error) {
        console.error(`issue-queue: ${error.message.split("\n")[0]}`);
        process.exitCode = 2;
    }
}
