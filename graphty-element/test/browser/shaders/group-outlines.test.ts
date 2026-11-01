/**
 * @file Group outlines enclose their whole group (design/rendering/shader-studio/decisions.md
 * section 5.5), read from the field the GPU drew: on Karate club and Les Miserables, with one Hull
 * layer per Louvain community, every member's center lies inside its group's outline and each
 * outline is one connected region; a lone far member is inside its group's outline; twelve
 * community layers naming one shader draw twelve outlines at one level, with no cap reported.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { shaderDescriptor } from "../../../src/catalog/shaderRegistry";
import { operationQueueOf } from "../../../src/Graph";
import type { RenderManager } from "../../../src/managers/RenderManager";
import type { GroupOutlinePass } from "../../../src/meshes/GroupOutlinePass";
import { presetId } from "../../../stories/shaders/scenePresets";
import lesMiserablesGexf from "../../helpers/corpus/gexf/lesmiserables.gexf?raw";
import karateGml from "../../helpers/corpus/gml/karate.gml?raw";
import { drawnFrames } from "../../helpers/drawn-frames";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const HULL = presetId("metaball-hull");

/**
 * A mounted element in the 2D view.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "480px";
    element.style.height = "360px";
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.setViewMode("2d");
    return element;
}

/**
 * The element's group outline pass, once it exists.
 * @param element - The element.
 * @returns The pass, or null.
 */
