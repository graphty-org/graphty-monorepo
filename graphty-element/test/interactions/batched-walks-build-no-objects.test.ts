/**
 * @file On the `"batched"` render path most rows are drawn with no `Node`. Two internal walks built one for every
 * row (issue #10052):
 *
 * - the view log's drawn counts asked every `Node` whether it was drawn;
 * - a scoped layout built over an empty graph placed its held nodes, once nodes arrived, through every `Node`.
 *
 * What is asserted is counted work: the `Node`s and `Edge`s each walk builds, with the same answer on both paths.
 */

import "../../src/graphty-element";

import { maskTest } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { GraphtyLogger } from "../../src/logging/GraphtyLogger.js";
import { resetLoggingConfig } from "../../src/logging/LoggerConfig.js";
import { LogLevel, type LogRecord } from "../../src/logging/types.js";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { contextOf } from "../helpers/webgl-context";

const COUNT = 40;
const MEMBERS = Array.from({ length: 10 }, (_, id) => id);
const NODES = Array.from({ length: COUNT }, (_, id) => ({
    id,
    position: { x: (id % 8) * 3 - 10, y: Math.floor(id / 8) * 3 - 6, z: 0 },
}));
const SINK = "batched-walks-build-no-objects";
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
    GraphtyLogger.removeSink(SINK);
    resetLoggingConfig();
});

/**
 * An element on a render path, attached and ready.
 * @param path - The render path.
 * @returns The element.
 */
async function element(path: RenderPath): Promise<Graphty> {
    const el = document.createElement("graphty-element");
    el.renderPath = path;
    el.style.display = "block";
    el.style.width = "400px";
    el.style.height = "300px";
    document.body.appendChild(el);
    cleanups.push(() => {
        el.remove();
    });
    await el.updateComplete;
    await operationQueueOf(el.graph).waitForCompletion();
    return el;
}

/**
 * The `Node`s and `Edge`s built so far.
 * @param el - The element.
 * @returns The counts.
 */
function built(el: Graphty): { nodes: number; edges: number } {
    const manager = el.graph.getDataManager();
    return { nodes: dataManagerInternals.nodesBuilt(manager), edges: dataManagerInternals.edgesBuilt(manager) };
}

describe.each(["batched", "objects"] as const)("internal walks on %s", (path) => {
    it("the view log counts every drawn node, building no Node on batched", async () => {
        const records: LogRecord[] = [];
        await GraphtyLogger.configure({ enabled: true, level: LogLevel.INFO });
        const logged = new Promise<LogRecord>((resolve) => {
            GraphtyLogger.addSink({
                name: SINK,
                write: (record) => {
                    records.push(record);
                    if (record.message === "drawn after return") {
                        resolve(record);
                    }
                },
            });
        });

        const el = await element(path);
        await el.graph.setLayout("fixed", { dim: 3 });
        await el.session.data.addNodes(NODES);
        await el.waitForSettled();
        await el.waitForStableFrame();
        const before = built(el);

        // The first frame after a lost context is given back is logged with what it draws.
        const lost = new Promise<void>((resolve) => {
            el.addEventListener(
                "render-lost",
                () => {
                    resolve();
                },
                { once: true },
            );
        });
        const extension = contextOf(el.graph).getExtension("WEBGL_lose_context");
        assert.isNotNull(extension);
        extension.loseContext();
        await lost;
        await el.restartRenderer();
        const drawn = await logged;

        assert.strictEqual(drawn.data?.nodes, COUNT);
        assert.strictEqual(drawn.data?.nodesDrawn, COUNT, "every node is counted as drawn");
        if (path === "batched") {
            assert.deepStrictEqual(before, { nodes: 0, edges: 0 }, "rows are drawn with no Node");
            assert.strictEqual(built(el).nodes, 0, "the counts built no Node");
        }
    });

    it("a scoped layout built over an empty graph holds the rest once nodes arrive, building no Node on batched", async () => {
        const el = await element(path);
        // A carried scope over an empty graph is kept, its members owed until nodes arrive.
        await el.graph.setLayoutScope({ nodes: MEMBERS });
        await el.graph.setLayout("ngraph", { seed: 7 });
        await el.session.data.addNodes(NODES);
        await operationQueueOf(el.graph).waitForCompletion();
        await el.waitForStableFrame();

        const engine = el.graph.getLayoutManager().layoutEngine;
        assert.isDefined(engine);
        const mask = engine.holdMask;
        assert.isNotNull(mask, "the layout holds the nodes outside its scope");
        const held = NODES.filter((_, row) => maskTest(mask, row)).length;
        assert.strictEqual(held, COUNT - MEMBERS.length, "every node outside the scope is held");
        if (path === "batched") {
            assert.strictEqual(built(el).nodes, 0, "taking the members built no Node");
        }
    });
});
