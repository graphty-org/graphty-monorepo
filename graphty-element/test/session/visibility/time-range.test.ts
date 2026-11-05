/**
 * A `range` leaf with `as: "time"` compares instants: min and max are epoch milliseconds, and each
 * value is read the way the session's time parser reads it. Without it a range reads numbers, so a
 * column of dates passes none.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type RuleTree } from "../../../session";

const GAUGES = [
    { id: "g1", installed: "1998-05-12" },
    { id: "g2", installed: "2003-07-01" },
    { id: "g3", installed: "2004-12-31" },
    { id: "g4", installed: "2005-01-01" },
    { id: "g5", installed: "2010-09-09" },
    { id: "g6" },
];
const BEFORE_2005: Extract<RuleTree, { kind: "range" }> = {
    kind: "range",
    attribute: "data.installed",
    max: Date.UTC(2005, 0, 1) - 1,
    as: "time",
};

async function gauges(rows: readonly object[] = GAUGES): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(rows.map((row) => ({ ...row })));
    return session;
}

const kept = (session: GraphSession): string[] => [...session.visibility.nodes].map(String).sort();

describe('a range leaf read "as" time', () => {
    it("keeps the dates before a year in a column typed as dates", async () => {
        const session = await gauges();
        await session.data.setType({ kind: "node", name: "installed" }, "date");
        await session.visibility.setConditions([{ effect: "keep", rule: BEFORE_2005 }]);
        assert.deepStrictEqual(kept(session), ["g1", "g2", "g3"]);

        // Between two instants, both ends kept.
        await session.visibility.setConditions([
            {
                effect: "keep",
                rule: { ...BEFORE_2005, min: Date.UTC(2003, 6, 1), max: Date.UTC(2005, 0, 1) },
            },
        ]);
        assert.deepStrictEqual(kept(session), ["g2", "g3", "g4"]);
        session.dispose();
    });

    it("reads a designated time field by its own unit, so a column of years compares as years", async () => {
        const session = await gauges(
            GAUGES.map((row) =>
                row.installed === undefined ? row : { ...row, installed: Number(row.installed.slice(0, 4)) },
            ),
        );
        await session.time.setField({ nodes: { start: "installed" } });
        await session.visibility.setConditions([{ effect: "keep", rule: BEFORE_2005 }]);
        assert.deepStrictEqual(kept(session), ["g1", "g2", "g3"]);
        session.dispose();
    });

    it("selects by date in a Select condition and in a style layer's rule", async () => {
        const session = await gauges();
        await session.visibility.setConditions([{ effect: "select", rule: BEFORE_2005 }]);
        assert.deepStrictEqual(
            ["g1", "g2", "g3", "g4", "g5", "g6"].filter((id) => session.selection.has(id)),
            ["g1", "g2", "g3"],
        );
        const layer = await session.styles.add({
            name: "Before 2005",
            target: "node",
            selector: { match: "rule", where: BEFORE_2005 },
            set: { "node.color": "#ff0000" },
        });
        assert.strictEqual(session.styles.counts(layer.id).matched, 3);
        session.dispose();
    });

    it("without it, a range reads numbers and a date passes none", async () => {
        const session = await gauges();
        const { as: _as, ...numeric } = BEFORE_2005;
        await session.visibility.setConditions([{ effect: "keep", rule: numeric }]);
        assert.deepStrictEqual(kept(session), []);
        session.dispose();
    });

    it("refuses an as it does not know", async () => {
        const session = await gauges();
        const bad = { ...BEFORE_2005, as: "date" } as unknown as RuleTree;
        let refused = false;
        try {
            await session.visibility.setConditions([{ effect: "keep", rule: bad }]);
        } catch {
            refused = true;
        }
        assert.isTrue(refused);
        session.dispose();
    });
});
