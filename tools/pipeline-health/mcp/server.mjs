#!/usr/bin/env node
// Read-only stdio MCP server over the pipeline health read API (design/ci/health-dashboard.md,
// section 12). It reads only the public GET routes, so agents need no credentials.
//
// Every result is small JSON: arrays are cut at 50 rows (with `truncated: true`), sparklines are
// dropped, and each result carries `freshness`: the age of the payload and of every source, with
// `stale: true` past its limit (15 minutes when the source gives none). A route that does not
// answer is an error result naming the route; the server never throws.
//
// HEALTH_API_URL sets the API base (default: the deployed us-east-2 HTTP API).

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { apiPath, CATEGORY_IDS } from "../web/src/contract.ts";

const BASE = (process.env.HEALTH_API_URL ?? "https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com").replace(
    /\/+$/,
    "",
);
const MAX_ROWS = 50;
const DEFAULT_LIMIT_S = 15 * 60;
const TIMEOUT_MS = 15_000;
const PAGES = [...CATEGORY_IDS, "runners", "local-runs"];
const LEVELS = ["group", "family", "shard", "file", "test"];
const MEMBER_STATES = ["ok", "warn", "bad", "nodata", "notsetup", "few", "partial", "idle", "slow", "info"];

class RouteError extends Error {
    constructor(route, status, detail) {
        super(`${route}: ${detail}`);
        this.route = route;
        this.status = status;
        this.detail = detail;
    }
}

