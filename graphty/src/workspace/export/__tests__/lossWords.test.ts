import type { FormatDescriptor } from "@graphty/graphty-element/catalog";
import { EXPORT_STYLE_LOSS_CODES } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { isStyleLoss, layersBackWords, listedStyleLosses, type LossFacts, lossLines } from "../lossWords";

const unnamed = (): null => null;

/**
 * A style loss as the Export dialog keeps one.
 * @param code - its code.
 * @param count - how many are affected.
 * @param extra - its other params.
 * @returns the loss's facts.
 */
function styleLoss(code: string, count: number | null = null, extra: Readonly<Record<string, string>> = {}): LossFacts {
    return { code, column: null, count, params: { count, ...extra } };
}

/**
 * The one line a style loss reads as.
 * @param loss - the loss.
 * @returns its line.
 */
function said(loss: LossFacts): string {
    return lossLines([loss], unnamed)[0];
}

/**
 * A format that writes styles one way.
 * @param write - what its writer keeps.
 * @returns the descriptor, as much of it as the words read.
 */
function writing(write: "rules" | "values" | "none"): FormatDescriptor {
    return { styles: { read: true, write } } as FormatDescriptor;
}

describe("lossLines", () => {
    it("words each code from its column and count, never from the element's English", () => {
        assert.deepEqual(
            lossLines(
                [
                    { code: "W_SELF_LOOPS", column: null, count: 1 },
                    { code: "W_COLUMN_DROPPED", column: "tags", count: null },
                ],
                (column) => `the "${column}" column`,
            ),
            ["Edges from a node to itself will not come back.", 'This format has no place for the "tags" column.'],
        );
    });

    it("gives a code it has no words for a plain sentence, and says a repeated sentence once", () => {
        const lines = lossLines(
            [
                { code: "W_SOMETHING_NEW", column: null, count: 4 },
                { code: "W_SOMETHING_NEW", column: "tags", count: 4 },
            ],
            unnamed,
        );
        assert.deepEqual(lines, [
            "Part of this graph will not come back exactly as it is when this file is opened again.",
        ]);
    });

    it("words every style code an export reports, from the element's own list", () => {
        const generic = /^Part of this graph /;
        assert.isAbove(EXPORT_STYLE_LOSS_CODES.length, 5);
        for (const code of EXPORT_STYLE_LOSS_CODES) {
            const line = said(
                styleLoss(code, 8, { target: "node", property: "borderColor", layer: "ramp", reason: "SCALE" }),
            );
            assert.notMatch(line, generic, code);
            assert.isTrue(isStyleLoss({ code }), code);
        }
        assert.isFalse(isStyleLoss({ code: "W_VIZ_DROPPED" }));
    });

    it("names the property lost, on how many elements, and the layer written as its values", () => {
        assert.strictEqual(
            said(styleLoss("W_STYLE_NOT_WRITTEN", 8, { target: "node", property: "fill" })),
            "Node fill color on 8 nodes is not written.",
        );
        assert.strictEqual(
            said(
                styleLoss("W_STYLE_APPROXIMATED", 1, {
                    target: "edge",
                    property: "graphty:arrowHead",
                    channel: "arrowHead",
                }),
            ),
            "Edge arrow head on 1 edge is written as the nearest value this format allows.",
        );
        assert.strictEqual(
            said(
                styleLoss("W_STYLE_LAYER_FLATTENED", 8, {
                    target: "node",
                    property: "fill",
                    layer: "ramp",
                    reason: "SCALE",
                }),
            ),
            'The layer "ramp" is written as the node fill color it paints on 8 nodes, not as a layer: this format cannot hold its palette or scale.',
        );
        assert.strictEqual(
            said(
                styleLoss("W_STYLE_NOT_WRITTEN", 8, {
                    target: "node",
                    property: "graphty:node.shape",
                    channel: "node.shape",
                }),
            ),
            "Node shape on 8 nodes is not written.",
        );
        assert.strictEqual(said(styleLoss("W_STYLES_NOT_EXPORTED", 2)), "2 style layers are not written.");
    });

    it("lists no rules kept as values where the format writes no styles at all", () => {
        const losses = [styleLoss("W_STYLE_NOT_WRITTEN"), styleLoss("W_STYLE_RULES_NOT_KEPT")];
        assert.deepEqual(
            listedStyleLosses(writing("none"), losses).map((l) => l.code),
            ["W_STYLE_NOT_WRITTEN"],
        );
        assert.lengthOf(listedStyleLosses(writing("values"), losses), 2);
    });

    it("says whether the layers come back as layers", () => {
        assert.match(layersBackWords(writing("none"), []), /none of the styles/);
        assert.match(layersBackWords(undefined, []), /none of the styles/);
        assert.match(layersBackWords(writing("values"), []), /but not the style layers/);
        assert.match(
            layersBackWords(writing("rules"), [styleLoss("W_STYLE_RULES_NOT_KEPT")]),
            /but not the style layers/,
        );
        assert.match(layersBackWords(writing("rules"), []), /rebuilds the style layers as layers/);
        assert.match(
            layersBackWords(writing("rules"), [styleLoss("W_STYLE_LAYER_FLATTENED")]),
            /the other style layers/,
        );
    });
});
