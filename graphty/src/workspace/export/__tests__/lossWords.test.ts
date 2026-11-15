import type { ExportLoss } from "@graphty/graphty-element";
import type { FormatDescriptor } from "@graphty/graphty-element/catalog";
import { EXPORT_LOSS_CODES, EXPORT_STYLE_LOSS_CODES } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    isLabeled,
    isStyleLoss,
    layersBackWords,
    listedStyleLosses,
    lossRow,
    lossRows,
    lossSummary,
} from "../lossWords";

/**
 * A loss as the element reports one.
 * @param code - its code.
 * @param columns - the columns it is about.
 * @param count - how many are affected.
 * @returns the loss.
 */
function loss(
    code: string,
    columns: string[] = [],
    count: number | null = null,
    extra: Readonly<Record<string, string>> = {},
): ExportLoss {
    return { code, params: { columns, count, ...extra } };
}

/**
 * A format that writes styles one way.
 * @param write - what its writer keeps.
 * @returns the descriptor, as much of it as the words read.
 */
function writing(write: "rules" | "values" | "none"): FormatDescriptor {
    return { styles: { read: true, write } } as FormatDescriptor;
}

/**
 * The labels of the rows of some losses.
 * @param losses - the losses.
 * @returns each row's label.
 */
function whats(losses: readonly ExportLoss[]): string[] {
    return lossRows(losses).map((row) => row.what);
}

