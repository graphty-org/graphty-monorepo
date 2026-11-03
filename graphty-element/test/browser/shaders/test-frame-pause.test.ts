/**
 * @file A pause of the whole process during a shader's test frame does not refuse the shader.
 *
 * The test frame times each square size by the wall clock, so a CPU quota running out or a busy GPU
 * process lands in one size's time as milliseconds the shader never spent. Before the fix, one such
 * pause on the largest square read as a runaway and refused a cheap shader with `shader.over-budget`
 * (issue #5442, seen under a restricted CPU). The pause here is a jump of the page's clock across one
 * pixel read, so the test spends no real time and does not depend on how fast the machine is.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";

/** A node surface that compiles and costs next to nothing. */
const SHADER = `/* graphty-shader 1
{ "id": "user/half", "name": "Half" }
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb * 0.5, n.color.a);
}
`;

/** Large enough that, read as shader cost on the largest square, it is over every limit. */
const PAUSE_MS = 5000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with one node drawn.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "200px";
    element.style.height = "150px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
        element.graph.dispose();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Make the given pixel read of the engine look as if the process was paused for {@link PAUSE_MS}.
 * @param element - The element.
 * @param which - Which read, counted from 1.
 */
function pauseOnRead(element: Graphty, which: number): void {
    const { engine } = element.graph;
    const realNow = performance.now.bind(performance);
    const realRead = engine.readPixels;
    let offset = 0;
    let reads = 0;
    performance.now = () => realNow() + offset;
    engine.readPixels = (...args: Parameters<typeof engine.readPixels>) => {
        reads++;
        if (reads === which) {
            offset += PAUSE_MS;
        }

        return realRead.apply(engine, args);
    };
    cleanups.unshift(() => {
        performance.now = realNow;
        engine.readPixels = realRead;
    });
}

describe("a shader's test frame", () => {
    it("accepts a cheap shader when the process pauses while it draws the largest square", async () => {
        const element = await mounted();
        // The test frame reads one pixel after each of its three square sizes; the third is the largest.
        pauseOnRead(element, 3);
        const added = await element.session.shaders.add(SHADER);
        assert.isTrue(added.ok, JSON.stringify(added));
        assert.strictEqual(element.session.shaders.status("user/half").state, "ready");
    });

    it("accepts a cheap shader when the process pauses while it draws the middle square", async () => {
        const element = await mounted();
        pauseOnRead(element, 2);
        const added = await element.session.shaders.add(SHADER);
        assert.isTrue(added.ok, JSON.stringify(added));
    });
});
