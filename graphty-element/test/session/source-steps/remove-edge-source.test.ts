/**
 * @file Removing an edge source under the source-steps experiment gives back the graph a session
 * that never loaded it holds: the same edges with the same columns, and the same saved graph and
 * graph source (design design/data/multiple-data-sources-design.md, section 3.2).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { edgeFile, full, MERCHANTS, phase6 } from "./scenario";

/**
 * The edges without their session ids, in a stable order.
 * @param session - The session.
 * @returns The edges as text.
 */
function edges(session: GraphSession): string[] {
    return session.data
        .edges()
        .map(({ id: _id, ...rest }) => JSON.stringify(rest))
        .sort();
}

/**
 * The first saved member.
 * @param session - The session.
 * @returns Its graph source and its graph's links without their source ids, sorted.
 */
async function saved(session: GraphSession): Promise<{ source: unknown; edges: string[] }> {
    const member = (JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] })
        .members[0];
    const graph = member.graph as { links?: Record<string, unknown>[] } | undefined;
    return {
        source: member.source,
        edges: (graph?.links ?? []).map(({ id: _id, "_source.loads": _loads, ...rest }) => JSON.stringify(rest)).sort(),
    };
}

/**
 * A CSV edge file read with its own end columns.
 * @param session - The session.
 * @param data - The CSV.
 * @param name - Its name.
 * @param ends - Its end columns.
 * @param mode - `"merge"` to add it beside what is loaded.
 * @returns The source's id.
 */
async function load(
    session: GraphSession,
    data: string,
    name: string,
    ends: readonly [string, string],
    mode?: "merge",
): Promise<string> {
    await session.data.import(
        { type: "csv", config: { data }, name },
        { ...(mode === undefined ? {} : { mode }), edges: { from: { column: ends[0] }, to: { column: ends[1] } } },
    );
    return session.data.sources().at(-1)?.key ?? "";
}

describe("source-steps: removing an edge source", () => {
    it("a second edge file with other end columns, removed, leaves the first file's edges as they were", async () => {
        const T = "txn_id,account_id,merchant_id\nT-1,A-1,M-1";
        const never = createGraphSession({ features: ["source-steps"] });
        await load(never, T, "t.csv", ["account_id", "merchant_id"]);
        const session = createGraphSession({ features: ["source-steps"] });
        await load(session, T, "t.csv", ["account_id", "merchant_id"]);
        const b = await load(session, "a,b\nX,Y", "b.csv", ["a", "b"], "merge");
        await session.data.removeSource(b);
        assert.deepStrictEqual(edges(session), edges(never));
        assert.deepStrictEqual(await saved(session), await saved(never));
        never.dispose();
        session.dispose();
    });

    it("bank B removed gives back the edges and saved graph of a session that never loaded it", async () => {
        const never = (await phase6()).session;
        const m = await never.data.stage(
            { type: "csv", config: { data: MERCHANTS }, name: "merchants.csv" },
            { key: "merchant_id", type: "merchant" },
        );
        await never.data.merge({ from: { source: m, field: "merchant_id" }, into: { space: "merchant" } });
        const { session, b } = await full();
        await session.data.removeSource(b);
        assert.deepStrictEqual(edges(session), edges(never));
        assert.deepStrictEqual(await saved(session), await saved(never));
        never.dispose();
        session.dispose();
    });

    it("an edge file added after another, then removed, leaves the graph source on the file that stays", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await edgeFile(session, "txn_id,account_id,merchant_id\nT-1,A-1,M-1", "t.csv");
        const b = await edgeFile(session, "txn_id,account_id,merchant_id\nT-2,A-2,M-2", "b.csv", "merge");
        await session.data.removeSource(b);
        const member = (
            JSON.parse((await session.project.save()).text) as { members: { source?: { name?: string } }[] }
        ).members[0];
        assert.strictEqual(member.source?.name, "t.csv");
        session.dispose();
    });
});
