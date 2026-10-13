/**
 * @file "Select what it paints": the selection target `{ layer }` selects exactly the elements a
 * style layer's rule matches, and `styles.counts(id).paintedBy` names the layers painting over it.
 */

import { lesMiserables } from "@graphty/graph-samples/datasets/les-miserables";
import { assert, describe, it } from "vitest";

import type { Selector } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";

const ROUTE = ["Napoleon", "Myriel", "Valjean", "Fantine", "Tholomyes"];
const ON_ROUTE: Selector = { match: "member", of: { define: { kind: "path", nodes: ROUTE } } };

/**
 * A session holding Les Miserables.
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    const sample = lesMiserables();
    const ids = sample.ids ?? [];
    const session = createGraphSession();
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges([...sample.src].map((src, e) => ({ source: ids[src], target: ids[sample.dst[e]] })));
    return session;
}

describe("selecting what a style layer paints", () => {
    it("selects exactly the nodes of a node part and the edges of an edge part", async () => {
        const session = await lesMis();
        const row = await session.styles.addRow({
            name: "On route",
            target: "both",
            selector: ON_ROUTE,
            set: { color: "#ff0000" },
        });
        assert.isDefined(row.node);
        assert.isDefined(row.edge);

        await session.selection.apply({ layer: row.node ?? "" });
        assert.sameMembers([...session.selection.nodes], ROUTE);
        assert.strictEqual(session.selection.edges.length, 0);

        await session.selection.apply({ layer: row.edge ?? "" }, "add");
        assert.strictEqual(session.selection.edges.length, session.styles.counts(row.edge ?? "").matched);
        assert.strictEqual(session.selection.edges.length, 4);
        assert.sameMembers([...session.selection.nodes], ROUTE);
    });

    it("refuses a layer the stack does not hold", async () => {
        const session = await lesMis();
        let refusal: unknown;
        try {
            await session.selection.apply({ layer: "no-such-layer" });
        } catch (error) {
            refusal = error;
        }
        assert.isTrue(isGraphtyError(refusal) && refusal.code === "E_UNKNOWN_LAYER");
    });

    it("names the layer that paints over a layer, and nothing when it wins", async () => {
        const session = await lesMis();
        const below = await session.styles.add({
            name: "Below",
            target: "node",
            selector: ON_ROUTE,
            set: { "node.color": "#00ff00" },
        });
        const above = await session.styles.add({
            name: "Above",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#0000ff" },
        });

        assert.deepEqual(session.styles.counts(below.id).paintedBy, [above.id]);
        assert.deepEqual(session.styles.counts(above.id).paintedBy, []);
    });
});
