#!/usr/bin/env node
// health-owner-sweep.mjs -- every round of the pipeline-round skill: does every health dashboard member that is not
// ok, and every row of its chronic, flaky-quarantine and owner tables, have a LIVE owner? (#5052)
//
//   node tools/health-owner-sweep.mjs [--json]
//
// Reads the public status API (GET /v1/status and /v1/page/<page>, no credentials) and asks GitHub once (one GraphQL
// query through `gh api graphql`, as graphty-agent) about the issues and pull requests involved, then once more about
// the branches naming those issues. A member's owner is an open issue or pull request whose title or body names its
// id; a table row's owner is the issue or pull request in its own cells. An owner is live only on real work (#5857):
// a commit in the last 24 hours on a branch naming the issue, an open pull request (its own, or one closing the issue)
// that is green or has a commit in 24 hours, or a `taken` marker whose session is alive on this machine. A comment
// alone is not work: such an owner prints IDLE, "owned, idle <N> h". "The rows should age out" is not an owner.
// Prints one line per member and row; exits 1 when any of them has no live owner, 0 when every one has, 2 when the
// API or GitHub did not answer.
//   env STATUS_API (default the public endpoint), GITHUB_REPOSITORY (default graphty-org/graphty-monorepo)
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const STATUS_API = "https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com/v1";
const HOUR = 3_600_000;
const LIVE_MS = 24 * HOUR;
/** The tables whose rows are owned one by one: page, section. The flaky hotspots tree has no issue cell. */
export const TABLES = [
    ["ci", "chronic"],
    ["flaky", "quarantine"],
    ["pull-requests", "owner"],
];
const NOT_OK = new Set(["bad", "warn"]);

/**
 * The not-ok members of GET /v1/status, with when their open episode started.
 * @param status the answer
 * @returns `[{ id, state, since }]`; since is an ISO time or null
 */
export function notOkMembers(status) {
    const seen = new Map();
    for (const c of status.categories ?? []) {
        for (const m of [c.setBy, ...(c.others ?? [])]) {
            if (m?.member && NOT_OK.has(m.state) && !seen.has(m.member)) seen.set(m.member, m.state);
        }
    }
    const open = (status.episodes ?? []).filter((e) => e.end === null);
    return [...seen].map(([id, state]) => {
        const starts = open.filter((e) => e.member === id).map((e) => e.start);
        return { id, state, since: starts.sort()[0] ?? null };
    });
}

// every { t: "issue" | "pr", n } in a cell tree
function refsIn(node, out = []) {
    if (Array.isArray(node)) node.forEach((n) => refsIn(n, out));
    else if (node && typeof node === "object") {
        if ((node.t === "issue" || node.t === "pr") && Number.isInteger(node.n)) out.push({ kind: node.t, n: node.n });
        Object.values(node).forEach((v) => refsIn(v, out));
    }
    return out;
}
// the row's first name or label: what it is about
function labelOf(cells) {
    const all = JSON.stringify(cells);
    return /"t":"(?:name|label)","v":"((?:[^"\\]|\\.)*)"/.exec(all)?.[1] ?? "(row)";
}

/**
 * The rows of the owned tables.
 * @param pages `{ <page>: GET /v1/page/<page> }`
 * @returns `[{ table, label, refs }]`
 */
export function tableRows(pages) {
    const rows = [];
    for (const [page, id] of TABLES) {
        const section = (pages[page]?.sections ?? []).find((s) => s.id === id);
        for (const r of section?.rows ?? []) {
            rows.push({ table: `${page}/${id}`, label: labelOf(r.cells), refs: refsIn(r.cells) });
        }
    }
    return rows;
}

const PR_FIELDS =
    "number state mergeable commits(last: 1) { nodes { commit { committedDate statusCheckRollup { state } } } }";
const FIELDS =
    "__typename ... on Issue { number state createdAt comments(last: 20) { nodes { body createdAt } } " +
    `closedByPullRequestsReferences(first: 5, includeClosedPrs: false) { nodes { ${PR_FIELDS} } } } ` +
    `... on PullRequest { ${PR_FIELDS} }`;

/**
 * The first GraphQL query: each referenced issue or pull request, and a search per member for the open ones naming it.
 * @param repo owner/name
 * @param numbers the referenced numbers
 * @param members the member ids
 * @returns the query
 */
export function ownerQuery(repo, numbers, members) {
    const [owner, name] = repo.split("/");
    const items = [...new Set(numbers)].map((n) => `n${n}: issueOrPullRequest(number: ${n}) { ${FIELDS} }`);
    const searches = members.map((id, i) => {
        const query = JSON.stringify(`repo:${repo} is:open "${id}"`);
        return `m${i}: search(query: ${query}, type: ISSUE, first: 5) { nodes { ${FIELDS} } }`;
    });
    const repoPart = items.length ? `repository(owner: "${owner}", name: "${name}") { ${items.join(" ")} }` : "";
    return `{ ${repoPart} ${searches.join(" ")} }`;
}

