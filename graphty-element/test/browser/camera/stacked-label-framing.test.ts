/**
 * @file Nodes stacked on one point with label avoidance on settle on one framing (issue #8250).
 *
 * With `labels.avoidNodesAndEdges` on, where each label goes depends on the camera, and a fit
 * frames the labels where they are. The fit measured them wherever the last label pass had put
 * them -- over their nodes before the first pass, or placed for a camera since replaced -- and only
 * a refit after the next pass framed them where they went. Whether that refit landed before the
 * picture was called final depended on timing: the graphty app's Graphviz story, a DOT file with
 * no positions drawn with every node on the origin, was framed about 60 CSS pixels apart from one
 * capture to the next. A fit now places the labels for the camera it frames before it measures
 * again, so one fit settles it and the same inputs always give the same camera and label places.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

const WIDTH = 640;
const HEIGHT = 480;

/** The graphty app's Graphviz story file: no positions, so the fixed layout stacks every node on the origin. */
const DOT = `digraph G {
  node [fontname="Times" fontsize=14];
  a [shape=polygon sides=7 orientation=15 label="Seven"];
  b [shape=box style=striped fillcolor="red:green:blue" label="Stripes"];
  c [shape=circle style=wedged fillcolor="gold:navy:gray" label="Wedges"];
  d [shape=doublecircle xlabel="outside" label="Ring"];
  a -> b; b -> c; c -> d; d -> a;
}
`;

interface Settled {
    camera: unknown;
    labels: Record<string, number[]>;
}

let container: HTMLDivElement | undefined;

afterEach(() => {
    container?.remove();
    container = undefined;
});

/**
 * Where the camera and every node label are.
 * @param element - The element.
 * @returns The camera state and each label plane's place on its node.
 */
function settled(element: Graphty): Settled {
    const labels: Record<string, number[]> = {};
    for (const node of element.graph.getDataManager().nodes.values()) {
        const mesh = node.label?.labelMesh;
        assert.isOk(mesh, `${String(node.id)} has a label`);
        const { x, y, z } = mesh.position;
        labels[String(node.id)] = [x, y, z];
    }

    return { camera: element.graph.getCameraState(), labels };
}

/**
 * Load the DOT file into a fresh element, laid out fixed and flat, with label avoidance on.
 * @param avoidFirst - Turn label avoidance on before the file loads, rather than after it settled.
 * @returns The element, settled.
 */
async function render(avoidFirst: boolean): Promise<Graphty> {
    container?.remove();
    container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    const element = document.createElement("graphty-element");
    element.features = ["file-styles"];
    container.appendChild(element);
    if (avoidFirst) {
        element.graph.setLayoutBehavior({ labels: { avoidNodesAndEdges: true } });
    }

    await element.waitForStableFrame();
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("fixed");
    await element.session.data.import({ type: "dot", name: "shapes.gv", config: { data: DOT } }, { styles: "file" });
    await element.session.styles.settled();
    await element.waitForStableFrame();
    if (!avoidFirst) {
        element.graph.setLayoutBehavior({ labels: { avoidNodesAndEdges: true } });
        element.zoomToFit();
        await element.waitForStableFrame();
    }

    return element;
}

describe("stacked nodes with label avoidance settle on one framing", () => {
    it("renders the same camera and label places twice, however the render got there", async () => {
        const first = settled(await render(true));
        const second = settled(await render(true));
        const third = settled(await render(false));
        assert.deepEqual(second, first, "a second render settles where the first did");
        assert.deepEqual(third, first, "avoidance turned on after the load settles there too");
        // The labels were moved around the stack, so the test is about placed labels.
        assert.isTrue(
            Object.values(first.labels).some(([x, y]) => x !== 0 || y !== 0),
            "some label moved off the stack",
        );
    });

    it("frames once, on labels placed for the camera it framed, from any camera", async () => {
        const element = await render(true);
        const expected = settled(element);
        for (const zoom of [6, 0.2]) {
            await element.graph.setCameraZoom(zoom);
            await element.waitForStableFrame();
            const fits: Settled[] = [];
            const off = element.graph.on("zoom-to-fit-complete", () => {
                fits.push(settled(element));
            });
            try {
                element.zoomToFit();
                await element.waitForStableFrame();
            } finally {
                off();
            }

            assert.lengthOf(fits, 1, `one fit from zoom ${String(zoom)}`);
            assert.deepEqual(fits[0], expected, `the fit from zoom ${String(zoom)} lands on the settled framing`);
            assert.deepEqual(settled(element), expected, `nothing moves after the fit from zoom ${String(zoom)}`);
        }
    });
});
