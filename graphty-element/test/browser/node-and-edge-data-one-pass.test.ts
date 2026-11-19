/**
 * `nodeData` and `edgeData` assigned in the same task are one data step, and the layout makes one
 * pass over them, wherever the frames fall.
 *
 * WHAT WENT WRONG (issue #8901). The two assignments were two queued data steps. On a slow runner
 * the nodes' style pass yields to the event loop, a frame landed before the edges' step had even
 * been dispatched, and the one-shot circular layout settled on the nodes alone; the edges then
 * started it again. The `Extending/Simple tier/Logging` story's log panel showed a second
 * `layout running` / `layout settled` pair on some runs and not on others.
 *
 * HOW THE TEST FORCES THAT ORDER. The clock is stubbed so that every sliced pass runs out of time
 * at once and yields, which is the ordering a slow CI runner reaches by chance.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import { clearRegisteredLogSinksForTesting, defineLogDestination } from "../../extend";
import type { Graphty } from "../../index.js";
import { GraphtyLogger, LogLevel } from "../../logging";

const NODES = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index + 1) % NODES.length].id }));

let mounted: Graphty | null = null;

afterEach(async () => {
    vi.restoreAllMocks();
    mounted?.remove();
    mounted = null;
    clearRegisteredLogSinksForTesting();
    await GraphtyLogger.configure({ enabled: false });
});

describe("nodeData and edgeData set together", () => {
    it("are laid out in one pass when every sliced pass yields to a frame", async () => {
        const motion: string[] = [];
        defineLogDestination({
            id: "layout-motion",
            level: "info",
            write: (record) => {
                if (/^layout (running|settled|paused)$/.test(record.message)) {
                    motion.push(record.message);
                }
            },
        });
        await GraphtyLogger.configure({ enabled: true, level: LogLevel.INFO });

        // Every slice runs out of time, so every sliced pass yields and frames land between.
        let clock = performance.now();
        vi.spyOn(performance, "now").mockImplementation(() => (clock += 20));

        const element = document.createElement("graphty-element");
        element.nodeData = [...NODES];
        element.edgeData = [...EDGES];
        element.layout = "circular";
        document.body.append(element);
        mounted = element;

        await element.waitForStableFrame();

        assert.deepStrictEqual(motion, ["layout running", "layout settled"], "one pass over the nodes and edges");
        assert.strictEqual(element.graph.getDataManager().edges.size, EDGES.length);
    });
});