describe("lossRows", () => {
    it("labels every code a built-in writer reports, or keeps it off the list on purpose", () => {
        const codes = new Set<string>(EXPORT_LOSS_CODES);
        assert.isAbove(codes.size, 100);
        for (const code of EXPORT_STYLE_LOSS_CODES) {
            assert.isTrue(codes.has(code), code);
        }
        assert.deepEqual(
            [...codes].filter((code) => !isLabeled(code)),
            [],
            "codes with no label: add one to LABELS, or to NOT_SHOWN when nothing is lost",
        );
    });

    it("is one compact row per loss: a label, the columns, and the count as a node or edge", () => {
        assert.deepEqual(lossRow(loss("W_GRAPH_ATTRIBUTES_DROPPED", ["title", "year"], 2)), {
            what: "Graph attributes not written",
            columns: ["title", "year"],
            count: 2,
            kind: null,
            style: false,
        });
        assert.deepEqual(lossRow(loss("W_CSV_DIRECTION_DROPPED", [], 254)), {
            what: "Undirected edges read back as directed",
            columns: [],
            count: 254,
            kind: "edge",
            style: false,
        });
        assert.deepEqual(lossRow(loss("W_SOMETHING_NEW", ["tags"], 4))?.what, "Not kept");
    });

    it("shows no row for a loss of nothing, or for a change a reader cannot see", () => {
        assert.isNull(lossRow(loss("W_STYLE_NOT_WRITTEN", [], 0, { target: "node", property: "opacity" })));
        assert.isNull(lossRow(loss("W_STORAGE_CLASS_CHANGED", ["kind"], null)));
        assert.lengthOf(lossRows([loss("W_STORAGE_CLASS_CHANGED", ["kind"]), loss("W_INTEGRAL_F64_AS_I32", ["n"])]), 0);
    });

    it("gathers repeats of one label into one row of columns", () => {
        const rows = lossRows([
            loss("W_VIZ_DROPPED", ["style.color"], 77),
            loss("W_VIZ_DROPPED", ["style.size"], 77),
            loss("W_VIZ_DROPPED", ["style.color"], 254),
        ]);
        assert.lengthOf(rows, 1);
        assert.deepEqual(rows[0].columns, ["style.color", "style.size"]);
        assert.strictEqual(rows[0].count, 254);
    });

    it("says what a file loses in one line: each loss, the style losses as one count, the rest as more", () => {
        const fill = loss("W_STYLE_NOT_WRITTEN", [], 8, { target: "node", property: "fill" });
        const size = loss("W_STYLE_NOT_WRITTEN", [], 8, { target: "node", property: "size" });
        assert.strictEqual(
            lossSummary(lossRows([loss("W_POSITIONS_DROPPED", [], 9), fill, size])),
            "positions not written, 2 style settings",
        );
        assert.strictEqual(lossSummary(lossRows([fill])), "node fill color not written");
        assert.strictEqual(
            lossSummary(lossRows([loss("W_COLUMN_DROPPED", ["a", "b"]), loss("W_POSITIONS_DROPPED", [], 9)])),
            "not written: 2 columns, positions not written",
        );
        assert.strictEqual(
            lossSummary(
                lossRows([
                    loss("W_POSITIONS_DROPPED", [], 9),
                    loss("W_MULTI_EDGES", [], 2),
                    loss("W_SELF_LOOPS", [], 1),
                    fill,
                    size,
                ]),
            ),
            "positions not written, parallel edges dropped, 2 more",
        );
    });

    it("words every style code an export reports, from the element's own list", () => {
        assert.isAbove(EXPORT_STYLE_LOSS_CODES.length, 5);
        for (const code of EXPORT_STYLE_LOSS_CODES) {
            const row = lossRow(
                loss(code, [], 8, { target: "node", property: "borderColor", layer: "ramp", reason: "SCALE" }),
            );
            assert.notStrictEqual(row?.what, "Not kept", code);
            assert.isTrue(isStyleLoss(loss(code)), code);
        }
        assert.isFalse(isStyleLoss(loss("W_VIZ_DROPPED")));
    });

    it("names the property lost, the layer written as its values, and counts the nodes or edges", () => {
        assert.deepEqual(lossRow(loss("W_STYLE_NOT_WRITTEN", [], 8, { target: "node", property: "fill" })), {
            what: "Node fill color not written",
            columns: [],
            count: 8,
            kind: "node",
            style: true,
        });
        assert.deepEqual(
            whats([
                loss("W_STYLE_APPROXIMATED", [], 1, {
                    target: "edge",
                    property: "graphty:arrowHead",
                    channel: "arrowHead",
                }),
                loss("W_STYLE_LAYER_FLATTENED", [], 8, {
                    target: "node",
                    property: "fill",
                    layer: "ramp",
                    reason: "SCALE",
                }),
                loss("W_STYLE_NOT_WRITTEN", [], 8, {
                    target: "node",
                    property: "graphty:node.shape",
                    channel: "node.shape",
                }),
                loss("W_STYLES_NOT_EXPORTED", [], 2),
            ]),
            [
                "Edge arrow head approximated",
                '"ramp" written as node fill color: palette not kept',
                "Node shape not written",
                "Style layers not written",
            ],
        );
    });

    it("lists no rules kept as values where the format writes no styles at all", () => {
        const losses = [loss("W_STYLE_NOT_WRITTEN"), loss("W_STYLE_RULES_NOT_KEPT")];
        assert.deepEqual(
            listedStyleLosses(writing("none"), losses).map((l) => l.code),
            ["W_STYLE_NOT_WRITTEN"],
        );
        assert.lengthOf(listedStyleLosses(writing("values"), losses), 2);
    });

    it("says whether the layers come back as layers", () => {
        assert.strictEqual(layersBackWords(writing("none"), []), "Reopened: no styles");
        assert.strictEqual(layersBackWords(undefined, []), "Reopened: no styles");
        assert.strictEqual(layersBackWords(writing("values"), []), "Reopened: colors and sizes, no layers");
        assert.strictEqual(
            layersBackWords(writing("rules"), [loss("W_STYLE_RULES_NOT_KEPT")]),
            "Reopened: colors and sizes, no layers",
        );
        assert.strictEqual(layersBackWords(writing("rules"), []), "Reopened: layers as layers");
        assert.strictEqual(
            layersBackWords(writing("rules"), [loss("W_STYLE_LAYER_FLATTENED")]),
            "Reopened: other layers as layers",
        );
    });
});
