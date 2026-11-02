/**
 * The `query-api` transport (design section 12.2): Neo4j's `POST /db/{database}/query/v2`, on by
 * default since Neo4j 5.26 and on Aura, with no driver. It asks for typed JSON, so integers keep
 * every digit, and sends `accessMode: "Read"`, which the server enforces. CORS is open by default,
 * so it works from a page on https.
 */

import { originOf } from "../../credentials.js";
import { failOn } from "../../fail.js";
import { type QueryResult } from "../flatten.js";
import { type CypherProfile, neo4jProfile } from "../profiles.js";
import { fromTypedJson } from "../types-map.js";
import { parseJson, serverError, type Transport, type TransportInput } from "./transport.js";

/** The media type of Neo4j's typed JSON. */
const TYPED_JSON = "application/vnd.neo4j.query.v1.1";

/** The statuses whose JSON body says what went wrong. */
const ERROR_STATUSES = [400, 404, 500];

/** The shape of a Query API answer. */
interface QueryApiBody {
    readonly data?: { readonly fields: readonly string[]; readonly values: readonly (readonly unknown[])[] };
    readonly errors?: readonly { readonly code?: string; readonly message?: string }[];
}

/**
 * Make the transport.
 * @param input - the context, params and mapper
 * @returns the transport
 */
export function queryApiTransport(input: TransportInput): Transport {
    const { ctx, params, m } = input;
    const database = params.database ?? "neo4j";
    const path = `db/${encodeURIComponent(database)}/query/v2`;
    const origin = ctx.endpoint === null ? "" : originOf(ctx.endpoint);

    const run = async (statement: string, parameters: Readonly<Record<string, unknown>>): Promise<QueryResult> => {
        const response = await ctx.fetch(path, {
            method: "POST",
            idempotent: true,
            allowStatus: ERROR_STATUSES,
            headers: { "Content-Type": "application/json", Accept: TYPED_JSON },
            body: JSON.stringify({ statement, parameters, accessMode: "Read" }),
        });
        const body = parseJson(await response.text()) as QueryApiBody | null;
        const first = body?.errors?.[0];
        if (first !== undefined) {
            serverError(
                ctx.report,
                {
                    code: first.code ?? null,
                    message: first.message ?? "",
                    status: response.status,
                    showable: response.status >= 400 && response.status < 500,
                },
                origin,
                params.database,
            );
        }
        if (response.status === 404) {
            // no Query API here: a Neo4j before 5.26 answers 404, and speaks only Bolt
            failOn(ctx.report, "E_SOURCE_NOT_FOUND", `${origin} has no Query API at ${path}`, {
                origin,
                what: "url",
                value: `${origin}/${path}`,
            });
        }
        if (!response.ok) {
            failOn(ctx.report, "E_FETCH", `${origin} answered ${String(response.status)}`, {
                url: `${origin}/${path}`,
                status: response.status,
            });
        }
        if (body?.data === undefined) {
            failOn(ctx.report, "E_SOURCE_RESPONSE", "the Query API answer has no data", {
                origin,
                expected: "json",
                contentType: response.headers.get("content-type"),
            });
        }
        const { fields, values } = body.data;
        return { fields, rows: values.map((row) => row.map((v, i) => fromTypedJson(v, fields[i] ?? "", m))) };
    };

    return {
        run,
        // the Query API exists from Neo4j 5.26, so ids are elementId()
        profile: () => Promise.resolve(neo4jProfile(null)),
        probe: async (): Promise<CypherProfile> => {
            const res = await run(
                "CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition",
                {},
            );
            const kernel = res.rows.find((r) => r[0] === "Neo4j Kernel") ?? res.rows[0];
            const versions = kernel?.[1];
            const version = Array.isArray(versions) && typeof versions[0] === "string" ? versions[0] : null;
            return neo4jProfile(version);
        },
        close: () => Promise.resolve(),
    };
}