/**
 * The second GraphQL query, once the owning issues are known: the branches whose names hold each issue's number.
 * @param repo owner/name
 * @param numbers the issue numbers
 * @returns the query; its answer's repository.b<n>.nodes are `{ name, target: { committedDate } }`
 */
export function branchQuery(repo, numbers) {
    const [owner, name] = repo.split("/");
    const refs = [...new Set(numbers)].map(
        (n) =>
            `b${n}: refs(refPrefix: "refs/heads/", query: "${n}", first: 20) { nodes { name target { ... on Commit { committedDate } } } }`,
    );
    return `{ repository(owner: "${owner}", name: "${name}") { ${refs.join(" ")} } }`;
}

/**
 * The issue numbers among an answer of ownerQuery: the ones branchQuery asks about.
 * @param gql the answer's data
 * @returns the numbers
 */
export function issueNumbers(gql) {
    const nodes = [
        ...Object.values(gql?.repository ?? {}),
        ...Object.entries(gql ?? {})
            .filter(([k]) => k !== "repository")
            .flatMap(([, v]) => v?.nodes ?? []),
    ];
    return [...new Set(nodes.filter((n) => n?.__typename === "Issue").map((n) => n.number))];
}

const MARKER = /^pipeline-round: (?:taken by session (\S+?),)?/m;
/**
 * The session of an issue's open claim: its newest pipeline-round marker is a `taken` marker written in the last 24
 * hours. Any later marker (no pull request, ready, opened, released, ...) ends the job, and a claim older than a day
 * is not work: the marked session is often a long-running /loop whose subagent finished long ago.
 * @param issue GraphQL's issue, with its last comments
 * @param now ms
 * @returns the session id, or null
 */
export function takenSession(issue, now) {
    for (const c of [...(issue.comments?.nodes ?? [])].reverse()) {
        const m = MARKER.exec(c.body ?? "");
        if (!m) continue;
        return m[1] && now - Date.parse(c.createdAt) <= LIVE_MS ? m[1] : null;
    }
    return null;
}

// a pull request is working when it is green and mergeable, or has a commit in 24 hours
function prWork(p, now) {
    const commit = p.commits?.nodes?.[0]?.commit;
    const at = commit ? Date.parse(commit.committedDate) : Number.NaN;
    const green = commit?.statusCheckRollup?.state === "SUCCESS" && p.mergeable !== "CONFLICTING";
    if (green) return { live: true, why: "green" };
    if (now - at <= LIVE_MS) return { live: true, why: `commit ${Math.floor((now - at) / HOUR)} h ago`, at };
    return { live: false, at };
}

/**
 * Whether an issue or pull request is a live owner: one with real work. A comment is not work (#5857): an issue is
 * live only with a commit in 24 hours on a branch naming it, an open pull request closing it that is green or has a
 * commit in 24 hours, or a `taken` marker whose session is alive.
 * @param node GraphQL's issue or pull request, or null
 * @param now ms
 * @param o the evidence beyond the node
 * @param o.branches the branchQuery answer's repository (`{ b<n>: { nodes } }`)
 * @param o.alive (session id) => whether that session is alive
 * @returns `{ live, why, idle }`; idle is true for an open owner with no work in 24 hours
 */
export function liveness(node, now, o = {}) {
    const { branches = {}, alive = () => false } = o;
    if (!node) return { live: false, why: "not found" };
    if (node.state !== "OPEN") return { live: false, why: node.state.toLowerCase() };
    const idle = (times) => {
        const last = Math.max(...times.filter(Number.isFinite));
        const h = Number.isFinite(last) ? Math.floor((now - last) / HOUR) : null;
        return { live: false, idle: true, why: h === null ? "owned, no work yet" : `owned, idle ${h} h` };
    };
    if (node.__typename === "PullRequest") {
        const w = prWork(node, now);
        return w.live ? { live: true, why: `open pull request, ${w.why}` } : idle([w.at]);
    }
    const prs = (node.closedByPullRequestsReferences?.nodes ?? []).filter((p) => p.state === "OPEN");
    const works = prs.map((p) => ({ p, w: prWork(p, now) }));
    const pr = works.find((x) => x.w.live);
    if (pr) return { live: true, why: `open, pull request #${pr.p.number} ${pr.w.why}` };
    const named = new RegExp(String.raw`(^|\D)${node.number}(\D|$)`);
    const commits = (branches[`b${node.number}`]?.nodes ?? [])
        .filter((b) => named.test(b.name))
        .map((b) => ({ name: b.name, at: Date.parse(b.target?.committedDate) }));
    const fresh = commits.find((b) => now - b.at <= LIVE_MS);
    if (fresh) return { live: true, why: `open, commit ${Math.floor((now - fresh.at) / HOUR)} h ago on ${fresh.name}` };
    const session = takenSession(node, now);
    if (session && alive(session)) return { live: true, why: `open, taken by live session ${session}` };
    return idle([...works.map((x) => x.w.at), ...commits.map((b) => b.at), Date.parse(node.createdAt)]);
}

