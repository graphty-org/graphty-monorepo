/**
 * @file Browser timing rows for curved edges on both render paths (issue #9160). Recorded, never
 * asserted: each row prints and the `bench-browser` project appends it to
 * `benchmarks/results/browser-<host>.jsonl`.
 *
 * A ring of 2000 nodes with long chords drawn as curves (`edge.curvature`, no arrowhead), so each
 * curve takes the most pieces (64). At 30 chords a node (60,000 curves) the batched path's curve
 * table passes 8192 lines of 1024 texels: before issue #9160 WebGL refused it (INVALID_VALUE) and
 * the curves drew nothing. Each row gives the time from adding the edges to the first stable frame,
 * the median of ten frames drawn after it, the GL errors, and the pixels inked, so a run before and
 * after a change shows both what it costs and whether it draws. Each frame ends with a one-pixel read, so its time
 * includes the GPU's work, not only its submission. The "mixed" row joins each node to its four nearest neighbors
 * (short curves, 10 pieces) and one long chord (64): on the batched path each curve should draw only its own pieces,
 * whatever the long chords beside it ask for. Each row also gives the vertices the curve batch draws.
 */

import "../../src/graphty-element";

import type { Mesh } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { readCanvas } from "../helpers/whole-canvas";

const N = 2000;
const SIZES = [
    { label: "small", perNode: 1, near: 0 },
    { label: "medium", perNode: 5, near: 0 },
    { label: "large", perNode: 30, near: 0 },
    { label: "mixed", perNode: 1, near: 4 },
] as const;
const PATHS = ["objects", "batched"] as const;
const FRAMES = 10;

describe("curved edges", () => {
    for (const path of PATHS) {
        for (const { label, perNode, near } of SIZES) {
            it(`${label} (${String(N * (perNode + near))} curves) on ${path}`, async () => {
                const element = document.createElement("graphty-element");
                element.renderPath = path;
                element.style.display = "block";
                element.style.width = "400px";
                element.style.height = "300px";
                document.body.appendChild(element);
                await element.updateComplete;
                const nodes = Array.from({ length: N }, (_, id) => ({
                    id,
                    position: { x: Math.cos((id / N) * 6.283) * 30, y: Math.sin((id / N) * 6.283) * 30, z: 0 },
                }));
                const edges: { src: number; dst: number }[] = [];
                for (let i = 0; i < N; i++) {
                    for (let k = 0; k < perNode; k++) {
                        edges.push({ src: i, dst: (i + N / 2 - perNode + 2 * k) % N });
                    }

                    for (let k = 1; k <= near; k++) {
                        edges.push({ src: i, dst: (i + k) % N });
                    }
                }

                await element.session.data.addNodes(nodes);
                await element.graph.setLayout("fixed", { dim: 3 });
                await element.setViewMode("3d");
                await element.session.styles.add({
                    name: "curves",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.arrowHead": "none", "edge.curvature": true, "edge.fanned": false },
                } as never);
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();

                const start = performance.now();
                await element.session.data.addEdges(edges);
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();
                const loadMs = performance.now() - start;

                const { scene } = element.graph;
                const gl = (element.graph.engine as unknown as { _gl?: WebGL2RenderingContext })._gl;
                const pixel = new Uint8Array(4);
                const times: number[] = [];
                for (let f = 0; f < FRAMES; f++) {
                    const at = performance.now();
                    scene.render();
                    // waits for the GPU to finish the frame
                    gl?.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                    times.push(performance.now() - at);
                }

                times.sort((a, b) => a - b);
                const curveVertices = scene.meshes
                    .filter((mesh) => mesh.name.endsWith("|curve"))
                    .reduce(
                        (sum, mesh) =>
                            sum +
                            (mesh.subMeshes[0]?.verticesCount ?? 0) * Math.max(1, (mesh as Mesh).forcedInstanceCount),
                        0,
                    );
                const errors: number[] = [];
                for (let e = gl?.getError(); e !== undefined && e !== 0 && errors.length < 10; e = gl?.getError()) {
                    errors.push(e);
                }

                const { pixels } = await readCanvas(element.graph);
                let inked = 0;
                for (let i = 0; i < pixels.length; i += 4) {
                    if ((pixels[i] ?? 255) < 200 || (pixels[i + 1] ?? 255) < 200 || (pixels[i + 2] ?? 255) < 200) {
                        inked++;
                    }
                }

                element.remove();
                console.log(
                    `bench-row ${JSON.stringify({
                        bench: "curved-edges",
                        path,
                        size: label,
                        curves: edges.length,
                        loadMs: Math.round(loadMs),
                        frameMedianMs: Number((times[FRAMES / 2] ?? 0).toFixed(2)),
                        curveVertices,
                        glErrors: errors,
                        inked,
                    })}`,
                );
                assert.strictEqual(times.length, FRAMES);
            });
        }
    }
});
