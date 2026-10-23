/**
 * @file A node whose color no layer paints any more is drawn in the element's own default color.
 *
 * The color lives in each node's instance buffer, and the paint handed to a node said `null` for
 * "no layer paints a color", which the node read as "leave the buffer as it is". So removing the
 * only color from a layer (Everything, with the base held as ordinary values) left every node in
 * the removed color while every read of its style said nothing painted one.
 */

import { assert, describe, it } from "vitest";

import type { Path } from "../../src/catalog/types";
import { bootstrapNodePaint, StylePainter } from "../../src/managers/StylePainter";
import { createStylesApi, type RepaintContext } from "../../src/session/styles/index";
import type { SelectorSource } from "../../src/session/styles/predicate";
import { createLayerRepaint } from "../../src/session/styles/repaint";

const NODES: readonly Readonly<Record<Path, unknown>>[] = [{ "data.id": "alpha" }, { "data.id": "beta" }];

/**
 * A context that never cancels and reports to nobody.
 * @returns The context.
 */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

describe("a node color no layer paints any more", () => {
    it("is drawn in the element's default color, not the color that was removed", async () => {
        const elements: SelectorSource = {
            nodeValue: (index, path) => NODES[index]?.[path],
            edgeValue: () => undefined,
        };
        const engine = createLayerRepaint({
            nodeCount: () => NODES.length,
            edgeCount: () => 0,
            elements,
            measured: () => undefined,
        });
        const styles = createStylesApi({ elements, base: [], repaint: engine.repaint });
        const painter = new StylePainter();
        painter.bind(engine);

        const layer = await styles.add({
            name: "Everything",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000", "node.size": 1 },
        });
        await engine.repaintAll(styles.compiled(), quietContext());
        assert.deepInclude(painter.nodePaint(0)?.color ?? {}, { r: 255, g: 0, b: 0 }, "painted red first");

        await styles.update(layer.id, { set: { "node.size": 1 } });

        assert.isUndefined(engine.styleOf("node", 0)["node.color"], "no layer paints a color now");
        assert.deepEqual(painter.nodePaint(0)?.color, bootstrapNodePaint().color, "drawn in the default color");
    });
});
