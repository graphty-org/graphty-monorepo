/**
 * @file A layer's counts read before any pass has prepared it (issue #9218). An edge layer is first
 * prepared by the pass that paints the first edges, and that pass can end after every event a
 * panel reads on: a read in between answers "painted on 0", and the kept answer must not outlive
 * the pass that prepares the layer.
 */

import { assert, describe, it } from "vitest";

import type { Channel } from "../../../src/catalog/types";
import { prepareBinding, type PreparedBinding } from "../../../src/session/styles/encoding";
import { type CompiledLayer, createStylesApi } from "../../../src/session/styles/index";
import { createScaleRegistry } from "../../../src/session/styles/scales";

const SCALES = createScaleRegistry();

describe("styles.counts read before the pass that first prepares its layer", () => {
    it("reads again once that pass has prepared the layer", async () => {
        // What a repaint engine answers: nothing for a layer no pass has prepared yet.
        const prepared = new Set<CompiledLayer>();
        let revision = 0;
        const encoding = (entry: CompiledLayer): readonly PreparedBinding[] =>
            prepared.has(entry)
                ? Object.entries(entry.layer.set ?? {}).map(([name, value]) =>
                      prepareBinding({ channel: name as Channel, binding: { value }, scales: SCALES }),
                  )
                : [];
        const styles = createStylesApi({
            elements: {
                nodeValue: () => undefined,
                edgeValue: () => undefined,
                nodeIdOf: (index) => `n${String(index)}`,
                edgeIdOf: (index) => `e${String(index)}`,
            },
            nodeIndex: () => undefined,
            edgeIndex: (id) => Number(id.slice(1)),
            resolveScope: () => ({
                nodes: new Set(),
                edges: new Set(["e0", "e1"]),
                nodeCount: 0,
                edgeCount: 2,
                digest: "",
                spec: "graph",
                resolvedAt: "",
            }),
            encoding,
            encodingRevision: () => revision,
            stateRevision: () => 0,
            inputRevision: () => 0,
        });
        const layer = await styles.add({
            name: "Edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#ff0000" },
        });

        const early = styles.counts(layer.id);
        assert.strictEqual(early.matched, 2);
        assert.strictEqual(early.painted["edge.color"], 0, "no pass has prepared the layer");

        // The pass that paints the edges prepares the layer, and nothing else moves.
        for (const entry of styles.compiled()) {
            prepared.add(entry);
        }
        revision++;

        assert.strictEqual(styles.counts(layer.id).painted["edge.color"], 2);
    });
});
