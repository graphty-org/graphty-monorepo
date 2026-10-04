/**
 * The paint tree's rows from what the element reports: the order, the kinds, the counts it
 * publishes, the swatches the legend gives, and the eye's state. The session here is a small
 * stand-in holding only the reads `paintRows` makes; the real element is
 * `tasks.real-element.test.tsx`.
 */
import type { GraphSession, Layer, LegendBlock } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { findRow, paintRows } from "../rows";

/** A run as `runs.list()` hands it, with only the fields the rows read. */
interface RunStub {
    id: string;
    label: string;
    status: string;
    shape: string;
    partial?: boolean;
    error?: { message: string };
    record: { summary?: { measured?: number; groups?: { group: string | number; size: number; name?: string }[] } };
}

/**
 * A layer, bottom-first order being the caller's.
 * @param id - the layer id.
 * @param source - who put it there.
 * @param enabled - whether it paints.
 * @returns the layer.
 */
function layer(id: string, source: Layer["source"], enabled = true): Layer {
    return { id, name: id, kind: "encoding", source, locked: source.by === "element", enabled } as unknown as Layer;
}

/**
 * The stand-in session.
 * @param parts - the layers (bottom first), legend, runs, their bindings and the selection size.
 * @param parts.layers - the style stack, bottom first.
 * @param parts.legend - the legend blocks.
 * @param parts.runs - the runs, oldest first.
 * @param parts.selected - the selection's size.
 * @returns the session.
 */
function sessionOf(parts: {
    layers: Layer[];
    legend?: Partial<LegendBlock>[];
    runs: RunStub[];
    selected?: number;
}): GraphSession {
    return {
        styles: { list: () => parts.layers, legend: () => parts.legend ?? [] },
        runs: {
            list: () => parts.runs,
            bindings: (id: string) =>
                parts.layers.filter((l) => l.source.by === "run" && l.source.runId === id).map((l) => l.id),
        },
        selection: { size: parts.selected ?? 0 },
    } as unknown as GraphSession;
}

const BASE = [layer("node-defaults", { by: "element", reason: "default" })];
const runSource = (runId: string): Layer["source"] => ({ by: "run", runId, algorithm: runId, params: {} });

describe("paintRows", () => {
    it("draws Selection and Everything only for a graph with nothing run", () => {
        const rows = paintRows(sessionOf({ layers: BASE, runs: [] }));
        assert.deepEqual(
            rows.map((r) => [r.kind, r.name]),
            [
                ["selection", "Selection"],
                ["everything", "Everything"],
            ],
        );
        assert.isUndefined(rows[0].count, "an empty selection shows no count");
    });

    it("orders rows top first in paint order, with a run that has no layer yet on top", () => {
        const session = sessionOf({
            layers: [
                ...BASE,
                layer("pr-color", runSource("pagerank")),
                layer("mine", { by: "user" }),
                layer("deg-color", runSource("degree")),
            ],
            runs: [
                { id: "pagerank", label: "PageRank", status: "succeeded", shape: "node-metric", record: {} },
                { id: "degree", label: "Degree", status: "succeeded", shape: "node-metric", record: {} },
                { id: "louvain", label: "Louvain", status: "running", shape: "community", record: {} },
                { id: "old", label: "Old", status: "removed", shape: "node-metric", record: {} },
            ],
            selected: 3,
        });
        const rows = paintRows(session);
        assert.deepEqual(
            rows.map((r) => r.name),
            ["Selection", "Louvain", "Degree", "mine", "PageRank", "Everything"],
        );
        assert.equal(rows[0].count, 3);
        assert.equal(findRow(rows, "louvain")?.state, "running");
        assert.equal(findRow(rows, "mine")?.kind, "layer-row");
        assert.deepEqual(findRow(rows, "mine")?.layerIds, ["mine"]);
    });

    it("makes a measure row with the measured count, the legend's ramp and its layers for the eye", () => {
        const session = sessionOf({
            layers: [...BASE, layer("pr-color", runSource("pagerank"), false)],
            legend: [
                {
                    channel: "node.color",
                    runId: "pagerank",
                    swatches: [
                        { label: "low", value: 0, color: "#000000" },
                        { label: "high", value: 1, color: "#ffffff" },
                    ],
                },
            ],
            runs: [
                {
                    id: "pagerank",
                    label: "PageRank",
                    status: "succeeded",
                    shape: "node-metric",
                    record: { summary: { measured: 77 } },
                },
            ],
        });
        const row = findRow(paintRows(session), "pagerank");
        assert.equal(row?.kind, "measure-row");
        assert.equal(row?.count, 77);
        assert.deepEqual(row?.swatch, { ramp: ["#000000", "#ffffff"] });
        assert.deepEqual(row?.layerIds, ["pr-color"]);
        assert.isTrue(row?.hidden, "every layer of the run is off");
    });

    it("makes a group run with one child per group, sized and colored as the element reports", () => {
        const session = sessionOf({
            layers: [...BASE, layer("lv-color", runSource("louvain"))],
            legend: [
                {
                    channel: "node.color",
                    runId: "louvain",
                    swatches: [
                        { label: "Group 1", value: 0, color: "#ff0000" },
                        { label: "Group 2", value: 1, color: "#00ff00" },
                    ],
                },
            ],
            runs: [
                {
                    id: "louvain",
                    label: "Louvain",
                    status: "succeeded",
                    shape: "community",
                    record: {
                        summary: {
                            groups: [
                                { group: 0, size: 40, name: "Group 1" },
                                { group: 1, size: 37 },
                            ],
                        },
                    },
                },
            ],
        });
        const row = findRow(paintRows(session), "louvain");
        assert.equal(row?.kind, "run-row");
        assert.equal(row?.count, 2);
        assert.deepEqual(
            row?.children?.map((c) => [c.id, c.name, c.count, c.swatch, c.layerIds.length]),
            [
                ["louvain/0", "Group 1", 40, { color: "#ff0000" }, 0],
                ["louvain/1", "1", 37, { color: "#00ff00" }, 0],
            ],
        );
    });

    it("marks a failed run with the element's message and a partial one as partial", () => {
        const rows = paintRows(
            sessionOf({
                layers: BASE,
                runs: [
                    {
                        id: "a",
                        label: "A",
                        status: "failed",
                        shape: "node-metric",
                        error: { message: "No edges" },
                        record: {},
                    },
                    { id: "b", label: "B", status: "succeeded", shape: "node-metric", partial: true, record: {} },
                    { id: "c", label: "C", status: "canceled", shape: "node-metric", record: {} },
                ],
            }),
        );
        assert.equal(findRow(rows, "a")?.state, "failed");
        assert.equal(findRow(rows, "a")?.problem, "No edges");
        assert.equal(findRow(rows, "b")?.state, "partial");
        assert.equal(findRow(rows, "c")?.state, "canceled");
    });
});
