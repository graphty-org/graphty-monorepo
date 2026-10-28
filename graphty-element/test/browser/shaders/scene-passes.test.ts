/**
 * @file The scene-level shaders drawn on a real graph (design/rendering/shader-styles.md, package
 * E6): a background shader is drawn behind every node and never over a label, and drawn again
 * only when it moves or the camera does; two group outlines draw nested outlines; group outlines
 * follow a running force layout; a real click on an outline reports its layer and group; the
 * shared bloom is allocated once while a layer names a bloom shader, on screen or not.
 */

import "../../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import type { RenderManager } from "../../../src/managers/RenderManager";
import { BACKGROUND_LAYER } from "../../../src/meshes/BackgroundPass";
import { BLOOM_LAYER } from "../../../src/meshes/BloomPass";
import { OUTLINE_LAYER } from "../../../src/meshes/GroupOutlinePass";
import type { GroupOutlineClick } from "../../../src/session/types";
import { defineShader } from "../../../src/simple/defineShader";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, type Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({
        id: "e6/sky",
        glsl: "vec4 shade(BackgroundInput b) { return vec4(0.0, 0.0, 1.0, 1.0); }",
    });
    defineShader({
        id: "e6/drift",
        motion: { loop: { speedParam: "drift" } },
        params: { drift: { type: "number", default: 0, min: 0, max: 2 } },
        glsl: "vec4 shade(BackgroundInput b) { return vec4(0.0, 0.0, 0.5 + 0.5 * sin(b.time * drift), 1.0); }",
    });
    // An outline where the field crosses 0.5: red on the lowest group outline, blue above it.
    defineShader({
        id: "e6/outline",
        reach: 5,
        glsl: `vec4 shade(GroupInput g) {
            float sd = (0.5 - g.field) / max(length(g.fieldGradient), 1e-4);
            float a = 1.0 - smoothstep(1.5, 3.0, abs(sd));
            vec3 c = g.depth < 0.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
            return vec4(c * a, a);
        }`,
    });
    defineShader({
        id: "e6/tinted",
        glsl: "vec4 shade(BackgroundInput b) { return vec4(b.groupTint.rgb, 1.0); }",
    });
    defineShader({
        id: "e6/lantern",
        bloom: true,
        glsl: "vec4 shade(NodeInput n) { return vec4(1.0, 0.8, 0.3, 1.0); }",
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

/**
 * A mounted element with nodes at fixed places in the 2D view.
 * @param nodes - The nodes, with any data.
 * @param layers - Layers added after the data.
 * @param layout - The layout; "fixed" keeps the places given.
 * @returns The element.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number; [key: string]: unknown }[],
    layers: readonly LayerSpec[],
    layout: "fixed" | "ngraph" = "fixed",
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(
        nodes.map(({ id, x, y, ...data }) => ({ id, ...data, position: { x, y, z: 0 } })),
    );
    await element.graph.setLayout(layout, { dim: 2 });
    await element.setViewMode("2d");
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.waitForStableFrame();
    return element;
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean): Promise<void> {
    const scene = element.graph.getScene();
    for (let i = 0; i < 600 && !holds(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(holds(), what);
}

/**
 * The canvas pixel at a point, after the next frames.
 * @param element - The element.
 * @param point - CSS pixels from the element's top-left corner.
 * @returns r, g, b, a.
 */
async function pixelAt(element: Graphty, point: Point): Promise<number[]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const scale = engine.getRenderWidth() / WIDTH;
    const read = (await engine.readPixels(
        Math.round(point.x * scale),
        engine.getRenderHeight() - Math.round(point.y * scale) - 1,
        1,
        1,
    )) as unknown as Uint8Array;
    return [read[0], read[1], read[2], read[3]];
}

/**
 * Whether a color is mostly one channel.
 * @param pixel - The pixel.
 * @param channel - 0 red, 1 green, 2 blue.
 * @returns True when that channel leads the others by a margin.
 */
function leads(pixel: readonly number[], channel: number): boolean {
    return [0, 1, 2].every((other) => other === channel || pixel[channel] > pixel[other] + 60);
}

/**
 * The element's render manager, which holds the scene passes.
 * @param element - The element.
 * @returns The render manager.
 */
function renderManagerOf(element: Graphty): RenderManager {
    return (element.graph as unknown as { renderManager: RenderManager }).renderManager;
}

/**
 * A layer's id by its name.
 * @param element - The element.
 * @param name - The layer's name.
 * @returns Its id.
 */
function idOf(element: Graphty, name: string): string {
    const layer = element.session.styles.list().find((each) => each.name === name);
    assert.isDefined(layer, `a layer named ${name}`);
    return layer?.id ?? "";
}

/**
 * Where a world point is on the element.
 * @param element - The element.
 * @param x - World x.
 * @param y - World y.
 * @returns CSS pixels from the element's top-left corner.
 */
function screen(element: Graphty, x: number, y: number): Point {
    return element.worldToScreen({ x, y, z: 0 });
}

describe("a background shader", () => {
    it("draws behind every node and under a label", async () => {
        const element = await mounted(
            [
                { id: "plain", x: -4, y: 0 },
                { id: "labelled", x: 4, y: 0 },
            ],
            [
                {
                    name: "Red",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": "#FF0000", "node.size": 2 },
                },
                {
                    name: "Label",
                    target: "node",
                    selector: { match: "ids", nodes: ["labelled"] },
                    set: {
                        "node.label": "W",
                        "node.labelStyle": { sizePx: 24, background: "#00FF00", color: "#00FF00", location: "center" },
                    },
                },
            ],
        );
        const renderManager = renderManagerOf(element);
        element.background = { backgroundType: "color", color: "#000000", shader: { id: "e6/sky" } };
        await until(
            element,
            "the background shader draws",
            () => renderManager.shaderPasses().background?.shown === true,
        );

        const scene = element.graph.getScene();
        assert.strictEqual(scene.layers[0]?.name, BACKGROUND_LAYER, "it is the first background layer");
        assert.isTrue(scene.layers[0]?.isBackground, "drawn before anything the scene draws");
        const empty = await pixelAt(element, { x: 6, y: 6 });
        assert.isTrue(leads(empty, 2), `the empty canvas is the shader's blue, not ${empty.join(",")}`);
        assert.isTrue(leads(await pixelAt(element, screen(element, -4, 0)), 0), "a node is drawn over it");
        const label = screen(element, 4, 0);
        const around: number[][] = [];
        for (let dx = -3; dx <= 3; dx += 3) {
            for (let dy = -3; dy <= 3; dy += 3) {
                around.push(await pixelAt(element, { x: label.x + dx, y: label.y + dy }));
            }
        }

        assert.isTrue(
            around.some((pixel) => leads(pixel, 1)),
            "the label's green panel is drawn over it",
        );
        assert.isFalse(
            around.some((pixel) => leads(pixel, 2)),
            "and the shader draws nowhere on the labelled node",
        );

        element.background = { backgroundType: "color", color: "#00FF00" };
        await until(
            element,
            "a color background takes the shader away",
            () => renderManager.shaderPasses().background === null,
        );
        assert.isTrue(leads(await pixelAt(element, { x: 6, y: 6 }), 1), "the color shows");
    });

    it("is drawn again only when it moves or the camera does", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], []);
        element.background = { backgroundType: "color", shader: { id: "e6/drift", params: { drift: 0 } } };
        const renderManager = renderManagerOf(element);
        const scene = element.graph.getScene();
        await until(element, "the background draws", () => (renderManager.shaderPasses().background?.draws ?? 0) > 0);
        await drawnFrames(scene, 2);
        const pass = renderManager.shaderPasses().background;
        assert.isNotNull(pass);
        const still = pass?.draws ?? 0;

        // Frames forced by something else: a still background on a still camera is not drawn again.
        await element.session.styles.add({
            name: "Grow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 3 },
        });
        await element.graph.waitForStableFrame();
        await drawnFrames(scene, 4);
        assert.strictEqual(pass?.draws, still, "no draw while nothing it reads changed");

        await element.graph.setCameraState({ zoom: 2 });
        await element.graph.waitForStableFrame();
        await drawnFrames(scene, 2);
        assert.isAbove(pass?.draws ?? 0, still, "a camera move draws it again");
    });
});

