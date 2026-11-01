/**
 * @file The layouts that read edge weights read them as what the load said they mean: a distance
 * is drawn long, a strength (similarity) short, and a weight whose meaning was assumed or cannot
 * be read is reported as a `layout-warning` code.
 *
 * The fixture is the path a - b - c - e, whose end edges a-b and c-e are mirror images, so any
 * difference between their drawn lengths is the weight and nothing else. a-b weighs 8, the rest 1.
 *
 * The last case runs ForceAtlas2 on a real WebGPU device, and only when the run asked for one
 * (`GRAPHTY_BROWSER_GPU`, as `webgpu-layout.test.ts` explains): a distance reaches the accelerator
 * as a derived edge column, and the device has to read it the way the CPU does.
 */

import "../../src/graphty-element";
import "../../webgpu";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { LayoutWarningEvent } from "../../src/events";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";

/** Whether this run has a WebGPU device to talk to at all. */
const GPU_LANE = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";

const PATH = ["from,to,km", "a,b,8", "b,c,1", "c,e,1"].join("\n");

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * An element holding the path, its weight `km` given the meaning asked, laid out by one layout.
 * @param layout - The layout.
 * @param weightMeaning - The meaning chosen at load, or undefined for none.
 * @param weighted - The layout's `weighted` option.
 * @param acceleration - The element's acceleration policy.
 * @returns the element and the layout warnings it emitted
 */
async function laidOut(
    layout: "kamada-kawai" | "forceatlas2",
    weightMeaning?: "strength" | "distance" | "capacity",
    weighted = true,
    acceleration: "auto" | "required" = "auto",
): Promise<{ element: Graphty; warnings: Omit<LayoutWarningEvent, "type">[] }> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.setAttribute("acceleration", acceleration);
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;

    const warnings: Omit<LayoutWarningEvent, "type">[] = [];
    element.addEventListener("layout-warning", (event) => {
        const { layoutType, code, params } = event.detail;
        warnings.push({ layoutType, code, params });
    });

    const draft = await element.session.data.prepare({ config: { file: new File([PATH], "path.csv") } });
    await draft.load({
        mapping: {
            source: "from",
            target: "to",
            weight: "km",
            ...(weightMeaning === undefined ? {} : { weightMeaning }),
        },
    });
    await element.session.layout.setDimension("2d");
    await element.session.layout.set(layout, {
        options: layout === "forceatlas2" ? { seed: 42, weighted } : { weighted },
    });
    await element.waitForStableFrame();
    return { element, warnings };
}

/**
 * How much longer a-b is drawn than its mirror image c-e.
 * @param element - The laid-out element.
 * @returns length(a-b) / length(c-e)
 */
function stretch(element: Graphty): number {
    const at = new Map(
        element.getNodes().map((node) => {
            const out = { x: 0, y: 0, z: 0 };
            element.session.positions.read(node.index, out);
            return [String(node.id), out];
        }),
    );
    const length = (s: string, t: string): number => {
        const p = at.get(s);
        const q = at.get(t);
        assert.isDefined(p, s);
        assert.isDefined(q, t);
        return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    };

    return length("a", "b") / length("c", "e");
}

describe("layouts read the edge weight as what it means", () => {
    for (const layout of ["kamada-kawai", "forceatlas2"] as const) {
        it(`${layout}: a distance draws the heaviest edge farther apart than a similarity does`, async () => {
            const asDistance = await laidOut(layout, "distance");
            const asStrength = await laidOut(layout, "strength");

            assert.isAbove(stretch(asDistance.element), 1, "a distance of 8 is drawn longer than one of 1");
            assert.isBelow(stretch(asStrength.element), 1, "a strength of 8 is drawn shorter than one of 1");
            assert.deepEqual(asDistance.warnings, []);
            assert.deepEqual(asStrength.warnings, []);
        });

        it(`${layout}: an unstated meaning is read as a strength, and says so`, async () => {
            const { element, warnings } = await laidOut(layout);

            assert.isBelow(stretch(element), 1);
            assert.deepEqual(warnings, [
                {
                    layoutType: layout,
                    code: "W_WEIGHT_MEANING_ASSUMED",
                    params: { attribute: "km", meaning: "strength" },
                },
            ]);
        });

        it(`${layout}: a capacity is left unread, and says so`, async () => {
            const { element, warnings } = await laidOut(layout, "capacity");
            const unweighted = await laidOut(layout, "capacity", false);

            assert.approximately(stretch(element), stretch(unweighted.element), 1e-3, "drawn as with weights off");
            assert.deepEqual(unweighted.warnings, [], "a layout told not to read weights warns about none");
            assert.deepEqual(warnings, [
                {
                    layoutType: layout,
                    code: "W_WEIGHT_MEANING_MISMATCH",
                    params: { attribute: "km", meaning: "capacity" },
                },
            ]);
        });
    }
});

describe.skipIf(!GPU_LANE)("layouts read the edge weight as what it means, on a real WebGPU device", () => {
    it("forceatlas2 on the accelerator: a distance draws the heaviest edge farther apart than a similarity does", async () => {
        const asDistance = await laidOut("forceatlas2", "distance", true, "required");
        const asStrength = await laidOut("forceatlas2", "strength", true, "required");

        for (const { element } of [asDistance, asStrength]) {
            const engine = element.graph.getLayoutManager().layoutEngine;
            assert.instanceOf(engine, SimulationLayoutEngine);
            assert.isTrue(engine.isAccelerated, "the layout ran on the accelerator, not on the CPU port");
        }

        assert.isAbove(stretch(asDistance.element), 1, "a distance of 8 is drawn longer than one of 1");
        assert.isBelow(stretch(asStrength.element), 1, "a strength of 8 is drawn shorter than one of 1");
    });
});
