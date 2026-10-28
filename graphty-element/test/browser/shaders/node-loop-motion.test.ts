/**
 * @file A looping node shader keeps moving after the graph settles, and a still one lets the canvas
 * rest (issue #3320: holograms stopped animating a second or two after a sample opened).
 *
 * The flashing check read the whole canvas and blamed every moving shader for any luminance swing
 * in it, so the picture changing while the graph laid itself out -- here a large node turning black
 * and white, as layout motion and the camera's framing do over a real graph -- froze every looping
 * shader on screen for good. The check now judges only frames in which nothing but the shaders'
 * time changed.
 *
 * Waits are passive -- animation frames of the page, never a frame observer on the scene, which
 * would itself ask a graph drawn on demand for the frame and hide a lost claim.
 */

import "../../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import { operationQueueOf } from "../../../src/Graph";
import { NodeShaderDrawing } from "../../../src/meshes/NodeShaderDrawing";
import { shadersControllerOf } from "../../../src/session/shaders";
import type { LazyShaderHost } from "../../../src/shaders/chunk";
import { defineShader } from "../../../src/simple/defineShader";

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({
        id: "m3320/pulse",
        motion: "loop",
        // Slow and dim: it never swings a canvas area's luminance by a flash's 10% on its own.
        glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb * (0.95 + 0.05 * sin(n.time)), 1.0); }",
    });
    defineShader({
        id: "m3320/flat",
        glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb, 1.0); }",
    });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** One page frame. */
async function pageFrame(): Promise<void> {
    await new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * The render loop's tick counts.
 * @param element - The element.
 * @returns Frames drawn and ticks rested.
 */
function ticksOf(element: Graphty): { drawn: number; rested: number } {
    return (element.graph as unknown as { renderManager: { ticks: { drawn: number; rested: number } } }).renderManager
        .ticks;
}

/**
 * The time the graph's one shader reads: the scene's time, or the time a moving shader was frozen
 * at.
 * @param element - The element.
 * @returns Seconds, or NaN before the runtime loaded.
 */
function shaderTime(element: Graphty): number {
    const host = shadersControllerOf(element.session)?.host as LazyShaderHost | null | undefined;
    const uniforms = host?.loaded?.uniforms;
    const [hash] = NodeShaderDrawing.peek(element.graph.getScene())?.guardedDrawn().moving ?? [];
    const frozen = hash === undefined ? -1 : (uniforms?.frozenTime(hash) ?? -1);
    return frozen >= 0 ? frozen : (uniforms?.currentTime ?? Number.NaN);
}

/**
 * Wait for chances of the element's render loop to draw, asking the scene for nothing.
 * @param element - The element.
 * @param chances - How many ticks (drawn or rested).
 * @returns The frames drawn and how far the shader's time moved over them.
 */
async function over(element: Graphty, chances: number): Promise<{ drawn: number; moved: number }> {
    const ticks = ticksOf(element);
    const start = ticks.drawn + ticks.rested;
    const { drawn } = ticks;
    const time = shaderTime(element);
    while (ticks.drawn + ticks.rested - start < chances) {
        await pageFrame();
    }

    return { drawn: ticks.drawn - drawn, moved: shaderTime(element) - time };
}

/**
 * Wait passively, page frame by page frame, until a condition holds.
 * @param holds - The condition.
 */
async function until(holds: () => boolean): Promise<void> {
    while (!holds()) {
        await pageFrame();
    }
}

/**
 * A mounted element drawing on demand: a force-laid chain whose nodes carry a shader, and one large
 * plain node that turns black and white while the graph lays itself out, standing in for the
 * picture changing under layout motion and the camera's framing. Returns once the graph settled.
 * @param shader - The chain's shader id.
 * @returns The element.
 */
async function settledAfterChange(shader: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        ...Array.from({ length: 8 }, (_, i) => ({ id: `n${String(i)}` })),
        { id: "big" },
    ]);
    await element.session.data.addEdges(
        Array.from({ length: 7 }, (_, i) => ({ source: `n${String(i)}`, target: `n${String(i + 1)}` })),
    );
    await element.session.styles.add({
        name: "Shaded",
        target: "node",
        selector: { match: "ids", nodes: Array.from({ length: 8 }, (_, i) => `n${String(i)}`) },
        set: { "node.shaders": [{ shader }] },
    });
    const big = await element.session.styles.add({
        name: "Big",
        target: "node",
        selector: { match: "ids", nodes: ["big"] },
        set: { "node.size": 40, "node.color": "#000000" },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await until(() => {
        const stats = NodeShaderDrawing.peek(element.graph.getScene())?.drawnById();
        return (stats?.get(shader)?.drawn ?? 0) > 0;
    });

    // Twenty swings of a large area between black and white while the shader draws: ten flashes,
    // as a laying-out graph makes.
    for (let i = 0; i < 20; i++) {
        const { drawn } = ticksOf(element);
        await element.session.styles.update(big.id, {
            set: { "node.size": 40, "node.color": i % 2 === 0 ? "#ffffff" : "#000000" },
        });
        await until(() => ticksOf(element).drawn > drawn);
    }

    await until(() => element.graph.isFrameStable);
    return element;
}

describe("a looping node shader on a graph drawn on demand", () => {
    for (const shader of ["hologram", "m3320/pulse"]) {
        it(`keeps drawing and moving its time after the graph settles: ${shader}`, async () => {
            const element = await settledAfterChange(shader);
            const { drawn, moved } = await over(element, 60);
            assert.strictEqual(drawn, 60, "every chance the loop has draws a frame");
            assert.isAbove(moved, 0, "the time the shader reads advances");
            assert.notStrictEqual(
                element.session.shaders.status(shader).state,
                "still",
                "the shader is not held still",
            );
        });
    }

    it("lets the canvas rest for a still shader", async () => {
        const element = await settledAfterChange("m3320/flat");
        // Past the frames the last change still owes.
        await until(() => ticksOf(element).rested > 0);
        const { drawn, moved } = await over(element, 60);
        assert.strictEqual(drawn, 0, "the loop rests");
        assert.strictEqual(moved, 0, "the time stands");
    });
});
