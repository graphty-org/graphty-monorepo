/**
 * @file The quick start of the "Finding" guide (`docs/guide/find.md`), kept here so the documented
 * code keeps working: the guide's code on a standalone session, its comments turned into
 * assertions. The guide reaches the same session as `element.session`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("the finding guide's example", () => {
    it("lists hits without selecting, then selects a pick and a value row", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "n1", name: "Valjean", group: 2 },
            { id: "n2", name: "Javert", group: 2 },
            { id: "n3", name: "Fantine", group: 3 },
        ]);
        // Name nodes by their "name" attribute rather than their id
        await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });

        const found = session.data.find("val", { limit: 10 });
        assert.deepEqual(found.elements, [
            { kind: "node", id: "n1", label: "Valjean", matched: { path: "data.name", value: "Valjean" } },
        ]);
        assert.strictEqual(found.total, 1);
        assert.lengthOf(session.selection.nodes, 0, "finding selected nothing");

        // The reader picks a hit: select it
        const [hit] = found.elements;
        await session.selection.apply(hit.kind === "node" ? { nodes: [hit.id] } : { edges: [hit.id] });
        assert.deepEqual(session.selection.nodes, ["n1"]);

        // Or a value row, "group is 2 (2 nodes)": select every node carrying it
        const [row] = session.data.find("2", { kinds: ["value"] }).values;
        assert.strictEqual(row.count, 2);
        await session.selection.apply({ where: row.where });
        assert.deepEqual(session.selection.nodes, ["n1", "n2"]);
        session.dispose();
    });
});