async function get(route) {
    let res;
    try {
        res = await fetch(BASE + route, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (err) {
        throw new RouteError(route, null, `API did not answer (${err.cause?.code ?? err.name})`);
    }
    if (!res.ok) {
        const detail = res.status === 404 ? "route not served (yet)" : `HTTP ${res.status}`;
        throw new RouteError(route, res.status, detail);
    }
    try {
        return await res.json();
    } catch {
        throw new RouteError(route, res.status, "response is not JSON");
    }
}

const page = (name, range) => get(apiPath({ kind: "page", page: name, range }));
const sectionOf = (p, id) => p.sections?.find((s) => s.id === id) ?? null;

function ageS(iso, now) {
    return iso ? Math.round((now - Date.parse(iso)) / 1000) : null;
}

function freshness(data, status) {
    const now = Date.now();
    const age = ageS(data?.generated, now);
    const out = { generated: data?.generated ?? null, ageS: age, stale: age === null || age > DEFAULT_LIMIT_S };
    if (status instanceof RouteError) {
        out.sourcesError = status.message;
    } else {
        out.sources = (status.sources ?? []).map((s) => {
            const a = ageS(s.lastWrite, now);
            const limitS = s.limitS ?? DEFAULT_LIMIT_S;
            return {
                id: s.id,
                state: s.state,
                lastWrite: s.lastWrite,
                ageS: a,
                limitS,
                stale: a === null || a > limitS,
            };
        });
    }
    return out;
}

// Cuts every array at MAX_ROWS and drops sparklines (drawing data, not facts an agent needs).
function cap(value, flag) {
    if (Array.isArray(value)) {
        if (value.length > MAX_ROWS) flag.cut = true;
        return value.slice(0, MAX_ROWS).map((v) => cap(v, flag));
    }
    if (value && typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (k !== "spark") out[k] = cap(v, flag);
        }
        return out;
    }
    return value;
}

function mentionsPr(value, n) {
    if (Array.isArray(value)) return value.some((v) => mentionsPr(v, n));
    if (!value || typeof value !== "object") return false;
    if (value.t === "pr" && value.n === n) return true;
    return Object.values(value).some((v) => mentionsPr(v, n));
}

function flatten(nodes, path, out) {
    for (const { children, ...node } of nodes ?? []) {
        const here = [...path, node.name];
        out.push({ ...node, path: here });
        flatten(children, here, out);
    }
    return out;
}

function pageSummary(p) {
    return { page: p.page, range: p.range, generated: p.generated, state: p.state, setBy: p.setBy, others: p.others };
}

function invalid(message) {
    throw new RouteError("(arguments)", null, message);
}

function oneOf(value, allowed, name, fallback) {
    const v = value ?? fallback;
    if (!allowed.includes(v)) invalid(`${name} must be one of ${allowed.join(", ")}`);
    return v;
}

const range = { type: "string", enum: ["1h", "6h", "24h"], description: "Window of the page's values; default 1h." };
const slowRange = { type: "string", enum: ["7d", "28d"], description: "Window of a slow measure; default 28d." };
const schema = (properties = {}, required = []) => ({ type: "object", properties, required });

const TOOLS = [
    {
        name: "health_status",
        description: "Each category's state, the member that set it, the others not OK, and the last 24 h of episodes.",
        inputSchema: schema(),
        run: async () => {
            const s = await get(apiPath({ kind: "status" }));
            return { status: s, data: { generated: s.generated, categories: s.categories, episodes: s.episodes } };
        },
    },
    {
        name: "category",
        description: `One page: its state, members (value, SLA, state) and sections. name: ${PAGES.join(", ")}.`,
        inputSchema: schema({ name: { type: "string", enum: PAGES }, range }, ["name"]),
        run: async (a) => {
            const name = oneOf(a.name, PAGES, "name");
            const r = oneOf(
                a.range,
                name === "costs" ? ["7d", "28d"] : ["1h", "6h", "24h"],
                "range",
                name === "costs" ? "28d" : "1h",
            );
            return { data: await page(name, r) };
        },
    },
    {
        name: "master",
        description: "Master: red spans, full-run verdict, untested age, shared failures with suspects.",
        inputSchema: schema({ range }),
        run: async (a) => ({ data: await page("master", oneOf(a.range, ["1h", "6h", "24h"], "range", "1h")) }),
    },
    {
        name: "runners",
        description:
            "Running and queued jobs against the limit, who holds the runners, saturated or not being assigned.",
        inputSchema: schema({ range }),
        run: async (a) => ({ data: await page("runners", oneOf(a.range, ["1h", "6h", "24h"], "range", "1h")) }),
    },
    {
        name: "release_lanes",
        description: "Releases: the lanes of the newest tested candidate, train attempts and release workflows.",
        inputSchema: schema(),
        run: async () => {
            const p = await page("releases", "1h");
            return {
                data: {
                    ...pageSummary(p),
                    members: p.members,
                    lanes: sectionOf(p, "lanes"),
                    trains: sectionOf(p, "trains"),
                    workflows: sectionOf(p, "workflows"),
                },
            };
        },
    },
    {
        name: "pull_requests",
        description:
            "Pull requests page. number: only section rows naming that pull request. state: only members in that state.",
        inputSchema: schema({ number: { type: "integer" }, state: { type: "string", enum: MEMBER_STATES }, range }),
        run: async (a) => {
            const p = await page("pull-requests", oneOf(a.range, ["1h", "6h", "24h"], "range", "1h"));
            const state = a.state === undefined ? undefined : oneOf(a.state, MEMBER_STATES, "state");
            const members = state ? p.members.filter((m) => m.state === state) : p.members;
            const sections =
                a.number === undefined
                    ? p.sections
                    : p.sections
                          .filter((s) => s.rows)
                          .map((s) => ({ ...s, rows: s.rows.filter((row) => mentionsPr(row, a.number)) }));
            return { data: { ...pageSummary(p), members, sections } };
        },
    },
    {
        name: "owner_queue",
        description: "Pull requests waiting on the owner (screenshots, owner merges, breaking-go), and why.",
        inputSchema: schema(),
        run: async () => {
            const p = await page("pull-requests", "1h");
            return { data: { generated: p.generated, owner: sectionOf(p, "owner") } };
        },
    },
    {
        name: "flaky_hotspots",
        description:
            "Flake hotspots flattened at one level (group, family, shard, file, test), worst per 1000 first. under: an ancestor's name.",
        inputSchema: schema({ range: slowRange, level: { type: "string", enum: LEVELS }, under: { type: "string" } }),
        run: async (a) => {
            const r = oneOf(a.range, ["7d", "28d"], "range", "28d");
            const level = oneOf(a.level, LEVELS, "level", "test");
            const s = await get(apiPath({ kind: "section", page: "flaky", section: "hotspots", range: r }));
            const nodes = flatten(s.section?.nodes, [], [])
                .filter((n) => n.level === level && (!a.under || n.path.slice(0, -1).includes(a.under)))
                .sort((x, y) => y.per1000 - x.per1000);
            return { data: { generated: s.generated, range: r, level, quiet: s.section?.quiet, nodes } };
        },
    },
    {
        name: "test_history",
        description: "One test's (or file's) flaky and failed results, newest first.",
        inputSchema: schema({ file: { type: "string" }, test: { type: "string" }, range: slowRange }, ["file"]),
        run: async (a) => {
            if (typeof a.file !== "string" || !a.file) invalid("file is required");
            const r = oneOf(a.range, ["7d", "28d"], "range", "28d");
            return { data: await get(apiPath({ kind: "test-history", file: a.file, test: a.test, range: r })) };
        },
    },
    {
        name: "shard_times",
        description:
            "Shard median and p90 times against budget, with top files. kind: full or pr-bins. shard: one shard.",
        inputSchema: schema({
            range: slowRange,
            kind: { type: "string", enum: ["full", "pr-bins"] },
            shard: { type: "string" },
        }),
        run: async (a) => {
            const r = oneOf(a.range, ["7d", "28d"], "range", "28d");
            const kind = oneOf(a.kind, ["full", "pr-bins"], "kind", "full");
            const s = await get(apiPath({ kind: "section", page: "ci", section: "shards", range: r, runKind: kind }));
            const rows = s.section?.rows ?? [];
            return {
                data: {
                    generated: s.generated,
                    range: r,
                    kind,
                    more: s.section?.more,
                    rows: a.shard ? rows.filter((x) => x.shard === a.shard) : rows,
                },
            };
        },
    },
    {
        name: "ci_runs",
        description:
            "CI page: runner wait, first-attempt failures and their causes, hangs, reruns, shards over budget.",
        inputSchema: schema({ range }),
        run: async (a) => ({ data: await page("ci", oneOf(a.range, ["1h", "6h", "24h"], "range", "1h")) }),
    },
    {
        name: "run",
        description: "One workflow run with its jobs.",
        inputSchema: schema({ runId: { type: "integer" } }, ["runId"]),
        run: async (a) => {
            if (!Number.isSafeInteger(a.runId) || a.runId <= 0) invalid("runId must be a positive integer");
            return { data: await get(apiPath({ kind: "run", id: a.runId })) };
        },
    },
    {
        name: "costs",
        description:
            "Costs: spend so far against budget, unit costs, spend by workflow. month (YYYY-MM): only the current month is served.",
        inputSchema: schema({ month: { type: "string", pattern: "^\\d{4}-\\d{2}$" } }),
        run: async (a) => {
            const p = await page("costs", "28d");
            if (a.month && a.month !== p.generated?.slice(0, 7)) {
                invalid(`the read API serves only the current month (${p.generated?.slice(0, 7)})`);
            }
            return { data: p };
        },
    },
    {
        name: "sources",
        description:
            "Each data source's last write, limit and state, and the members not set up yet with what unblocks them.",
        inputSchema: schema(),
        run: async () => {
            const p = await page("data-sources", "1h");
            return {
                data: { ...pageSummary(p), sources: sectionOf(p, "sources"), notSetUp: sectionOf(p, "not-set-up") },
            };
        },
    },
];

function result(payload, isError = false) {
    return { content: [{ type: "text", text: JSON.stringify(payload) }], isError };
}

async function callTool(name, args = {}) {
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) return result({ error: `unknown tool ${name}` }, true);
    try {
        const [out, status] = await Promise.all([tool.run(args), get(apiPath({ kind: "status" })).catch((err) => err)]);
        const flag = { cut: false };
        const data = cap(out.data, flag);
        return result({ ...data, truncated: flag.cut, freshness: freshness(out.data, out.status ?? status) });
    } catch (err) {
        if (!(err instanceof RouteError)) return result({ error: String(err?.message ?? err) }, true);
        return result({ error: err.detail, route: err.route, status: err.status, api: BASE }, true);
    }
}

const server = new Server({ name: "pipeline-health", version: "0.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));
server.setRequestHandler(CallToolRequestSchema, (req) => callTool(req.params.name, req.params.arguments));
await server.connect(new StdioServerTransport());
