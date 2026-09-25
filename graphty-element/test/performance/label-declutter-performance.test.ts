/**
 * @file What the label declutter pass costs a frame.
 *
 * Renders graphs with 100, 1000 and 5000 labelled nodes and times `scene.render()` with the
 * declutter pass on and off, for a still camera over a still layout and for a camera that turns
 * a little every frame. The pass's own time is measured separately by wrapping its `run`.
 *
 * Frame time here is the CPU cost of one synchronous `scene.render()`; it does not include the
 * GPU finishing the frame, which the pass does not touch.
 *
 * It asserts nothing about speed, only that the pass ran exactly when it had to. The numbers go
 * to the console, one line per scenario.
 */

import { Axis, type TransformNode } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { LabelDeclutter } from "../../src/managers/LabelDeclutter";

const WIDTH = 1280;
const HEIGHT = 720;
const WARMUP_FRAMES = 10;
const FRAMES = 60;
// 5000 labels take most of two minutes to build, so that size runs only when asked for:
// VITE_LABEL_DECLUTTER_BENCH_FULL=1 npx vitest run --project=browser test/performance/label-declutter-performance.test.ts
const FULL = Boolean((import.meta.env as Record<string, string | undefined>).VITE_LABEL_DECLUTTER_BENCH_FULL);
const SIZES = FULL ? [100, 1000, 5000] : [100, 1000];

const FULL_PASSES = 20;

interface Sample {
    frameMs: number;
    passMs: number;
    passRuns: number;
    shown: number;
}

describe("label declutter performance", () => {
    let container: HTMLElement | undefined;
    let graph: Graph | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
    });

    async function draw(count: number): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();

        // A square grid tight enough that neighbouring labels collide, so the pass has work.
        const side = Math.ceil(Math.sqrt(count));
        const nodes = [];
        for (let i = 0; i < count; i++) {
            nodes.push({ id: `n${String(i)}`, position: { x: (i % side) * 1.5, y: Math.floor(i / side) * 1.5, z: 0 } });
        }

        const edges = [];
        for (let i = 1; i < count; i++) {
            edges.push({ src: `n${String(i)}`, dst: `n${String(Math.floor(i / 2))}` });
        }

        await g.addNodes(nodes);
        await g.addEdges(edges);
        await g.setLayout("fixed", { dim: 3 });
        await g.operationQueue.waitForCompletion();
        await g.getSession().styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "LABEL" },
        });
        await g.operationQueue.waitForCompletion();

        // The repaint that builds the labels lands across the next few frames.
        for (let at = 0; at < 8; at++) {
            g.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, 10);
            });
        }

        return g;
    }

    function declutterOf(g: Graph): LabelDeclutter | undefined {
        const found: unknown = g.scene.metadata?.labelDeclutter;
        return found instanceof LabelDeclutter ? found : undefined;
    }

    /**
     * Turn the pass on or off.
     * @param g - The graph.
     * @param on - Whether labels are decluttered.
     */
    function setDeclutter(g: Graph, on: boolean): void {
        g.setLayoutBehavior({ labels: { declutter: on } });
    }

    function measure(g: Graph, moving: boolean, skipPass = false): Sample {
        const pivot = g.scene.activeCamera?.parent as TransformNode | null;
        assert.isOk(pivot, "the orbit camera hangs from a pivot");

        const pass = declutterOf(g);
        assert.isOk(pass, "a labelled scene has a declutter pass");

        // The per-frame cost is `run`: the check for whether anything changed, plus a full pass
        // when something did. `passes` counts the full passes.
        let passMs = 0;
        const original = pass.run.bind(pass);
        pass.run = (): void => {
            const start = performance.now();
            if (!skipPass) {
                original();
            }
            passMs += performance.now() - start;
        };

        const turn = (): void => {
            if (moving) {
                pivot.rotate(Axis.Y, 0.01);
            }
        };

        for (let at = 0; at < WARMUP_FRAMES; at++) {
            turn();
            g.scene.render();
        }

        passMs = 0;
        const passesBefore = pass.passes;
        // Timed as one block: the browser rounds performance.now() to a tenth of a millisecond,
        // which is coarser than one small frame.
        const start = performance.now();
        for (let at = 0; at < FRAMES; at++) {
            turn();
            g.scene.render();
        }
        const frameMs = (performance.now() - start) / FRAMES;
        const passRuns = pass.passes - passesBefore;
        pass.run = original;

        let shown = 0;
        for (const node of g.getDataManager().nodes.values()) {
            const mesh = node.label?.labelMesh;
            if (mesh?.isEnabled() && mesh.isVisible) {
                shown++;
            }
        }

        return { frameMs, passMs: passMs / FRAMES, passRuns, shown };
    }

    /**
     * What one full pass costs, timed as a block of passes run back to back.
     * @param g - The graph.
     * @returns Milliseconds per pass.
     */
    function fullPass(g: Graph): number {
        const pass = declutterOf(g);
        const camera = g.scene.activeCamera;
        assert.isOk(pass);
        assert.isOk(camera);
        const start = performance.now();
        for (let at = 0; at < FULL_PASSES; at++) {
            pass.place(camera);
        }

        return (performance.now() - start) / FULL_PASSES;
    }

    for (const count of SIZES) {
        it(`${String(count)} labelled nodes`, { timeout: 300_000 }, async () => {
            const g = await draw(count);
            const lines: string[] = [];

            for (const on of [false, true]) {
                setDeclutter(g, on);
                for (const moving of [false, true]) {
                    const s = measure(g, moving);
                    lines.push(
                        `[label-declutter-perf] labels=${String(count)} declutter=${on ? "on " : "off"} ` +
                            `camera=${moving ? "moving" : "still "} frame_ms=${s.frameMs.toFixed(2)} ` +
                            `pass_ms_per_frame=${s.passMs.toFixed(3)} pass_runs=${String(s.passRuns)}/${String(FRAMES)} ` +
                            `labels_shown=${String(s.shown)}`,
                    );
                    if (on && moving) {
                        assert.strictEqual(s.passRuns, FRAMES, "a moving camera re-runs the pass every frame");
                    } else if (on) {
                        assert.strictEqual(s.passRuns, 0, "a still scene does not re-run the pass");
                    } else {
                        assert.strictEqual(s.shown, count, "with declutter off every label is drawn");
                    }
                }
            }

            // The same moving camera over the same labels with the pass switched off by hand, so
            // the difference to the moving row above is what the pass adds to a frame. Some of
            // the pass's own time is world matrices the render would compute anyway.
            const skipped = measure(g, true, true);
            lines.push(
                `[label-declutter-perf] labels=${String(count)} declutter=on  camera=moving pass=skipped ` +
                    `frame_ms=${skipped.frameMs.toFixed(2)} labels_shown=${String(skipped.shown)}`,
                `[label-declutter-perf] labels=${String(count)} one_full_pass_ms=${fullPass(g).toFixed(3)}`,
            );
            console.log(lines.join("\n"));
        });
    }
});
