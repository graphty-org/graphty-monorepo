/**
 * @file The project setting `minMarkSize` (issue #813): a node or edge painted smaller than the
 * minimum, size 0 included, is drawn at the minimum, keyed apart from its unraised mesh; with no
 * minimum it is drawn exactly as painted, and an edge of width 0 draws no line as before.
 */

import { assert, describe, it } from "vitest";

import type { Path } from "../../src/catalog/types";
import { type MarkMinimums, StylePainter } from "../../src/managers/StylePainter";
import { createStylesApi, type RepaintContext } from "../../src/session/styles/index";
import type { SelectorSource } from "../../src/session/styles/predicate";
import { createLayerRepaint } from "../../src/session/styles/repaint";

const NODES: readonly Readonly<Record<Path, unknown>>[] = [{ "data.id": "a" }, { "data.id": "b" }];

/**
 * A context that never cancels and reports to nobody.
 * @returns The context.
 */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

/**
 * Two nodes and one edge painted size 0 and width 0, and a painter reading `minimums`.
 * @param minimums - What the setting holds, read live.
 * @returns The painter.
 */
async function paintedZero(minimums: () => MarkMinimums | undefined): Promise<StylePainter> {
    const elements: SelectorSource = {
        nodeValue: (index, path) => NODES[index]?.[path],
        edgeValue: () => undefined,
    };
    const engine = createLayerRepaint({
        nodeCount: () => NODES.length,
        edgeCount: () => 1,
        elements,
        measured: () => undefined,
    });
    const styles = createStylesApi({ elements, base: [], repaint: engine.repaint });
    const painter = new StylePainter(undefined, minimums);
    painter.bind(engine);
    await styles.add({ name: "Zero", target: "node", selector: { match: "everything" }, set: { "node.size": 0 } });
    await styles.add({ name: "Zero", target: "edge", selector: { match: "everything" }, set: { "edge.width": 0 } });
    await engine.repaintAll(styles.compiled(), quietContext());
    return painter;
}

describe("a minimum mark size", () => {
    it("draws a size-0 node and a width-0 edge at the minimum when it is set", async () => {
        const painter = await paintedZero(() => ({ node: 0.5, edge: 1 }));

        assert.strictEqual(painter.nodePaint(0)?.style.shape?.size, 0.5);
        assert.strictEqual(painter.rowPaint(1)?.style.shape?.size, 0.5);
        assert.strictEqual(painter.edgePaint(0)?.style.line?.width, 1);
    });

    it("draws them as painted, size 0 and no line, when it is off", async () => {
        const painter = await paintedZero(() => undefined);

        assert.strictEqual(painter.nodePaint(0)?.style.shape?.size, 0);
        assert.strictEqual(painter.edgePaint(0)?.style.line?.width, 0);
    });

    it("keys a raised mark apart, and follows the setting when it changes", async () => {
        let minimums: MarkMinimums | undefined;
        const painter = await paintedZero(() => minimums);
        const before = painter.edgePaint(0);
        const node = painter.rowPaint(0);

        minimums = { node: 2, edge: 3 };
        const raised = painter.edgePaint(0);
        assert.strictEqual(raised?.style.line?.width, 3);
        assert.notStrictEqual(raised?.meshKey, before?.meshKey, "the raised edge does not reuse the unraised mesh");
        assert.strictEqual(painter.rowPaint(0)?.style.shape?.size, 2);
        assert.notStrictEqual(painter.rowPaint(0)?.meshKey, node?.meshKey);

        minimums = undefined;
        assert.strictEqual(painter.edgePaint(0)?.meshKey, before?.meshKey, "off again, the original key");
        assert.strictEqual(painter.rowPaint(0)?.style.shape?.size, 0);
    });

    it("leaves a mark painted larger than the minimum as it is", async () => {
        const painter = await paintedZero(() => ({ node: 0.5 }));

        assert.strictEqual(painter.nodePaint(0)?.style.shape?.size, 0.5);
        assert.strictEqual(painter.edgePaint(0)?.style.line?.width, 0, "no edge minimum, the edge stays 0");
    });
});
