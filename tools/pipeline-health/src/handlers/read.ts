// The public read API (design/ci/health-dashboard.md, sections 10.3 and 11; routes in web/src/contract.ts). Every
// answer is one precomputed item the collector rewrote this cycle, or 503 {code: "no_data"} when there is none.
// CORS is answered by the HTTP API itself (corsPreflight in infra/health-stack.ts).

import { gunzipSync } from "node:zlib";

import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import type { IssueRange, PageId, Range, SlowRange } from "../../web/src/contract.js";
import { dynamoStore } from "../dynamo.js";
import { runDrill, testHistory } from "../model/drill.js";
import type { Store } from "../model/store.js";
import { type ViewItem, viewKey, type ViewRoute } from "../views/index.js";

const RANGES = ["1h", "6h", "24h"];
const PAGES = new Set<string>([
    "overview",
    "master",
    "pull-requests",
    "ci",
    "runners",
    "flaky",
    "releases",
    "costs",
    "data-sources",
    "local-runs",
    "issues",
]);
/** Each page's ranges, when not RANGES; the first is its default. */
const PAGE_RANGES: Record<string, string[]> = { costs: ["7d", "28d"], issues: ["28d", "all"] };
/** The slow sections, their ranges and run kinds (the first is the default). */
const SECTIONS: Record<string, { ranges: string[]; kinds?: string[] }> = {
    "ci/shards": { ranges: ["7d", "28d"], kinds: ["full", "pr-bins"] },
    "flaky/hotspots": { ranges: ["7d", "28d"] },
    // The runner history: 15-minute buckets are kept 8 days, so 7 d only.
    "runners/jobs": { ranges: ["7d"] },
};
const ALIAS: Record<string, string> = { local: "local-runs" };

let store: Store | undefined;

/**
 * The view a request names, or a 4xx reason.
 * @param path - the request path
 * @param query - the query string parameters
 * @returns the view route, or the status and error code to answer
 */
export function routeOf(
    path: string,
    query: Record<string, string | undefined>,
): ViewRoute | { status: number; code: string } {
    if (path === "/v1/status") {
        return { kind: "status" };
    }
    const parts = path.split("/").filter(Boolean); // v1 page <page> [<section>]
    if (parts[0] !== "v1" || parts[1] !== "page" || parts.length < 3 || parts.length > 4) {
        return { status: 404, code: "unknown_route" };
    }
    const page = (ALIAS[parts[2]] ?? parts[2]) as Exclude<PageId, "overview">;
    if (!PAGES.has(page)) {
        return { status: 404, code: "unknown_page" };
    }
    if (parts.length === 3) {
        const ranges = PAGE_RANGES[page] ?? RANGES;
        const range = query.range ?? ranges[0];
        if (!ranges.includes(range)) {
            return { status: 400, code: "bad_range" };
        }
        return { kind: "page", page, range: range as Range | SlowRange | IssueRange };
    }
    const section = SECTIONS[`${page}/${parts[3]}`];
    if (!section) {
        return { status: 404, code: "unknown_section" };
    }
    const range = query.range ?? "7d";
    if (!section.ranges.includes(range)) {
        return { status: 400, code: "bad_range" };
    }
    const route = { kind: "section" as const, page, section: parts[3], range: range as SlowRange };
    if (!section.kinds) {
        return route;
    }
    const runKind = query.kind ?? section.kinds[0];
    return section.kinds.includes(runKind) ? { ...route, runKind } : { status: 400, code: "bad_kind" };
}

/**
 * GET /v1/health, /v1/status, /v1/page/<page>?range=, /v1/page/<page>/<section>?range=.
 * @param event - the HTTP API request
 * @returns the JSON response
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    if (event.rawPath === "/v1/health") {
        return json(200, { ok: true, time: new Date().toISOString() }, "no-store");
    }
    const drill = await drillDown(event);
    if (drill) {
        return drill;
    }
    const route = routeOf(event.rawPath, event.queryStringParameters ?? {});
    if ("status" in route) {
        return json(route.status, { code: route.code }, "max-age=300");
    }
    try {
        store ??= dynamoStore(process.env.TABLE_NAME ?? "graphty-health");
        const item = (await store.get(viewKey(route))) as ViewItem | undefined;
        if (!(item?.gz instanceof Uint8Array)) {
            return json(503, { code: "no_data" }, "max-age=60");
        }
        const gz = Buffer.from(item.gz);
        const gzip = /\bgzip\b/.test(event.headers?.["accept-encoding"] ?? "");
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
                "cache-control": "public, max-age=60",
                "last-modified": new Date(item.generated).toUTCString(),
                vary: "accept-encoding",
                ...(gzip ? { "content-encoding": "gzip" } : {}),
            },
            body: gzip ? gz.toString("base64") : gunzipSync(gz).toString("utf8"),
            isBase64Encoded: gzip,
        };
    } catch (error) {
        console.error(JSON.stringify({ route: event.rawPath, error: String(error) }));
        return json(503, { code: "no_data" }, "no-store");
    }
}

/**
 * GET /v1/run/<id> and /v1/test-history, read from their index items; undefined for every other route.
 * @param event - the API Gateway request
 * @returns the response, or undefined when the route is not a drill-down
 */
async function drillDown(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2 | undefined> {
    const run = /^\/v1\/run\/(\d+)$/.exec(event.rawPath);
    if (!run && event.rawPath !== "/v1/test-history") {
        return undefined;
    }
    const q = event.queryStringParameters ?? {};
    const range = q.range ?? "7d";
    if (!run && !q.file) {
        return json(400, { code: "missing_file" }, "max-age=300");
    }
    if (!run && range !== "7d" && range !== "28d") {
        return json(400, { code: "bad_range" }, "max-age=300");
    }
    try {
        const db = (store ??= dynamoStore(process.env.TABLE_NAME ?? "graphty-health"));
        const body = run
            ? await runDrill(db, Number(run[1]), Date.now())
            : await testHistory(db, { file: q.file ?? "", test: q.test, range: range as "7d" | "28d" }, Date.now());
        return body ? json(200, body, "public, max-age=60") : json(503, { code: "no_data" }, "max-age=60");
    } catch (error) {
        console.error(JSON.stringify({ route: event.rawPath, error: String(error) }));
        return json(503, { code: "no_data" }, "no-store");
    }
}

function json(statusCode: number, body: unknown, cache: string): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode,
        headers: { "content-type": "application/json", "cache-control": cache },
        body: JSON.stringify(body),
    };
}
