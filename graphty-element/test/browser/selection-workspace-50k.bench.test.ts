/**
 * @file What the graphty app's selection workspace costs graphty-element on 50,000 nodes: opening
 * it (a branches view over a two-branch selection, the rest faint, with the live reading the
 * workspace's counts come from), an edit that changes one branch's test, and closing it. The graph
 * is graph-samples' LFR benchmark with about 5,000 communities, as the app's large-graph tests
 * load it, with the starting rows and the editable base the app turns on.
 *
 * Runs in the `browser-bench` project (npx vitest run --project=browser-bench
 * test/browser/selection-workspace-50k.bench.test.ts), never under coverage; set
 * GRAPHTY_BROWSER_GPU=nvidia (and GRAPHTY_EGL_LIB_DIR on a machine without a system libEGL) to time
 * the real GPU. Each step prints, as `[selection-workspace-50k]`, how long until `styles.settled()`
 * and until `waitForPainted()`, the frames drawn in between and the longest of them, and how many
 * meshes the step added to the scene.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: each step ends with nothing pending, no node is rebuilt twice
 * (a faint node is drawn from a source mesh of its own opacity, so opening and closing rebuild each
 * node once), and an edit rebuilds only the nodes whose branch changed.
 *
 * Measured on the development machine (i9-14900, RTX 4070 SUPER), 2026-11-06, until
 * waitForPainted(): on the GPU, open 4.7 s and 26 frames, edit 0.3 s, close 4.5 s and 29 frames
 * before a repaint took a slow frame's own length (UpdateManager's SLOW_FRAME_MS), and open 2.3 s
 * and 9 frames, edit 0.1 s, close 1.8 s and 8 frames after; on SwiftShader, open 24 s, edit 10 s,
 * close 32 s before, and open 6.5 s, edit 4.8 s, close 8.0 s after (#5753).
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { StepsWatch, UnionLeaf } from "../../session";
import { Graph, operationQueueOf } from "../../src/Graph";

const NODES = 50_000;

/** What one step cost. */
interface Step {
    settledMs: number;
    paintedMs: number;
    frames: number;
    longestFrameMs: number;
    meshesAdded: number;
}

/**
 * A two-branch selection of communities, as the workspace edits it.
 * @param second - The community the second branch keeps.
 * @returns The selection.
 */
function picked(second: string): UnionLeaf {
    const branch = (id: string, value: string): UnionLeaf["branches"][number] => ({
        id,
        start: "all",
        steps: [
            { id: `${id}-s`, op: "keep", rule: { kind: "categories", attribute: "data.community", values: [value] } },
        ],
    });
    return { kind: "union", side: "nodes", within: "visible", branches: [branch("b1", "1"), branch("b2", second)] };
}

describe("the selection workspace on 50,000 nodes", () => {
    let container: HTMLElement;
    let graph: Graph;
    let watch: StepsWatch | null = null;
    let view: { end(): void } | null = null;

    beforeAll(async () => {
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        container = document.createElement("div");
        container.style.width = "1200px";
        container.style.height = "800px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        const session = graph.getSession();
        await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
        await graph.setLayout("random");
        await session.data.generate("lfr", {
            n: NODES,
            minDegree: 2,
            maxDegree: 8,
            degreeExponent: 2.5,
            minCommunity: 5,
            maxCommunity: 15,
            communityExponent: 1.5,
            mixing: 0.1,
            seed: 1,
        });
        await session.data.setType({ kind: "node", name: "community" }, "category");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForPainted();
        console.log(`[selection-workspace-50k] renderer: ${graph.engine.getInfo().renderer}`);
    });

    afterAll(() => {
        view?.end();
        watch?.end();
        graph.dispose();
        container.remove();
    });

    /**
     * Run a change and measure it until the canvas has its last batch.
     * @param change - The change.
     * @returns What it cost.
     */
    async function measure(change: () => void): Promise<Step> {
        let meshesAdded = 0;
        const added = graph.scene.onNewMeshAddedObservable.add(() => {
            meshesAdded++;
        });
        let frames = 0;
        let longestFrameMs = 0;
        const start = performance.now();
        let last = start;
        const observer = graph.scene.onAfterRenderObservable.add(() => {
            const now = performance.now();
            frames++;
            longestFrameMs = Math.max(longestFrameMs, now - last);
            last = now;
        });
        try {
            change();
            await graph.getSession().styles.settled();
            const settledMs = performance.now() - start;
            await graph.waitForPainted();
            const paintedMs = performance.now() - start;
            return { settledMs, paintedMs, frames, longestFrameMs, meshesAdded };
        } finally {
            graph.scene.onAfterRenderObservable.remove(observer);
            graph.scene.onNewMeshAddedObservable.remove(added);
        }
    }

    /**
     * Print a step.
     * @param what - The step.
     * @param step - What it cost.
     */
    function report(what: string, step: Step): void {
        const ms = (value: number): string => `${value.toFixed(0)} ms`;
        console.log(
            `[selection-workspace-50k] ${what}: settled ${ms(step.settledMs)}, painted ${ms(step.paintedMs)}, ` +
                `${String(step.frames)} frames, longest frame ${ms(step.longestFrameMs)}, ` +
                `${String(step.meshesAdded)} meshes added`,
        );
    }

    /**
     * Show the branches view of a selection, as the workspace does on opening and on each edit.
     * @param rule - The selection.
     */
    function show(rule: UnionLeaf): void {
        const session = graph.getSession();
        watch?.end();
        watch = session.scope.watchSteps(rule, () => undefined);
        view = session.styles.showBranches({ edges: true, rule: watch.current.rule, rest: "faint" });
    }

    it("opens", async () => {
        const step = await measure(() => {
            show(picked("2"));
        });
        report("open", step);
        assert.isFalse(graph.getStylePainter().hasPending, "every batch was applied");
        assert.isAtMost(step.meshesAdded, NODES + 16, "no node is rebuilt twice");
    });

    it("previews an edit", async () => {
        const step = await measure(() => {
            show(picked("3"));
        });
        report("edit", step);
        assert.isFalse(graph.getStylePainter().hasPending, "every batch was applied");
        assert.isAtMost(step.meshesAdded, 100, "an edit rebuilds only the nodes whose branch changed");
    });

    it("closes", async () => {
        const step = await measure(() => {
            view?.end();
            view = null;
            watch?.end();
            watch = null;
        });
        report("close", step);
        assert.isFalse(graph.getStylePainter().hasPending, "every batch was applied");
        assert.isAtMost(step.meshesAdded, NODES + 16, "no node is rebuilt twice");
    });
});