function ref(node) {
    if (!node) return "";
    const kind = node.__typename === "PullRequest" ? "PR " : "";
    return `${kind}#${node.number}`;
}
const tag = (best) => {
    if (best?.l.live) return "owned  ";
    return best?.l.idle ? "IDLE   " : "NO OWNER";
};
const hours = (since, now) => (since ? `${Math.floor((now - Date.parse(since)) / HOUR)} h` : "? h");

/**
 * The sweep: every not-ok member and owned row, its owner and whether that owner is live.
 * @param o the inputs
 * @param o.status GET /v1/status
 * @param o.pages the owned tables' pages
 * @param o.gql the GraphQL answer's data for ownerQuery(...)
 * @param o.branches the repository of the GraphQL answer's data for branchQuery(...)
 * @param o.alive (session id) => whether that session is alive
 * @param o.now ms
 * @returns `{ lines, unowned }`
 */
export function sweep({ status, pages, gql, branches, alive, now }) {
    const members = notOkMembers(status);
    const rows = tableRows(pages);
    const items = gql?.repository ?? {};
    const lines = [];
    let unowned = 0;
    members.forEach((m, i) => {
        const found = (gql?.[`m${i}`]?.nodes ?? []).map((n) => ({ n, l: liveness(n, now, { branches, alive }) }));
        const best = found.find((f) => f.l.live) ?? found[0];
        if (!best?.l.live) unowned++;
        const who = best ? `${ref(best.n)} (${best.l.why})` : "no issue or pull request names it";
        lines.push(`${tag(best)} member ${m.id} ${m.state} for ${hours(m.since, now)}: ${who}`);
    });
    for (const r of rows) {
        const found = r.refs
            .map((x) => ({ n: items[`n${x.n}`] ?? null, x }))
            .map((f) => ({ ...f, l: liveness(f.n, now, { branches, alive }) }));
        const best = found.find((f) => f.l.live) ?? found[0];
        if (!best?.l.live) unowned++;
        let who = "no issue in its row";
        if (best) who = `${best.n ? ref(best.n) : "#" + best.x.n} (${best.l.why})`;
        lines.push(`${tag(best)} ${r.table} "${r.label}": ${who}`);
    }
    const total = members.length + rows.length;
    lines.push(
        unowned
            ? `${unowned} of ${total} not-ok members and rows have no live owner`
            : `${members.length} members not ok, ${rows.length} rows, all owned`,
    );
    return { lines, unowned };
}

async function getJson(url) {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
    return res.json();
}

function graphql(query) {
    const out = execFileSync("gh", ["api", "graphql", "-f", `query=${query}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
    });
    return JSON.parse(out).data ?? {};
}

/**
 * Whether a Claude session is alive on this machine, as pipeline-round's shared.md defines it: a session file names
 * it, and its pid runs with the same start time (session files outlive their sessions, and pids are reused).
 * @param id the session id
 * @param dir the session files' folder
 * @returns boolean
 */
export function sessionAlive(id, dir = join(homedir(), ".claude", "sessions")) {
    let files = [];
    try {
        files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
        return false;
    }
    return files.some((f) => {
        try {
            const s = JSON.parse(readFileSync(join(dir, f), "utf8"));
            if (s.sessionId !== id) return false;
            const stat = readFileSync(`/proc/${s.pid}/stat`, "utf8");
            // field 22 (starttime), counted after the parenthesized command name, which may hold spaces
            return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19] === String(s.procStart);
        } catch {
            return false;
        }
    });
}

async function main(env = process.env) {
    const api = env.STATUS_API || STATUS_API;
    const repo = env.GITHUB_REPOSITORY || "graphty-org/graphty-monorepo";
    const status = await getJson(`${api}/status`);
    const pages = {};
    for (const page of new Set(TABLES.map(([p]) => p))) pages[page] = await getJson(`${api}/page/${page}`);
    const members = notOkMembers(status).map((m) => m.id);
    const numbers = tableRows(pages).flatMap((r) => r.refs.map((x) => x.n));
    let gql = {};
    if (members.length || numbers.length) gql = graphql(ownerQuery(repo, numbers, members));
    const issues = issueNumbers(gql);
    const branches = issues.length ? (graphql(branchQuery(repo, issues)).repository ?? {}) : {};
    const r = sweep({ status, pages, gql, branches, alive: sessionAlive, now: Date.now() });
    console.log(r.lines.join("\n"));
    return r.unowned ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    try {
        process.exitCode = await main();
    } catch (error) {
        console.error(`health-owner-sweep: ${error.message.split("\n")[0]}`);
        process.exitCode = 2;
    }
}
