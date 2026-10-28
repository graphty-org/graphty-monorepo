/**
 * @file The shader runtime in a real element: pasted shaders compile in the element's own engine,
 * a broken one leaves the picture as it was and lets the render loop rest, held shaders draw only
 * after `approve`, the crash marker and quarantine hold what could take the page down, and a graph
 * that names no shader draws exactly what it drew before (design/rendering/shader-styles.md,
 * package E2).
 *
 * The context-loss tests dispatch the canvas's own `webglcontextlost` event, which is what Babylon
 * and the element listen to (Chromium in the test runner gives no context back after
 * `WEBGL_lose_context.loseContext()`; see test/browser/context-loss.test.ts).
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import type { LayerSpec, StyleDocument } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import type { RenderManager } from "../../../src/managers/RenderManager";
import { shadersControllerOf } from "../../../src/session/shaders";
import type { LazyShaderHost } from "../../../src/shaders/chunk";
import { CRASH_MARKER_KEY } from "../../../src/shaders/crashMarker";
import { sha256Hex } from "../../../src/utils/sha256";

const WIDTH = 320;
const HEIGHT = 240;

/** A node surface that compiles, still. */
const TINT = `/* graphty-shader 1
{
    "id": "user/tint",
    "name": "Tint",
    "place": "paint",
    "params": [{ "name": "amount", "type": "number", "default": 0.5, "min": 0, "max": 1 }]
}
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb * amount, n.color.a);
}
`;

/** Passes the static checks and fails to compile: a vec3 returned for a vec4, on line 10. */
const BROKEN = TINT.replace("user/tint", "user/broken").replace(
    "return vec4(n.color.rgb * amount, n.color.a);",
    "return n.color.rgb * amount;",
);

const MARBLES: LayerSpec = {
    name: "Marbles",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#3366cc" },
};

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }

    try {
        localStorage.removeItem(CRASH_MARKER_KEY);
    } catch {
        // no storage
    }
});

/**
 * A mounted element drawing on demand, two nodes at fixed places, drawn and final.
 * @param before - Called on the element before it holds data.
 * @returns The element and the id of a node layer.
 */
async function mounted(before?: (element: Graphty) => void): Promise<{ element: Graphty; layer: string }> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    before?.(element);
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -3, y: 0, z: 0 } },
        { id: "b", position: { x: 3, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    const layer = await element.session.styles.add(MARBLES);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return { element, layer: layer.id };
}

/**
 * The render loop's tick counts.
 * @param element - The element.
 * @returns The counts, live.
 */
function ticks(element: Graphty): { readonly drawn: number; readonly rested: number } {
    return (element.graph as unknown as { renderManager: RenderManager }).renderManager.ticks;
}

/**
 * Wait until the loop has rested on 20 of its chances to draw in a row.
 * @param element - The element.
 * @returns How many frames it drew on the way.
 */
async function untilResting(element: Graphty): Promise<number> {
    const counts = ticks(element);
    const first = counts.drawn;
    let lastDraw = counts.drawn;
    let restedSince = counts.rested;
    while (counts.rested - restedSince < 20) {
        assert.isBelow(counts.drawn - first, 600, "the loop never came to rest");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (counts.drawn !== lastDraw) {
            lastDraw = counts.drawn;
            restedSince = counts.rested;
        }
    }

    return counts.drawn - first;
}

/**
 * The element's shader host.
 * @param element - The element.
 * @returns The host.
 */
function hostOf(element: Graphty): LazyShaderHost {
    const host = shadersControllerOf(element.session)?.host as LazyShaderHost | null | undefined;
    assert.ok(host);
    return host;
}

/**
 * The pixels of a fresh frame of the element.
 * @param element - The element.
 * @returns The RGBA bytes.
 */
async function frame(element: Graphty): Promise<Uint8Array> {
    const { engine, scene } = element.graph;
    scene.render();
    const read = await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight(), true, false);
    return new Uint8Array(read.buffer.slice(read.byteOffset, read.byteOffset + read.byteLength));
}

/**
 * A style document carrying TINT and a layer drawing it.
 * @param extra - Members a file might carry beside them.
 * @returns The document.
 */
function tintDocument(extra: Record<string, unknown> = {}): StyleDocument {
    return {
        version: 1,
        layers: [{ ...MARBLES, name: "Tinted", set: { "node.shaders": [{ shader: "user/tint" }] } }],
        shaders: [{ id: "user/tint", text: TINT }],
        ...extra,
    };
}

/**
 * Pretend the page went to the background (or came back), as the browser announces it.
 * @param state - The visibility.
 * @returns Puts the real visibility back.
 */
function setVisibility(state: "hidden" | "visible"): () => void {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    document.dispatchEvent(new Event("visibilitychange"));
    return () => {
        delete (document as { visibilityState?: string }).visibilityState;
    };
}

/**
 * Lose and give back the element's context, by its canvas's own events, and wait for Babylon to
 * finish rebuilding (it does so on a timer, which must not run after the graph is disposed).
 * @param element - The element.
 */
async function loseContext(element: Graphty): Promise<void> {
    const { engine } = element.graph;
    const canvas = engine.getRenderingCanvas();
    assert.ok(canvas);
    const restored = new Promise((resolve) => {
        engine.onContextRestoredObservable.addOnce(resolve);
    });
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    await restored;
}

