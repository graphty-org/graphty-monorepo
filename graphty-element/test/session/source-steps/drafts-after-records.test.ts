/**
 * @file A source draft's After draws the graph its commit lands, record for record (design 5.3):
 * every node and edge record read while After shows equals the one read after the commit, not only
 * the counts.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession, SourceDraft } from "../../../src/session";
import { ACCOUNTS, BANK_B, phase2, phase6 } from "./scenario";

/**
 * Every node and edge record, sorted, as text: what a table or an inspector reads.
 * @param session - The session.
 * @returns The records.
 */
function records(session: GraphSession): { nodes: string[]; edges: string[] } {
    const text = (r: unknown): string => JSON.stringify(r, Object.keys(r as object).sort());
    return {
        nodes: session.data
            .nodes()
            .map((n) => text(n))
            .sort(),
        edges: session.data
            .edges()
            // An edge's element-assigned id is not compared: what it holds is.
            .map(({ id: _id, ...e }) => text(e))
            .sort(),
    };
}

/**
 * Draw After, read the records, commit, and check the commit landed what After showed.
 * @param session - The session.
 * @param d - The draft.
 */
async function afterIsCommit(session: GraphSession, d: SourceDraft): Promise<void> {
    await d.display(true);
    await session.styles.settled();
    const shown = records(session);
    await d.commit();
    assert.deepStrictEqual(shown, records(session), "After shows the records the commit lands");
}

describe("source-steps drafts: After's records are the commit's", () => {
    it("a merge with an excluded key", async () => {
        const { session, t } = await phase2();
        await session.data.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: t });
        const a = await session.data.stage(
            { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
            { key: "account_id", type: "account" },
        );
        const before = records(session);
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const merge = d.preview().steps.find((s) => s.op === "join.merge");
        assert.isDefined(merge);
        d.exclude(merge.index, ["A-2"]);
        await d.display(true);
        await d.display(false);
        assert.deepStrictEqual(records(session), before, "Before puts every record back");
        await afterIsCommit(session, d);
    });

    it("an added edge file on the committed edges' end columns", async () => {
        const { session } = await phase6();
        const d = session.data.draft();
        const b = await d.stage(
            { type: "csv", config: { data: BANK_B }, name: "bankB.csv" },
            {
                edges: {
                    from: { column: "account_id", space: "account" },
                    to: { column: "merchant_id", space: "merchant" },
                    id: "txn_id",
                },
            },
        );
        d.add(b);
        await afterIsCommit(session, d);
    });
});
