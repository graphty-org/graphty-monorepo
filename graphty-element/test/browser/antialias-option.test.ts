/**
 * @file The `antialias` option: read once, when the element builds its engine, from the attribute
 * wherever it sits in the tag or from the property set before anything else reached the element.
 * `false` creates the WebGL context without multisampling and changes nothing else about it; a
 * later change keeps the engine as it is and says so with `W_ANTIALIAS_LATE`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { CodedFact } from "../../src/session/shared";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Puts an element in the page and waits for its first update.
 * @param element - The element.
 * @returns The element.
 */
async function mount(element: Graphty): Promise<Graphty> {
    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    if (!element.isConnected) {
        document.body.appendChild(element);
    }
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    return element;
}

/**
 * The attributes of the WebGL context the element draws with.
 * @param element - The element.
 * @returns The context's attributes.
 */
function contextOf(element: Graphty): WebGLContextAttributes {
    const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
    // Asking a canvas for the type of context it already holds returns that context.
    const attributes = canvas?.getContext("webgl2")?.getContextAttributes();
    if (attributes === undefined || attributes === null) {
        throw new Error("the element holds no WebGL2 context");
    }

    return attributes;
}

describe("antialias", () => {
    it("is on by default, as the engine has always been built", async () => {
        const element = await mount(document.createElement("graphty-element"));
        assert.isTrue(element.antialias);
        assert.isTrue(contextOf(element).antialias);
        assert.isTrue(contextOf(element).preserveDrawingBuffer);
    });

    it("is read from the attribute even when it comes last in the tag", async () => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        cleanups.push(() => {
            host.remove();
        });
        // view-mode and render-path each reach the element, and so build its engine, before the
        // antialias attribute's own callback runs.
        host.innerHTML = '<graphty-element view-mode="2d" render-path="batched" antialias="false"></graphty-element>';
        const element = host.querySelector("graphty-element") as Graphty;
        const warnings: CodedFact[] = [];
        element.addEventListener("graphty-warning", (event) => warnings.push(event.detail));
        await mount(element);

        assert.isFalse(element.antialias);
        assert.isFalse(contextOf(element).antialias);
        assert.isTrue(contextOf(element).preserveDrawingBuffer, "only multisampling changes");
        assert.strictEqual(element.viewMode, "2d");
        assert.strictEqual(element.renderPath, "batched");
        assert.deepEqual(warnings, []);
    });

    it("is read from the property set before the element is in the page", async () => {
        const element: Graphty = document.createElement("graphty-element");
        element.antialias = false;
        element.viewMode = "2d";
        await mount(element);

        assert.isFalse(element.antialias);
        assert.isFalse(contextOf(element).antialias);
    });

    it("keeps the engine as built when changed later, and says so", async () => {
        const element = await mount(document.createElement("graphty-element"));
        const warnings: CodedFact[] = [];
        element.addEventListener("graphty-warning", (event) => warnings.push(event.detail));

        element.antialias = true;
        assert.deepEqual(warnings, [], "the value it already has is no change");

        element.antialias = false;
        assert.isTrue(element.antialias);
        assert.isTrue(contextOf(element).antialias);
        assert.deepEqual(warnings, [{ code: "W_ANTIALIAS_LATE", params: { requested: false, active: true } }]);

        element.setAttribute("antialias", "false");
        assert.strictEqual(warnings.length, 2, "an attribute set later is a later change too");
    });
});

describe("preserveDrawingBuffer", () => {
    it("is read from the attribute even when it comes last in the tag", async () => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        cleanups.push(() => {
            host.remove();
        });
        host.innerHTML = '<graphty-element view-mode="2d" preserve-drawing-buffer="false"></graphty-element>';
        const element = host.querySelector("graphty-element") as Graphty;
        await mount(element);

        assert.isFalse(element.preserveDrawingBuffer);
        assert.isFalse(contextOf(element).preserveDrawingBuffer);
        assert.isTrue(contextOf(element).antialias, "only the drawing buffer changes");
    });

    it("is read from the property set before the element is in the page", async () => {
        const element: Graphty = document.createElement("graphty-element");
        element.preserveDrawingBuffer = false;
        await mount(element);

        assert.isFalse(element.preserveDrawingBuffer);
        assert.isFalse(contextOf(element).preserveDrawingBuffer);
    });

    it("keeps the engine as built when changed later, and says so", async () => {
        const element = await mount(document.createElement("graphty-element"));
        const warnings: CodedFact[] = [];
        element.addEventListener("graphty-warning", (event) => warnings.push(event.detail));

        element.preserveDrawingBuffer = true;
        assert.deepEqual(warnings, [], "the value it already has is no change");

        element.preserveDrawingBuffer = false;
        assert.isTrue(element.preserveDrawingBuffer);
        assert.isTrue(contextOf(element).preserveDrawingBuffer);
        assert.deepEqual(warnings, [
            { code: "W_PRESERVE_DRAWING_BUFFER_LATE", params: { requested: false, active: true } },
        ]);
    });
});