describe("group outlines", () => {
    const nodes = [
        { id: "a", x: -3, y: 0, group: 1, inner: true },
        { id: "b", x: 0, y: 0, group: 1 },
        { id: "c", x: 3, y: 0, group: 1 },
        // Outside every group outline, so the camera frames the outlines too.
        { id: "far-left", x: -9, y: 4 },
        { id: "far-right", x: 9, y: -4 },
    ];
    const outer: LayerSpec = {
        name: "Outer",
        set: { "node.shaders": [{ shader: "e6/outline" }] },
        target: "node",
        selector: { match: "has", path: "data.group" },
    };
    const inner: LayerSpec = {
        name: "Inner",
        set: { "node.shaders": [{ shader: "e6/outline", groupBy: "data.inner" }] },
        target: "node",
        selector: { match: "has", path: "data.inner" },
    };

    it("draw nested outlines for two group outlines", async () => {
        const element = await mounted(nodes, [
            { name: "Small", target: "node", selector: { match: "everything" }, set: { "node.size": 1 } },
            outer,
            inner,
        ]);
        const renderManager = renderManagerOf(element);
        await until(
            element,
            "both layers draw",
            () => (renderManager.shaderPasses().outline?.drawn().length ?? 0) === 2,
        );
        const drawn = renderManager.shaderPasses().outline?.drawn() ?? [];
        assert.deepEqual(
            drawn.map(({ depth, groups }) => ({ depth, groups })),
            [
                { depth: 0, groups: [null] },
                { depth: 1, groups: [true] },
            ],
        );
        assert.strictEqual(element.graph.getScene().layers[0]?.name, OUTLINE_LAYER);

        // Walking left from node a: the inner (blue) outline is met before the outer (red) one.
        const start = screen(element, -3, 0);
        let blueAt = -1;
        let redAt = -1;
        for (let step = 1; step < start.x - 1 && (blueAt < 0 || redAt < 0); step++) {
            const pixel = await pixelAt(element, { x: start.x - step, y: start.y });
            if (blueAt < 0 && leads(pixel, 2)) {
                blueAt = step;
            }

            if (redAt < 0 && leads(pixel, 0)) {
                redAt = step;
            }
        }

        assert.isAbove(blueAt, 0, "the inner outline draws");
        assert.isAbove(redAt, blueAt, "the outer outline rings the inner one");
    });

    it("tint a background by the outlines laid out after it drew", async () => {
        const element = await mounted(nodes, []);
        element.background = { backgroundType: "color", shader: { id: "e6/tinted" } };
        const renderManager = renderManagerOf(element);
        await until(element, "the background draws", () => (renderManager.shaderPasses().background?.draws ?? 0) > 0);

        // The outline pass starts after the background's, so it lays the groups out after the
        // background drew in the same frame; nothing but the background then needs a frame.
        const untinted = renderManager.shaderPasses().background?.draws ?? 0;
        await element.session.styles.add(outer);
        await until(
            element,
            "the outline is laid out",
            () => renderManager.shaderPasses().outline?.tints(4).length === 1,
        );
        await element.graph.waitForStableFrame();
        const { background } = renderManager.shaderPasses();
        assert.isAbove(background?.draws ?? 0, untinted, "the background is drawn again with the outline's tint");
        assert.isFalse(background?.owesDraw, "and owes no draw once the frame is stable");
    });

    it("hold the stable frame until the outline and background shaders are drawn", async () => {
        // The outline pass and the background load, resolve and compile after the graph is
        // otherwise drawn; a stable frame before that has no outline and no tint (issue #4243).
        const element = await mounted(nodes, [outer]);
        element.background = { backgroundType: "color", shader: { id: "e6/tinted" } };
        await element.graph.waitForStableFrame();
        const renderManager = renderManagerOf(element);
        const { outline, background } = renderManager.shaderPasses();
        assert.lengthOf(outline?.tints(4) ?? [], 1, "the outline is laid out in the stable frame");
        assert.isFalse(renderManager.shaderPicturePending(), "no shader picture is on its way once it is stable");
        assert.isAbove(background?.draws ?? 0, 0, "the background is drawn in the stable frame");
        assert.isFalse(background?.owesDraw, "and drawn with the outline's tint");
    });

    it("follow a running force layout", async () => {
        const element = await mounted(nodes, [outer]);
        const renderManager = renderManagerOf(element);
        const scene = element.graph.getScene();
        await until(
            element,
            "the group outline draws",
            () => (renderManager.shaderPasses().outline?.drawn().length ?? 0) === 1,
        );
        const pass = renderManager.shaderPasses().outline;
        const layer = idOf(element, "Outer");
        const node = element.graph.getDataManager().nodes.get("a");
        // Not awaited: the layout's run is what the loop below watches.
        const running = element.graph.setLayout("ngraph", { dim: 2 });

        // While the layout moves the nodes, each frame's group outline is laid out from that frame's places.
        let moved = 0;
        let before = node?.getPosition().x;
        for (let frame = 0; frame < 300 && moved < 3; frame++) {
            await drawnFrames(scene, 1);
            const at = node?.getPosition() ?? { x: 0, y: 0 };
            if (at.x === before) {
                continue;
            }

            moved++;
            before = at.x;
            const point = screen(element, at.x, at.y);
            assert.deepEqual(
                pass?.pick(point.x, point.y),
                { layer, shader: "e6/outline", group: null },
                "node a stays inside its group outline",
            );
        }

        await running;
        assert.isAtLeast(moved, 3, "the layout moved the nodes");
    });

    it("report a real click on an outline as its layer and group", async () => {
        const element = await mounted(nodes, [outer, inner]);
        const renderManager = renderManagerOf(element);
        await until(
            element,
            "both layers draw",
            () => (renderManager.shaderPasses().outline?.drawn().length ?? 0) === 2,
        );
        const clicks: GroupOutlineClick[] = [];
        cleanups.push(element.session.on("canvas:group-outline-click", (detail) => clicks.push(detail)));

        // Between nodes b and c, on no node and no edge: inside the outer group outline only.
        const between = screen(element, 1.5, 0.8);
        assert.isNull(element.elementAt(between), "nothing else is there");
        assert.deepEqual(element.groupOutlineAt(between), {
            kind: "group-outline",
            layer: idOf(element, "Outer"),
            shader: "e6/outline",
            group: null,
        });
        await click(element, between);
        await until(element, "the click is reported", () => clicks.length > 0);
        assert.deepEqual(clicks, [{ layer: idOf(element, "Outer"), shader: "e6/outline", group: null }]);

        // Beside node a, inside both: the topmost group outline answers.
        const beside = screen(element, -3, 1);
        assert.deepEqual(element.groupOutlineAt(beside), {
            kind: "group-outline",
            layer: idOf(element, "Inner"),
            shader: "e6/outline",
            group: true,
        });
        assert.isNull(element.groupOutlineAt({ x: 4, y: 4 }), "the far corner is outside every group outline");
    });
});

