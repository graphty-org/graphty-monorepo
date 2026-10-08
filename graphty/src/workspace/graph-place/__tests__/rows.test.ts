/**
 * The paint tree's rows from what the element reports: the order, the kinds, the counts it
 * publishes, the swatches the legend gives, and the eye's state. The session here is a small
 * stand-in holding only the reads `paintRows` makes; the real element is
 * `tasks.real-element.test.tsx`.
 */
import type { GraphSession, Layer, LegendBlock } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { findRow, isMovable, layerAbove, paintRows } from "../rows";

/** A run as `runs.list()` hands it, with only the fields the rows read. */
interface RunStub {
    id: string;
    label: string;
    status: string;
    shape: string;
    partial?: boolean;
    stale?: { reason: "data-changed" | "scope-changed" } | null;
    error?: { message: string };
    record: { summary?: { measured?: number; groups?: { group: string | number; size: number; rank?: number }[] } };
    result?: { graph: Record<string, unknown> };
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
            // A run is current (`stale: null`) unless the stub says otherwise.
            list: () => parts.runs.map((run) => ({ stale: null, ...run })),
            bindings: (id: string) =>
                parts.layers.filter((l) => l.source.by === "run" && l.source.runId === id).map((l) => l.id),
        },
        selection: { size: parts.selected ?? 0 },
        catalog: { algorithms: () => [] },
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
                ["selection-row", "Selection"],
                ["everything-row", "Everything"],
            ],
        );
        assert.isUndefined(rows[0].count, "an empty selection shows no count");
    });

    it("folds the reader's Everything layer into the Everything row, not a second row of that name", () => {
        const mine = {
            ...layer("everything-mine", { by: "user" }),
            name: "Everything",
            userData: { graphtyEverything: true },
        };
        const rows = paintRows(sessionOf({ layers: [...BASE, mine], runs: [] }));
        assert.deepEqual(
            rows.map((r) => [r.kind, r.name]),
            [
                ["selection-row", "Selection"],
                ["everything-row", "Everything"],
            ],
        );
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
                    channel: "node.size",
                    runId: "pagerank",
                    swatches: [{ label: "small", value: 0 }],
                },
                {
                    channel: "node.color",
                    runId: "pagerank",
                    palette: { name: "viridis", reversed: false },
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
                    palette: { name: "okabe-ito", reversed: false },
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
                    // The count is the one the run publishes, not the length of the bounded list.
                    result: { graph: { groupCount: 30 } },
                    record: {
                        summary: {
                            groups: [
                                { group: 0, size: 40, rank: 1 },
                                { group: 1, size: 37 },
                            ],
                        },
                    },
                },
            ],
        });
        const row = findRow(paintRows(session), "louvain");
        assert.equal(row?.kind, "run-row");
        assert.equal(row?.count, 30);
        assert.deepEqual(
            row?.children?.map((c) => [c.id, c.name, c.count, c.swatch, c.layerIds.length]),
            [
                ['["louvain",0]', "Group 1", 40, { color: "#ff0000" }, 0],
                ['["louvain",1]', "1", 37, { color: "#00ff00" }, 0],
            ],
        );
    });

    it("gives a group row an eye on its run's color binding, read from the stack while the legend lags", () => {
        const color = {
            ...layer("lv-color", runSource("louvain")),
            target: "node",
            encode: { "node.color": { by: "results.louvain.group", scale: "ordinal", hidden: [1] } },
        } as unknown as Layer;
        const session = sessionOf({
            layers: [...BASE, color],
            // No legend block: the element has not prepared the repainted binding yet.
            runs: [
                {
                    id: "louvain",
                    label: "Louvain",
                    status: "succeeded",
                    shape: "community",
                    record: {
                        summary: {
                            groups: [
                                { group: 0, size: 4 },
                                { group: "1", size: 3 },
                            ],
                        },
                    },
                },
            ],
        });
        const groups = findRow(paintRows(session), "louvain")?.children ?? [];
        assert.deepEqual(
            groups.map((g) => [g.value, g.hidden]),
            [
                [{ layerId: "lv-color", channel: "node.color", value: 0 }, false],
                [{ layerId: "lv-color", channel: "node.color", value: "1" }, true],
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

    it("marks a finished run the element calls out of date, with its reason", () => {
        const stale = { reason: "data-changed" as const };
        const rows = paintRows(
            sessionOf({
                layers: BASE,
                runs: [
                    { id: "a", label: "A", status: "succeeded", shape: "node-metric", stale, record: {} },
                    { id: "b", label: "B", status: "succeeded", shape: "node-metric", record: {} },
                ],
            }),
        );
        assert.equal(findRow(rows, "a")?.state, "stale");
        assert.equal(findRow(rows, "a")?.stale?.reason, "data-changed");
        assert.equal(findRow(rows, "b")?.state, "ready");
    });
});

describe("moving a row", () => {
    // Selection, Louvain (running, no layer), Degree (two layers), mine, PageRank, Everything.
    const rows = paintRows(
        sessionOf({
            layers: [
                ...BASE,
                layer("pr-color", runSource("pagerank")),
                layer("mine", { by: "user" }),
                layer("deg-size", runSource("degree")),
                layer("deg-color", runSource("degree")),
            ],
            runs: [
                { id: "pagerank", label: "PageRank", status: "succeeded", shape: "node-metric", record: {} },
                { id: "degree", label: "Degree", status: "succeeded", shape: "node-metric", record: {} },
                { id: "louvain", label: "Louvain", status: "running", shape: "community", record: {} },
            ],
        }),
    );

    it("moves only rows that paint, never Selection, Everything or a run with no layer", () => {
        assert.deepEqual(
            rows.filter(isMovable).map((r) => r.name),
            ["Degree", "mine", "PageRank"],
        );
    });

    it("puts a row below the bottom layer of the nearest painting row above the drop", () => {
        // PageRank dropped between Selection and Louvain: nothing above paints, so the top.
        assert.isNull(layerAbove(rows, "pagerank", null, 1));
        // Between Louvain and Degree: still nothing above paints.
        assert.isNull(layerAbove(rows, "pagerank", null, 2));
        // Between Degree and mine: below Degree's bottom layer.
        assert.equal(layerAbove(rows, "pagerank", null, 3), "deg-size");
        // Degree dropped between PageRank and Everything: below PageRank.
        assert.equal(layerAbove(rows, "degree", null, 4), "pr-color");
    });

    it("refuses a drop above Selection, below Everything or inside a row", () => {
        assert.isUndefined(layerAbove(rows, "pagerank", null, 0));
        assert.isUndefined(layerAbove(rows, "pagerank", null, 5));
        assert.isUndefined(layerAbove(rows, "pagerank", "degree", 0));
    });
});