function passOf(element: Graphty): GroupOutlinePass | null {
    return (element.graph as unknown as { renderManager: RenderManager }).renderManager.shaderPasses().outline;
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

/** What a group's field holds against its outline. */
interface Enclosure {
    /** Members whose center is outside the outline. */
    readonly outside: number;
    /** How many connected regions the outline holds. */
    readonly regions: number;
    /** Members whose center is in a region other than the first member's. */
    readonly apart: number;
}

/**
 * Read a group's field and measure its outline: the texels at or above the level are inside.
 * @param pass - The group outline pass.
 * @param layer - The layer.
 * @param level - The outline's level (the hull's threshold).
 * @returns The measure.
 */
async function enclosure(pass: GroupOutlinePass, layer: string, level: number): Promise<Enclosure> {
    const field = await pass.fieldOf(layer, null);
    assert.isNotNull(field, `layer ${layer} draws from a field`);
    const { width, height, values, centers } = field;
    const region = new Int32Array(width * height).fill(-1);
    let regions = 0;
    for (let start = 0; start < values.length; start++) {
        if (values[start] < level || region[start] >= 0) {
            continue;
        }

        const stack = [start];
        region[start] = regions;
        while (stack.length > 0) {
            const at = stack.pop() as number;
            const x = at % width;
            const y = (at - x) / width;
            for (const [nx, ny] of [
                [x - 1, y],
                [x + 1, y],
                [x, y - 1],
                [x, y + 1],
            ]) {
                const next = ny * width + nx;
                if (nx >= 0 && ny >= 0 && nx < width && ny < height && region[next] < 0 && values[next] >= level) {
                    region[next] = regions;
                    stack.push(next);
                }
            }
        }

        regions++;
    }

    let outside = 0;
    let apart = 0;
    let first = -2;
    for (let i = 0; i < centers.length; i += 2) {
        const texel = Math.floor(centers[i + 1]) * width + Math.floor(centers[i]);
        const at = region[texel] ?? -1;
        outside += at < 0 ? 1 : 0;
        first = first === -2 ? at : first;
        apart += at >= 0 && at !== first ? 1 : 0;
    }

    return { outside, regions, apart };
}

/**
 * Load a dataset, lay it out, run Louvain and add one Hull layer per community.
 * @param element - The element.
 * @param format - The file's format.
 * @param data - The file.
 * @returns Each community layer's id.
 */
async function hullPerCommunity(element: Graphty, format: string, data: string): Promise<string[]> {
    await element.graph.addDataFromSource(format, { data });
    await element.session.layout.set("ngraph", { options: { seed: 7 } });
    await element.graph.waitForSettled();
    const result = await element.session.runs.start("louvain", {}, { as: "louvain", style: false });
    const communities = new Set<number>();
    for (const id of element.session.snapshot().ids) {
        communities.add(result.node(id)?.group as number);
    }

    const layers: string[] = [];
    for (const community of [...communities].sort((a, b) => a - b)) {
        const layer = await element.session.styles.add({
            name: `Community ${String(community)}`,
            set: { "node.shaders": [{ shader: HULL }] },
            target: "node",
            selector: { match: "expression", where: `results.louvain.group == \`${String(community)}\`` },
        });
        layers.push(layer.id);
    }

    // The camera must have finished framing: measured while it still moves, an edge member's
    // center lies off the canvas and so outside the field (issue #5402).
    await element.graph.waitForStableFrame();
    await until(element, "every community's outline draws", () => passOf(element)?.drawn().length === layers.length);
    return layers;
}

/** The hull's default threshold, the level its outline is drawn at. */
function defaultThreshold(): number {
    const param = shaderDescriptor(HULL)?.params.find((each) => each.name === "threshold");
    return param?.default as number;
}

describe("group outlines enclose the whole group", () => {
    it.each([
        ["Karate club", "gml", karateGml],
        ["Les Miserables", "gexf", lesMiserablesGexf],
    ])("%s with Louvain: each community's outline holds every member, in one region", async (_, format, data) => {
        const element = await mounted();
        const layers = await hullPerCommunity(element, format, data);
        const pass = passOf(element) as GroupOutlinePass;
        const level = defaultThreshold();
        const measured = await Promise.all(layers.map((layer) => enclosure(pass, layer, level)));
        assert.deepEqual(
            measured.map(({ outside, regions, apart }) => ({ outside, regions, apart })),
            measured.map(() => ({ outside: 0, regions: 1, apart: 0 })),
            `per community at threshold ${String(level)}`,
        );
    });

    it("a lone far member is inside its group's outline", async () => {
        const element = await mounted();
        const near = Array.from({ length: 6 }, (_, i) => ({
            id: `n${String(i)}`,
            position: { x: Math.cos(i) * 2, y: Math.sin(i) * 2, z: 0 },
        }));
        await element.session.data.addNodes([...near, { id: "far", position: { x: 30, y: 0, z: 0 } }]);
        await element.graph.setLayout("fixed", { dim: 2 });
        const layer = await element.session.styles.add({
            name: "Everyone",
            set: { "node.shaders": [{ shader: HULL }] },
            target: "node",
            selector: { match: "everything" },
        });
        await element.graph.waitForStableFrame();
        await until(element, "the outline draws", () => passOf(element)?.drawn().length === 1);
        const measured = await enclosure(passOf(element) as GroupOutlinePass, layer.id, defaultThreshold());
        assert.deepEqual(measured, { outside: 0, regions: 1, apart: 0 });
    });

    it("builds a group's spanning tree once, and no frame without movement builds another", async () => {
        const element = await mounted();
        await element.session.data.addNodes([
            { id: "a", position: { x: 0, y: 0, z: 0 } },
            { id: "b", position: { x: 1, y: 0, z: 0 } },
            { id: "far", position: { x: 30, y: 0, z: 0 } },
        ]);
        await element.graph.setLayout("fixed", { dim: 2 });
        await element.session.styles.add({
            name: "Everyone",
            set: { "node.shaders": [{ shader: HULL }] },
            target: "node",
            selector: { match: "everything" },
        });
        await element.graph.waitForStableFrame();
        await until(element, "the outline draws", () => passOf(element)?.drawn().length === 1);
        const pass = passOf(element) as GroupOutlinePass;
        const built = pass.treesBuilt;
        const { draws } = pass;
        assert.strictEqual(pass.connectors(), 1, "the far member is joined by one connector");

        for (let frame = 0; frame < 10; frame++) {
            element.graph.getScene().render();
        }

        assert.strictEqual(pass.draws - draws, 10, "ten frames drew the outline");
        assert.strictEqual(pass.treesBuilt, built, "and built no tree");
    });

    it("twelve community layers naming one shader draw twelve outlines at one level, with no cap", async () => {
        const element = await mounted();
        await element.session.data.addNodes(
            Array.from({ length: 48 }, (_, i) => {
                const community = i % 12;
                const angle = (community / 12) * Math.PI * 2;
                const k = Math.floor(i / 12);
                return {
                    id: `n${String(i)}`,
                    community,
                    position: { x: 30 * Math.cos(angle) + k, y: 30 * Math.sin(angle), z: 0 },
                };
            }),
        );
        await element.graph.setLayout("fixed", { dim: 2 });
        const layers = [];
        for (let community = 0; community < 12; community++) {
            layers.push(
                await element.session.styles.add({
                    name: `Community ${String(community)}`,
                    set: { "node.shaders": [{ shader: HULL }] },
                    target: "node",
                    selector: { match: "expression", where: `data.community == \`${String(community)}\`` },
                }),
            );
        }

        await element.graph.waitForStableFrame();
        await until(element, "every outline draws", () => passOf(element)?.drawn().length === 12);
        const drawn = passOf(element)?.drawn() ?? [];
        assert.deepEqual(
            drawn.map(({ depth, groups }) => ({ depth, groups: groups.length })),
            drawn.map(() => ({ depth: 0, groups: 1 })),
            "sibling layers of one shader share one level, as groups of one layer do",
        );
        for (const layer of layers) {
            const undrawn = element.session.styles.counts(layer.id).undrawn.map(({ code }) => code);
            assert.notInclude(undrawn, "shader.group-cap");
        }
    });
});
