/**
 * The `neptune-analytics` transport (design section 12.4): `POST /queries` on the graph's host
 * (`<graph-id>.<region>.neptune-graph.amazonaws.com`), JSON `{ query, language: "OPEN_CYPHER",
 * parameters }`, always signed with `credentials.awsSigV4` for the service "neptune-graph".
 * Results share Neptune Database's `~id` shape. Node only until CORS on a graph host is shown to
 * work: a browser is refused before any request (E_SOURCE_RUNTIME, reason "cors").
 */

import { type QueryResult } from "../flatten.js";
import { neptuneProfile } from "../profiles.js";
import { neptuneResult, nodeOnly } from "./neptune-https.js";
import { type Transport, type TransportInput } from "./transport.js";

/**
 * Make the transport.
 * @param input - the context, params and mapper
 * @returns the transport
 */
export function neptuneAnalyticsTransport(input: TransportInput): Transport {
    const { ctx } = input;
    nodeOnly(ctx, "neptune-analytics");
    const run = async (statement: string, parameters: Readonly<Record<string, unknown>>): Promise<QueryResult> => {
        const response = await ctx.fetch("queries", {
            method: "POST",
            idempotent: true,
            allowStatus: [400, 500],
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: statement, language: "OPEN_CYPHER", parameters }),
        });
        return neptuneResult(input, response);
    };
    return {
        run,
        profile: () => Promise.resolve(neptuneProfile()),
        probe: async () => {
            await run("RETURN 1 AS ok", {});
            return neptuneProfile();
        },
        close: () => Promise.resolve(),
    };
}
