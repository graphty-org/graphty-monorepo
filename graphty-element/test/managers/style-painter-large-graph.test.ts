/**
 * @file `Limits.largeGraphThreshold` (issue #302): past it, a node no layer gives a
 * `node.meshDetail` is painted at low detail, keyed apart from its full-detail mesh; a layer that
 * sets one keeps it, and below the threshold every node is painted as the layers say.
 */

import { assert, describe, it } from "vitest";

import type { Path } from "../../src/catalog/types";
import { StylePainter } from "../../src/managers/StylePainter";
import { DEFAULT_LIMITS, FULL_DETAIL_NODE_TRIANGLES, fullDetailOverBudget } from "../../src/session/limits";
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
 * Two nodes, and a painter reading `large`.
 * @param large - Whether the graph is past the threshold, read live.
 * @param detail - The `node.meshDetail` a layer gives every node, or undefined for no layer.
 * @returns The painter.
 */
async function painted(large: () => boolean, detail?: "full" | "low"): Promise<StylePainter> {
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
    const painter = new StylePainter(undefined, undefined, undefined, large);
    painter.bind(engine);
    if (detail !== undefined) {
        await styles.add({
            name: "Detail",
            target: "node",
            selector: { match: "everything" },
            set: { "node.meshDetail": detail },
        });
    }

    await engine.repaintAll(styles.compiled(), quietContext());
    return painter;
}

describe("a large graph's node detail", () => {
    it("paints nodes as the layers say below the threshold", async () => {
        const painter = await painted(() => false);

        assert.isUndefined(painter.nodePaint(0)?.style.shape?.detail);
        assert.isUndefined(painter.nodePaint(1)?.style.shape?.detail);
    });

    it("keeps the detail a layer sets past the threshold", async () => {
        const painter = await painted(() => true, "full");

        assert.strictEqual(painter.nodePaint(0)?.style.shape?.detail, "full");
    });

    it("paints a node no layer gives a detail low past it, and follows the graph back below it", async () => {
        let large = false;
        const painter = await painted(() => large);
        const full = painter.rowPaint(0);

        large = true;
        const low = painter.rowPaint(0);
        assert.strictEqual(low?.style.shape?.detail, "low");
        assert.notStrictEqual(low?.meshKey, full?.meshKey, "the low mesh is keyed apart from the full one");

        large = false;
        assert.isUndefined(painter.rowPaint(0)?.style.shape?.detail);
        assert.strictEqual(painter.rowPaint(0)?.meshKey, full?.meshKey, "below it again, the original key");
    });

    it("paints low once the full-detail triangle estimate passes the budget, and keeps a layer's own detail", async () => {
        const budget = DEFAULT_LIMITS.fullDetailTriangleBudget;
        const atBudget = Math.floor(budget / FULL_DETAIL_NODE_TRIANGLES);
        let nodes = atBudget;
        const over = (): boolean => fullDetailOverBudget(nodes, budget);
        const painter = await painted(over);
        const layered = await painted(over, "full");

        assert.isUndefined(painter.rowPaint(0)?.style.shape?.detail, "at the budget, full detail");
        nodes = atBudget + 1;
        assert.strictEqual(painter.rowPaint(0)?.style.shape?.detail, "low", "one node past it, low");
        assert.strictEqual(layered.rowPaint(0)?.style.shape?.detail, "full", "a layer's own detail wins");
    });
});
