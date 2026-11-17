/**
 * @file A model's own settings under a node's layers: the painter fills each `node.model*` value
 * no layer set from the model the node draws, a layer's own value wins, a node with no model or a
 * model with no settings paints as before, and a change of settings changes the mesh key.
 */

import { assert, describe, it } from "vitest";

import type { Path } from "../../src/catalog/types";
import { StylePainter } from "../../src/managers/StylePainter";
import type { ModelDefaults } from "../../src/session/assets/AssetsApi";
import { createStylesApi, type RepaintContext } from "../../src/session/styles/index";
import type { SelectorSource } from "../../src/session/styles/predicate";
import { createLayerRepaint } from "../../src/session/styles/repaint";

const NODES: readonly Readonly<Record<Path, unknown>>[] = [{ "data.id": "a" }];

/**
 * A context that never cancels and reports to nobody.
 * @returns The context.
 */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

/**
 * One node drawn as a model through one layer, and a painter reading the model's settings live.
 * @param set - The layer's values beside `node.model`.
 * @param defaults - The model's settings, read live.
 * @returns The painter.
 */
async function painted(set: Record<string, unknown>, defaults: () => ModelDefaults | undefined): Promise<StylePainter> {
    const elements: SelectorSource = { nodeValue: (index, path) => NODES[index]?.[path], edgeValue: () => undefined };
    const engine = createLayerRepaint({
        nodeCount: () => NODES.length,
        edgeCount: () => 0,
        elements,
        measured: () => undefined,
    });
    const styles = createStylesApi({ elements, base: [], repaint: engine.repaint });
    const painter = new StylePainter(undefined, undefined, (model) => (model === "asset:m" ? defaults() : undefined));
    painter.bind(engine);
    await styles.add({
        name: "Model",
        target: "node",
        selector: { match: "everything" },
        set: { "node.model": "asset:m", ...set },
    });
    await engine.repaintAll(styles.compiled(), quietContext());
    return painter;
}

const TURNED: ModelDefaults = { style: { "node.modelTurn": 90 }, hiddenTextures: [] };

describe("a model's own settings in a node's paint", () => {
    it("fill a value no layer set", async () => {
        const painter = await painted({}, () => TURNED);
        assert.strictEqual(painter.nodePaint(0)?.style.shape?.modelTurn, 90);
        assert.strictEqual(painter.rowPaint(0)?.style.shape?.modelTurn, 90);
    });

    it("give way to a layer's own value", async () => {
        const painter = await painted({ "node.modelTurn": 45 }, () => TURNED);
        assert.strictEqual(painter.nodePaint(0)?.style.shape?.modelTurn, 45);
    });

    it("change nothing when the model has none, and key the mesh apart when they change", async () => {
        let defaults: ModelDefaults | undefined;
        const painter = await painted({}, () => defaults);
        const plain = painter.nodePaint(0);
        const plainRow = painter.rowPaint(0);
        assert.isUndefined(plain?.style.shape?.modelTurn);

        defaults = TURNED;
        assert.notStrictEqual(painter.nodePaint(0)?.meshKey, plain?.meshKey);
        assert.notStrictEqual(painter.rowPaint(0)?.meshKey, plainRow?.meshKey);
        defaults = { style: {}, hiddenTextures: ["wood.png"] };
        assert.notStrictEqual(painter.nodePaint(0)?.meshKey, plain?.meshKey, "a hidden picture is a new mesh too");

        defaults = undefined;
        assert.strictEqual(painter.nodePaint(0)?.meshKey, plain?.meshKey, "none again, the plain key");
    });
});
