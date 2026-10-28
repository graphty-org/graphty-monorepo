/**
 * @file Graphs that compiled shaders give everything back when they are disposed: four in a row,
 * each with a pasted shader compiled, test-drawn and pictured, leave a fifth able to start and
 * compile one too.
 *
 * WebKit keeps few WebGL contexts per page and iPad Safari fewer, so a shader runtime that held a
 * program, a render target or a uniform buffer past its graph's disposal would leave the next
 * graph on the page without a context. Run in WebKit and Firefox by the "autosave-engines"
 * project, and in Chromium by "browser".
 */

import "../../../src/graphty-element";

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";

/** A node surface that compiles. */
const SHADER = `/* graphty-shader 1
{ "id": "user/half", "name": "Half" }
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb * 0.5, n.color.a);
}
`;

/**
 * Mount an element, draw a node, and compile and picture a shader on it.
 * @returns The element, drawn.
 */
async function graphWithShader(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "200px";
    element.style.height = "150px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const added = await element.session.shaders.add(SHADER);
    assert.isTrue(added.ok, JSON.stringify(added));
    assert.strictEqual(element.session.shaders.status("user/half").state, "ready");
    await element.session.shaders.thumbnail("user/half");
    return element;
}

describe("disposing graphs that compiled shaders", () => {
    it("leaves a fifth graph able to start after four are disposed", async () => {
        for (let i = 0; i < 4; i++) {
            const element = await graphWithShader();
            element.remove();
            element.graph.dispose();
        }

        const fifth = await graphWithShader();
        try {
            const gl = (fifth.graph.engine as unknown as { _gl?: WebGLRenderingContext })._gl;
            assert.isFalse(gl?.isContextLost() ?? false, "the fifth graph's context was lost");
            const before = fifth.graph.scene.getRenderId();
            fifth.graph.scene.render();
            assert.isAbove(fifth.graph.scene.getRenderId(), before);
        } finally {
            fifth.remove();
            fifth.graph.dispose();
        }
    });
});