describe("shaders in the element's engine", () => {
    it("loads no shader runtime for a graph that names no shader", async () => {
        const { element } = await mounted();
        await frame(element);
        assert.isNull(hostOf(element).loaded);
    });

    it("draws the same frame with the runtime loaded and a shader compiled but drawn nowhere", async () => {
        const { element } = await mounted();
        const before = await frame(element);
        const added = await element.session.shaders.add(TINT);
        assert.isTrue(added.ok, JSON.stringify(added));
        assert.isNotNull(hostOf(element).loaded);
        const after = await frame(element);
        assert.strictEqual(after.length, before.length);
        let differing = 0;
        for (let i = 0; i < before.length; i++) {
            if (before[i] !== after[i]) {
                differing++;
            }
        }

        assert.strictEqual(differing, 0, "the test frame left state behind that changed the picture");
    });

    it("compiles a pasted shader, and is ready", async () => {
        const { element, layer } = await mounted();
        const added = await element.session.shaders.add(TINT, { apply: { layer } });
        assert.isTrue(added.ok, JSON.stringify(added));
        assert.strictEqual(element.session.shaders.status("user/tint").state, "ready");
        const thumbnail = await element.session.shaders.thumbnail("user/tint");
        assert.instanceOf(thumbnail, Blob);
        assert.strictEqual(thumbnail.type, "image/png");
        assert.isAbove(thumbnail.size, 100);
    });

    it("leaves a broken shader off the picture, reports its line, and lets the loop rest within 2 frames", async () => {
        const { element, layer } = await mounted();
        const before = await frame(element);
        await untilResting(element);
        const added = await element.session.shaders.add(BROKEN, { apply: { layer } });
        assert.isFalse(added.ok);
        if (!added.ok) {
            assert.strictEqual(added.problems[0].code, "shader.compile");
            assert.strictEqual(added.problems[0].params.line, 10);
        }

        assert.isUndefined(element.session.styles.get(layer)?.set?.["node.shaders"]);
        assert.lengthOf(element.session.shaders.list(), 0);
        assert.isTrue(element.graph.engine.areAllEffectsReady(), "the failed effect is still in the engine");
        const drawn = await untilResting(element);
        assert.isAtMost(drawn, 2);
        assert.deepEqual(await frame(element), before, "the shape is drawn as before");
    });

    it("rests with only still shaders", async () => {
        const { element, layer } = await mounted();
        const added = await element.session.shaders.add(TINT, { apply: { layer } });
        assert.isTrue(added.ok);
        await untilResting(element);
        const drawn = await untilResting(element);
        assert.strictEqual(drawn, 0);
    });

    it("opens a style file's shader held, and draws it after approve", async () => {
        const { element } = await mounted();
        const held: (readonly string[])[] = [];
        element.addEventListener("graphty-shader-held", (event) => {
            held.push((event as CustomEvent<{ ids: readonly string[] }>).detail.ids);
        });
        await element.session.styles.applyTemplate(tintDocument());
        assert.strictEqual(element.session.shaders.status("user/tint").state, "held");
        assert.deepEqual(held, [["user/tint"]]);
        assert.isNull(hostOf(element).loaded, "nothing of a held shader is compiled");

        const approved = await element.session.shaders.approve("user/tint");
        assert.isTrue(approved.ok);
        assert.strictEqual(element.session.shaders.status("user/tint").state, "ready");
    });

    it("still holds a file's shader when the file carries untrusted: run", async () => {
        const { element } = await mounted();
        await element.session.styles.applyTemplate(tintDocument({ shaderSettings: { untrusted: "run" } }));
        assert.strictEqual(element.session.shaders.status("user/tint").state, "held");
    });

    it("writes the crash marker before it compiles, and holds a marked hash on the next load", async () => {
        const hash = sha256Hex(TINT);
        const written: string[] = [];
        const { setItem } = Storage.prototype;
        Storage.prototype.setItem = function (key: string, value: string): void {
            if (key === CRASH_MARKER_KEY) {
                written.push(value);
            }

            setItem.call(this, key, value);
        };
        cleanups.push(() => {
            Storage.prototype.setItem = setItem;
        });
        const first = await mounted();
        await first.element.session.shaders.add(TINT);
        assert.isTrue(
            written.some((value) => value.includes(hash)),
            "the marker named the shader before it compiled",
        );

        // The page "died" while the shader drew: its hash is still in the marker on the next load.
        localStorage.setItem(CRASH_MARKER_KEY, JSON.stringify([hash]));
        const next = await mounted((element) => {
            element.shaderSettings = { trustedHashes: [hash] };
        });
        await next.element.session.styles.applyTemplate(tintDocument());
        assert.strictEqual(next.element.session.shaders.status("user/tint").state, "held");
    });

    it("quarantines nothing when the context is lost in a hidden tab", async () => {
        const { element } = await mounted();
        await element.session.shaders.add(TINT);
        const restore = setVisibility("hidden");
        cleanups.push(restore);
        await loseContext(element);
        assert.notStrictEqual(element.session.shaders.status("user/tint").state, "off");
    });

    it("quarantines a pasted shader drawn when the context is lost in a visible page", async () => {
        const { element } = await mounted();
        await element.session.shaders.add(TINT);
        await loseContext(element);
        assert.deepEqual(element.session.shaders.status("user/tint"), {
            state: "off",
            problem: { code: "shader.quarantined", params: { id: "user/tint" } },
        });
    });

    it("undoes an add with apply in one step", async () => {
        const { element, layer } = await mounted();
        await element.session.shaders.add(TINT, { apply: { layer } });
        assert.deepEqual(element.session.styles.get(layer)?.set?.["node.shaders"], [{ shader: "user/tint" }]);
        await element.session.undo();
        assert.lengthOf(element.session.shaders.list(), 0);
        assert.isUndefined(element.session.styles.get(layer)?.set?.["node.shaders"]);
    });
});
