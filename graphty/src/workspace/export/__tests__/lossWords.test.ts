import type { ExportLoss } from "@graphty/graphty-element";
import type { FormatDescriptor } from "@graphty/graphty-element/catalog";
import { EXPORT_STYLE_LOSS_CODES } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { isStyleLoss, layersBackWords, lossWords } from "../lossWords";

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

describe("lossWords", () => {
    it("words each code from its columns and count, never from the element's English", () => {
        assert.strictEqual(
            lossWords(loss("W_GRAPH_ATTRIBUTES_DROPPED", ["title", "year"], 2)),
            'Graph attributes "title" and "year" are not kept',
        );
        assert.strictEqual(
            lossWords(loss("W_CSV_NODE_TABLE", ["tags", "meta", "score"], 3)),
            'Node columns "tags", "meta" and "score" are in the node table, not this one',
        );
        assert.strictEqual(lossWords(loss("W_SELF_LOOPS", [], 1)), "1 self-loop cannot be kept");
        assert.strictEqual(lossWords(loss("W_GRAPHTY_NOTES", [], 3)), "3 notes are not exported as notes");
    });

    it("gives a code it has no words for a plain sentence from its columns", () => {
        assert.strictEqual(lossWords(loss("W_SOMETHING_NEW", ["tags"], 4)), 'Part of "tags" is not kept');
        assert.strictEqual(lossWords(loss("W_SOMETHING_NEW")), "Part of the graph is not kept");
    });

    it("words every style code an export reports, from the element's own list", () => {
        const generic = /^Part of /;
        assert.isAbove(EXPORT_STYLE_LOSS_CODES.length, 5);
        for (const code of EXPORT_STYLE_LOSS_CODES) {
            const said = lossWords(
                loss(code, [], 8, { target: "node", property: "borderColor", layer: "ramp", reason: "SCALE" }),
            );
            assert.notMatch(said, generic, code);
            assert.isTrue(isStyleLoss(loss(code)), code);
        }
        assert.isFalse(isStyleLoss(loss("W_VIZ_DROPPED")));
    });

    it("names the property lost, on how many elements, and the layer written as its values", () => {
        assert.strictEqual(
            lossWords(loss("W_STYLE_NOT_WRITTEN", [], 8, { target: "node", property: "fill" })),
            "Node fill color on 8 nodes is not written",
        );
        assert.strictEqual(
            lossWords(loss("W_STYLE_APPROXIMATED", [], 1, { target: "edge", property: "graphty:arrowHead" })),
            "Edge arrow head on 1 edge is written as the nearest value this format allows",
        );
        assert.strictEqual(
            lossWords(
                loss("W_STYLE_LAYER_FLATTENED", [], 8, {
                    target: "node",
                    property: "fill",
                    layer: "ramp",
                    reason: "SCALE",
                }),
            ),
            'The layer "ramp" is written as the node fill color it paints on 8 nodes, not as a layer: this format cannot hold its palette or scale',
        );
        assert.strictEqual(lossWords(loss("W_STYLES_NOT_EXPORTED", [], 2)), "2 style layers are not written");
        assert.strictEqual(
            lossWords(loss("W_GRAPHTY_COLUMN_DROPPED", ["graphty.x"], 1)),
            '"graphty.x" is the app\'s own and is not written',
        );
    });

    it("says whether the layers come back as layers", () => {
        assert.match(layersBackWords(writing("none"), []), /none of the styles/);
        assert.match(layersBackWords(undefined, []), /none of the styles/);
        assert.match(layersBackWords(writing("values"), []), /but not the style layers/);
        assert.match(layersBackWords(writing("rules"), [loss("W_STYLE_RULES_NOT_KEPT")]), /but not the style layers/);
        assert.match(layersBackWords(writing("rules"), []), /rebuilds the style layers as layers/);
        assert.match(layersBackWords(writing("rules"), [loss("W_STYLE_LAYER_FLATTENED")]), /the other style layers/);
    });
});
