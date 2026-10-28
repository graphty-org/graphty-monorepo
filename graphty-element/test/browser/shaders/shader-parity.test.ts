/**
 * @file Shaders of every origin treated alike in a real element (design/rendering/shader-studio/
 * decisions.md section 3.2): a thumbnail drawn for a shader with no picture and cached, a preset's
 * supplied picture returned undrawn, a registered shader's text saved with the look and opened
 * held on a page without it, and the flashing check freezing a shader that is not pasted.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import { shadersControllerOf } from "../../../src/session/shaders";
import { defineShader } from "../../../src/simple/defineShader";
import { drawnFrames } from "../../helpers/drawn-frames";

/** A pasted node effect with no picture of its own: an orange ring around the node. */
const RING = `/* graphty-shader 1
{ "id": "user/ring", "name": "Ring", "place": "around", "reach": 2.5 }
*/
vec4 shade(NodeInput n) {
    float ring = smoothstep(0.25, 0.0, abs(length(n.uv) - 1.8));
    return vec4(vec3(1.0, 0.5, 0.0) * ring, ring);
}
`;

/** The body of a shader a page registers. */
const HEAT = `vec4 shade(NodeInput n) {
    float lit = 0.4 + 0.6 * max(dot(n.normal, lightDir), 0.0);
    return vec4(hot * lit, 1.0);
}`;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }

    clearRegisteredShadersForTesting();
});

/**
 * A mounted element drawing in 2D, one node at the origin, one layer over every node.
 * @param set - What the layer sets.
 * @returns The element and the layer's id.
 */
async function mounted(
    set: LayerSpec["set"] = { "node.color": "#3366cc" },
): Promise<{ element: Graphty; layer: string }> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    element.shaderSettings = { quality: "high" };
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    const layer = await element.session.styles.add({
        name: "Shaded",
        target: "node",
        selector: { match: "everything" },
        set,
    });
    await operationQueueOf(element.graph).waitForCompletion();
    return { element, layer: layer.id };
}

/**
 * Count the thumbnails an element's engine draws from now on.
 * @param element - The element.
 * @returns The count so far, read live.
 */
function countDrawings(element: Graphty): { readonly count: number } {
    const host = shadersControllerOf(element.session)?.host;
    assert.ok(host, "the element lent its session a shader host");
    const counter = { count: 0 };
    const draw = host.thumbnail.bind(host);
    host.thumbnail = (shader, params, time) => {
        counter.count++;
        return draw(shader, params, time);
    };
    return counter;
}

/**
 * The colors of a picture, as RGBA bytes.
 * @param picture - The picture.
 * @returns The bytes.
 */
async function pixelsOf(picture: Blob): Promise<Uint8ClampedArray> {
    const bitmap = await createImageBitmap(picture);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
}

describe("thumbnails, for every origin", () => {
    it("draws a pasted effect with no picture around a gray node, once, then serves it from the cache", async () => {
        const { element } = await mounted();
        const added = await element.session.shaders.add(RING);
        assert.isTrue(added.ok, JSON.stringify(added));
        const drawings = countDrawings(element);

        const first = await element.session.shaders.thumbnail("user/ring");
        assert.instanceOf(first, Blob);
        const pixels = await pixelsOf(first);
        let orange = 0;
        let gray = 0;
        for (let at = 0; at < pixels.length; at += 4) {
            const [r, g, b, a] = [pixels[at], pixels[at + 1], pixels[at + 2], pixels[at + 3]];
            orange += a > 128 && r > 200 && g > 60 && g < 200 && b < 60 ? 1 : 0;
            gray += a > 250 && Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && r > 60 && r < 200 ? 1 : 0;
        }

        assert.isAbove(orange, 300, "the ring is drawn");
        assert.isAbove(gray, 300, "the stand-in node is drawn inside it");

        const again = await element.session.shaders.thumbnail("user/ring");
        assert.strictEqual(again, first);
        assert.strictEqual(drawings.count, 1, "the second call drew nothing");
    });

    it("returns a preset's own picture, drawing nothing", async () => {
        const { element } = await mounted();
        const drawings = countDrawings(element);
        const picture = await element.session.shaders.thumbnail("pearl");
        assert.instanceOf(picture, Blob);
        assert.strictEqual(picture.type, "image/webp");
        assert.isAbove(picture.size, 100);
        assert.strictEqual(drawings.count, 0);
    });

    it("answers a held shader with shader.held, and never draws it", async () => {
        const { element } = await mounted();
        await element.session.shaders.add(RING, { source: "content" });
        const drawings = countDrawings(element);
        assert.deepEqual(await element.session.shaders.thumbnail("user/ring"), {
            code: "shader.held",
            params: { id: "user/ring" },
        });
        assert.strictEqual(drawings.count, 0);
    });
});

describe("saving a registered shader with the look", () => {
    it("embeds its text, holds it on a page without it, and draws the page's own where it is", async () => {
        defineShader({ id: "parity/heat", params: { hot: "#ff5500" }, glsl: HEAT });
        const { element } = await mounted({ "node.shaders": [{ shader: "parity/heat" }] });
        const saved = element.session.styles.toDocument();
        const carried = saved.shaders?.find((entry) => entry.id === "parity/heat");
        assert.ok(carried, "the document carries the registered shader");
        assert.include(carried.text, "hot * lit");

        // A page that never registered it: the text arrives as content, held.
        clearRegisteredShadersForTesting();
        const elsewhere = await mounted();
        await elsewhere.element.session.styles.applyTemplate(saved);
        assert.deepEqual(
            elsewhere.element.session.shaders.list().map((shader) => [shader.id, shader.state]),
            [["parity/heat", "held"]],
        );

        // A page that registered it: its own body draws, and nothing joins the project.
        defineShader({ id: "parity/heat", params: { hot: "#ff5500" }, glsl: HEAT });
        const here = await mounted();
        await here.element.session.styles.applyTemplate(saved);
        assert.lengthOf(here.element.session.shaders.list(), 0);
        assert.notStrictEqual(here.element.session.shaders.status("parity/heat").state, "held");
    });
});

describe("the flashing check, for every origin", () => {
    it("freezes a registered effect that flashes 10 times a second, with shader.flashing", async () => {
        defineShader({
            id: "parity/strobe",
            place: "around",
            reach: 4,
            motion: "loop",
            glsl: "vec4 shade(NodeInput n) { float on = step(0.5, fract(n.time * 10.0)); return vec4(vec3(on), 1.0); }",
        });
        const { element } = await mounted({ "node.size": 6, "node.shaders": [{ shader: "parity/strobe" }] });
        const scene = element.graph.getScene();
        const frozen = (): boolean => element.session.shaders.status("parity/strobe").state === "still";
        for (let i = 0; i < 900 && !frozen(); i++) {
            await drawnFrames(scene, 1);
        }

        assert.deepEqual(element.session.shaders.status("parity/strobe"), {
            state: "still",
            problem: { code: "shader.flashing", params: { id: "parity/strobe" } },
        });
    });
});
