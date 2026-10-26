// The public read API (design/ci/health-dashboard.md, sections 10.3 and 11; routes in web/src/contract.ts). Every
// answer is one precomputed item the collector rewrote this cycle, or 503 {code: "no_data"} when there is none.
// CORS is answered by the HTTP API itself (corsPreflight in infra/health-stack.ts).

import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { dynamoStore } from "../dynamo.js";
import { runDrill, testHistory } from "../model/drill.js";
import type { Store } from "../model/store.js";
import { readPage, unzip } from "../recompute.js";

const RANGES = new Set(["1h", "6h", "24h"]);
const SLOW = new Set(["7d", "28d"]);
const PAGES = new Set([
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
]);
const ALIAS: Record<string, string> = { local: "local-runs" };

let store: Store | undefined;

/** The read item a request names, or a 4xx reason. */
export function itemName(
    path: string,
    query: Record<string, string | undefined>,
): string | { status: number; code: string } {
    if (path === "/v1/status") return "status";
    const parts = path.split("/").filter(Boolean); // v1 page <page> [<section>]
    if (parts[0] !== "v1" || parts[1] !== "page" || parts.length < 3 || parts.length > 4)
        return { status: 404, code: "unknown_route" };
    const page = ALIAS[parts[2]] ?? parts[2];
    if (!PAGES.has(page)) return { status: 404, code: "unknown_page" };
    if (parts.length === 3) {
        const range = query.range ?? (page === "costs" ? "7d" : "1h");
        if (!(page === "costs" ? SLOW : RANGES).has(range)) return { status: 400, code: "bad_range" };
        return `page/${page}/${range}`;
    }
    const range = query.range ?? "7d";
    if (!SLOW.has(range)) return { status: 400, code: "bad_range" };
    const section = parts[3];
    if (page === "ci" && section === "shards") return `section/ci/shards/${range}/${query.kind ?? "full"}`;
    if (page === "flaky" && section === "hotspots") return `section/flaky/hotspots/${range}`;
    return { status: 404, code: "unknown_section" };
}

/**
 * GET /v1/health, /v1/status, /v1/page/<page>?range=, /v1/page/<page>/<section>?range=.
 * @param event - the HTTP API request
 * @returns the JSON response
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    if (event.rawPath === "/v1/health") return json(200, { ok: true, time: new Date().toISOString() }, "no-store");
    const drill = await drillDown(event);
    if (drill) return drill;
    const name = itemName(event.rawPath, event.queryStringParameters ?? {});
    if (typeof name !== "string") return json(name.status, { code: name.code }, "max-age=300");
    try {
        const page = await readPage((store ??= dynamoStore(process.env.TABLE_NAME ?? "graphty-health")), name);
        if (!page) return json(503, { code: "no_data" }, "max-age=60");
        const gzip = /\bgzip\b/.test(event.headers?.["accept-encoding"] ?? "");
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
                "cache-control": "public, max-age=60",
                "last-modified": new Date(page.at).toUTCString(),
                vary: "accept-encoding",
                ...(gzip ? { "content-encoding": "gzip" } : {}),
            },
            body: gzip ? page.gz.toString("base64") : unzip(page.gz),
            isBase64Encoded: gzip,
        };
    } catch (error) {
        console.error(JSON.stringify({ route: event.rawPath, error: String(error) }));
        return json(503, { code: "no_data" }, "no-store");
    }
}

/** GET /v1/run/<id> and /v1/test-history, read from their index items; undefined for every other route. */
async function drillDown(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2 | undefined> {
    const run = /^\/v1\/run\/(\d+)$/.exec(event.rawPath);
    if (!run && event.rawPath !== "/v1/test-history") return undefined;
    const q = event.queryStringParameters ?? {};
    const range = q.range ?? "7d";
    if (!run && !q.file) return json(400, { code: "missing_file" }, "max-age=300");
    if (!run && range !== "7d" && range !== "28d") return json(400, { code: "bad_range" }, "max-age=300");
    try {
        const db = (store ??= dynamoStore(process.env.TABLE_NAME ?? "graphty-health"));
        const body = run
            ? await runDrill(db, Number(run[1]), Date.now())
            : await testHistory(db, { file: q.file!, test: q.test, range: range as "7d" | "28d" }, Date.now());
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
