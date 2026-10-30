#!/usr/bin/env node
// health-owner-sweep.mjs -- every round of the pipeline-round skill: does every health dashboard member that is not
// ok, and every row of its chronic, flaky-quarantine and owner tables, have a LIVE owner? (#5052)
//
//   node tools/health-owner-sweep.mjs [--json]
//
// Reads the public status API (GET /v1/status and /v1/page/<page>, no credentials) and asks GitHub once (one GraphQL
// query through `gh api graphql`, as graphty-agent) about the issues and pull requests involved. A member's owner is an
// open issue or pull request whose title or body names its id; a table row's owner is the issue or pull request in
// its own cells. An owner is live when it is open and is a pull request, was updated in the last 24 hours, or has an
// open pull request that closes it. "The rows should age out" is not an owner. Prints one line per member and row;
// exits 1 when any of them has no live owner, 0 when every one has, 2 when the API or GitHub did not answer.
//   env STATUS_API (default the public endpoint), GITHUB_REPOSITORY (default graphty-org/graphty-monorepo)
import { execFileSync } from "node:child_process";
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

/**
 * The one GraphQL query: each referenced issue or pull request, and a search per member for the open ones naming it.
 * @param repo owner/name
 * @param numbers the referenced numbers
 * @param members the member ids
 * @returns the query
 */
export function ownerQuery(repo, numbers, members) {
    const [owner, name] = repo.split("/");
    const fields =
        "__typename ... on Issue { number state updatedAt closedByPullRequestsReferences(first: 5, includeClosedPrs: false) { nodes { state } } } ... on PullRequest { number state updatedAt }";
    const items = [...new Set(numbers)].map((n) => `n${n}: issueOrPullRequest(number: ${n}) { ${fields} }`);
    const searches = members.map(
        (id, i) =>
            `m${i}: search(query: ${JSON.stringify(`repo:${repo} is:open "${id}"`)}, type: ISSUE, first: 5) { nodes { ${fields} } }`,
    );
    const repoPart = items.length ? `repository(owner: "${owner}", name: "${name}") { ${items.join(" ")} }` : "";
    return `{ ${repoPart} ${searches.join(" ")} }`;
}

/**
 * Whether an issue or pull request is a live owner.
 * @param node GraphQL's issue or pull request, or null
 * @param now ms
 * @returns `{ live, why }`
 */
export function liveness(node, now) {
    if (!node) return { live: false, why: "not found" };
    if (node.state !== "OPEN") return { live: false, why: node.state.toLowerCase() };
    if (node.__typename === "PullRequest") return { live: true, why: "open pull request" };
    if ((node.closedByPullRequestsReferences?.nodes ?? []).some((p) => p.state === "OPEN"))
        return { live: true, why: "open, with an open pull request" };
    const age = now - Date.parse(node.updatedAt);
    if (age <= LIVE_MS) return { live: true, why: `open, updated ${Math.floor(age / HOUR)} h ago` };
    return { live: false, why: `open, but untouched ${Math.floor(age / HOUR)} h` };
}

const ref = (node) => (node ? `${node.__typename === "PullRequest" ? "PR " : ""}#${node.number}` : "");
const hours = (since, now) => (since ? `${Math.floor((now - Date.parse(since)) / HOUR)} h` : "? h");

/**
 * The sweep: every not-ok member and owned row, its owner and whether that owner is live.
 * @param o the inputs
 * @param o.status GET /v1/status
 * @param o.pages the owned tables' pages
 * @param o.gql the GraphQL answer's data for ownerQuery(...)
 * @param o.now ms
 * @returns `{ lines, unowned }`
 */
export function sweep({ status, pages, gql, now }) {
    const members = notOkMembers(status);
    const rows = tableRows(pages);
    const items = gql?.repository ?? {};
    const lines = [];
    let unowned = 0;
    members.forEach((m, i) => {
        const found = (gql?.[`m${i}`]?.nodes ?? []).map((n) => ({ n, l: liveness(n, now) }));
        const best = found.find((f) => f.l.live) ?? found[0];
        if (!best?.l.live) unowned++;
        const who = best ? `${ref(best.n)} (${best.l.why})` : "no issue or pull request names it";
        lines.push(
            `${best?.l.live ? "owned  " : "NO OWNER"} member ${m.id} ${m.state} for ${hours(m.since, now)}: ${who}`,
        );
    });
    for (const r of rows) {
        const found = r.refs
            .map((x) => ({ n: items[`n${x.n}`] ?? null, x }))
            .map((f) => ({ ...f, l: liveness(f.n, now) }));
        const best = found.find((f) => f.l.live) ?? found[0];
        if (!best?.l.live) unowned++;
        const who = best ? `${best.n ? ref(best.n) : `#${best.x.n}`} (${best.l.why})` : "no issue in its row";
        lines.push(`${best?.l.live ? "owned  " : "NO OWNER"} ${r.table} "${r.label}": ${who}`);
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

async function main(env = process.env) {
    const api = env.STATUS_API || STATUS_API;
    const repo = env.GITHUB_REPOSITORY || "graphty-org/graphty-monorepo";
    const status = await getJson(`${api}/status`);
    const pages = {};
    for (const page of new Set(TABLES.map(([p]) => p))) pages[page] = await getJson(`${api}/page/${page}`);
    const members = notOkMembers(status).map((m) => m.id);
    const numbers = tableRows(pages).flatMap((r) => r.refs.map((x) => x.n));
    let gql = {};
    if (members.length || numbers.length) {
        const out = execFileSync("gh", ["api", "graphql", "-f", `query=${ownerQuery(repo, numbers, members)}`], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "inherit"],
        });
        gql = JSON.parse(out).data ?? {};
    }
    const r = sweep({ status, pages, gql, now: Date.now() });
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