describe("the shared bloom", () => {
    it("is allocated once while a layer names a bloom shader, on screen or not", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], []);
        const renderManager = renderManagerOf(element);
        const scene = element.graph.getScene();
        const blooms = (): number => scene.effectLayers.filter((layer) => layer.name === BLOOM_LAYER).length;
        assert.isNull(renderManager.shaderPasses().bloom, "no bloom before a layer names one");

        // A lantern layer that matches no node: nothing glows on screen, the pass is allocated.
        const first = await element.session.styles.add({
            name: "Lanterns",
            target: "node",
            selector: { match: "ids", nodes: ["missing"] },
            set: { "node.shaders": [{ shader: "e6/lantern" }] },
        });
        await until(element, "the bloom is allocated", () => renderManager.shaderPasses().bloom !== null);
        const pass = renderManager.shaderPasses().bloom;
        assert.strictEqual(blooms(), 1);

        const second = await element.session.styles.add({
            name: "More lanterns",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "e6/lantern" }] },
        });
        await element.graph.waitForStableFrame();
        await drawnFrames(scene, 2);
        assert.strictEqual(renderManager.shaderPasses().bloom, pass, "the same pass");
        assert.strictEqual(blooms(), 1, "one glow layer");

        await element.session.styles.remove(second.id);
        await element.session.styles.remove(first.id);
        await until(element, "the bloom is released", () => renderManager.shaderPasses().bloom === null);
        assert.strictEqual(blooms(), 0);
    });
});
