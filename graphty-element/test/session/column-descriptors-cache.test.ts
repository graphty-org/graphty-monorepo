/**
 * @file The column reads -- `data.attributes()`, `time.candidates()` and
 * `layout.locationColumns()` -- walk the graph's values once per change to the data, and never
 * again when only the view mask moves (issue #4386): a filter, a time window or a play frame moves
 * the session's input tick but no column, type or value.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/**
 * A session over nodes carrying a date, a latitude and longitude pair and a group number.
 * @param size - How many nodes.
 * @returns The session.
 */
async function sessionOf(size: number): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        Array.from({ length: size }, (_, i) => ({
            id: `n${String(i)}`,
            when: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
            latitude: (i % 170) - 85,
            longitude: (i % 350) - 175,
            group: i % 5,
        })),
    );

    return session;
}

/** Each column read, by name. */
const READS: Readonly<Record<string, (session: GraphSession) => unknown>> = {
    "data.attributes": (session) => session.data.attributes(),
    "time.candidates": (session) => session.time.candidates(),
    "layout.locationColumns": (session) => session.layout.locationColumns(),
};

describe("column reads are kept until the data changes", () => {
    for (const [name, read] of Object.entries(READS)) {
        it(`${name} does no recompute when only the view mask moves`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const session = await sessionOf(size);
                    const before = read(session);
                    await session.visibility.set({ kind: "range", attribute: "data.group", min: 2 });
                    let after: unknown;
                    const visits = await visitsDuring(() => {
                        after = read(session);
                    });
                    // The same answer back: nothing was recomputed.
                    assert.strictEqual(after, before);
                    session.dispose();
                    return visits;
                },
                { sizes: [200, 800], growth: "constant", counter: `elements visited by ${name} after a mask change` },
            );
        });

        it(`${name} recomputes once after a data change`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const session = await sessionOf(size);
                    const before = read(session);
                    await session.data.updateNodes([{ id: "n0", values: { group: 4 } }]);
                    let after: unknown;
                    const visits = await visitsDuring(() => {
                        after = read(session);
                    });
                    // Recomputed once, then kept.
                    assert.notStrictEqual(after, before);
                    assert.strictEqual(read(session), after);
                    session.dispose();
                    return visits;
                },
                { sizes: [200, 800], growth: "linear", counter: `elements visited by ${name} after a data change` },
            );
        });
    }

    it("sees an edited value", async () => {
        const session = await sessionOf(20);
        assert.strictEqual(session.time.candidates()[0]?.column, "when");
        await session.data.updateNodes(
            Array.from({ length: 20 }, (_, i) => ({
                id: `n${String(i)}`,
                values: { when: `not a date ${String(i)}` },
            })),
        );
        assert.isUndefined(session.time.candidates().find((each) => each.column === "when"));
        assert.strictEqual(
            session.data.attributes().find((each) => each.kind === "node" && each.name === "when")?.type,
            "string",
        );
        session.dispose();
    });
});
