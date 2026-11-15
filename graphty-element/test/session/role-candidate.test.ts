/**
 * @file `data.roleCandidate`: the column the element would read a role from, when one is obvious.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * A session holding one CSV of edges.
 * @param csv - the rows
 * @returns the session
 */
async function edges(csv: string): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "csv", config: { data: csv } });
    return session;
}

describe("data.roleCandidate", () => {
    it("names the edge column whose values read as time, most read first", async () => {
        const session = await edges("source,target,note,sent\nA,B,x,2026-01-01\nB,C,y,2026-01-02\n");
        assert.strictEqual(session.data.roleCandidate("edge", "time"), "sent");
        assert.isNull(session.data.roleCandidate("node", "time"));
        session.dispose();
    });

    it("names a weight only when it is unambiguous", async () => {
        /**
         * A session whose edge columns play no role.
         * @param csv - the rows
         * @param columns - the columns to free
         * @returns the session
         */
        const free = async (csv: string, columns: readonly string[]): Promise<GraphSession> => {
            const session = await edges(csv);
            for (const name of columns) {
                await session.data.setRole({ kind: "edge", name }, null);
            }
            return session;
        };
        const one = await free("source,target,amount\nA,B,1\nB,C,2\n", ["amount"]);
        assert.strictEqual(one.data.roleCandidate("edge", "weight"), "amount", "the only number column");
        await one.data.setRole({ kind: "edge", name: "amount" }, "weight");
        assert.isNull(one.data.roleCandidate("edge", "weight"), "a column with a role is not offered");
        one.dispose();

        const two = await free("source,target,cost,hops\nA,B,1,4\nB,C,2,5\n", ["cost", "hops"]);
        assert.isNull(two.data.roleCandidate("edge", "weight"), "two plain number columns: none is obvious");
        two.dispose();

        const named = await free("source,target,cost,score\nA,B,1,0.4\nB,C,2,0.5\n", ["cost", "score"]);
        assert.strictEqual(named.data.roleCandidate("edge", "weight"), "score", "a strength's name decides");
        named.dispose();
    });

    it("names the label column by its heading, and nothing once it is the label", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id,title,size\na,Alpha,1\nb,Beta,2\n" } });
        await session.data.setRole({ kind: "node", name: "title" }, null);
        assert.strictEqual(session.data.roleCandidate("node", "label"), "title");
        await session.data.setRole({ kind: "node", name: "title" }, "label");
        assert.isNull(session.data.roleCandidate("node", "label"));
        session.dispose();
    });

    it("answers null for a role it reads no candidates for", async () => {
        const session = await edges("source,target,sent\nA,B,2026-01-01\n");
        assert.isNull(session.data.roleCandidate("edge", "edgeId"));
        assert.isNull(session.data.roleCandidate("node", "city"));
        session.dispose();
    });
});
