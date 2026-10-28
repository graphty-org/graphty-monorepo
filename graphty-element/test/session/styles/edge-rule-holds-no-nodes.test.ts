/**
 * @file A rule about an edge value with `nodes: "none"`: on a row that paints nodes and edges, it
 * paints the passing edges and no node, where `"all"` keeps every node and `"ends"` their ends.
 */

import { assert, describe, it } from "vitest";

import type { AttributeLeafNodes } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session";

describe("an edge rule's nodes reading on a row of both kinds", () => {
    for (const [nodes, expected] of [
        ["none", 0],
        ["ends", 2],
        ["all", 4],
    ] as const satisfies readonly (readonly [AttributeLeafNodes, number])[]) {
        it(`"${nodes}" paints ${String(expected)} of the 4 nodes beside the one heavy edge`, async () => {
            const session = createGraphSession();
            await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
            await session.data.addEdges([
                { source: "a", target: "b", weight: 5 },
                { source: "c", target: "d", weight: 1 },
            ]);
            const row = await session.styles.addRow({
                name: "Heavy",
                target: "both",
                selector: {
                    match: "rule",
                    where: { kind: "range", attribute: "data.weight", min: 3, nodes },
                },
                set: { color: "#ff0000" },
            });

            assert.strictEqual(session.styles.counts(row.edge ?? "").matched, 1, "one edge passes");
            assert.strictEqual(session.styles.counts(row.node ?? "").matched, expected);
            session.dispose();
        });
    }
});
