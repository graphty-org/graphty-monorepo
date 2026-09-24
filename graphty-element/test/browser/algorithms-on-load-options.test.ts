/**
 * @file The element's load-time algorithm list takes run options as well as names.
 *
 * `{ algorithm: "graphty:pagerank", style: { size: [1, 5] } }` in the list must both colour and
 * size the nodes, exactly as `session.runs.start("pagerank", {}, { style: { size: [1, 5] } })`
 * does, and a plain name must go on colouring without sizing. Read off the meshes the renderer
 * draws, not off the style model, so a layer the model holds and the renderer never applies is
 * caught here.
 */

import "../../src/algorithms";

import type { InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graphty } from "../../src/graphty-element";

/** A star with a tail, so the nodes differ in importance. */
const NODES = [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }, { id: "tail" }];
const EDGES = [
    { src: "hub", dst: "a" },
    { src: "hub", dst: "b" },
    { src: "hub", dst: "c" },
    { src: "hub", dst: "tail" },
    { src: "a", dst: "b" },
];

/** Mounting, loading and running is slower than the five-second default. */
const TEST_TIMEOUT_MS = 30000;

let container: HTMLDivElement | null = null;

/**
 * Mount a `<graphty-element>` whose load-time list is given by `configure`, then load the star.
 * @param configure - Sets the list on the element, as a page would.
 * @returns The element, once its PageRank run has succeeded and the picture has settled.
 */
async function mountWith(configure: (element: Graphty) => void): Promise<Graphty> {
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);

    const element = document.createElement("graphty-element");

    assert.instanceOf(element, Graphty, "importing the element is what defines the tag");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    configure(element);
    container.appendChild(element);

    element.nodeData = NODES;
    element.edgeData = EDGES;

    const deadline = Date.now() + TEST_TIMEOUT_MS / 2;

    while (!element.session.runs.list().some((run) => run.algorithm === "pagerank" && run.status === "succeeded")) {
        if (Date.now() > deadline) {
            throw new Error("the PageRank run named in the load-time list never succeeded");
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    await element.graph.operationQueue.waitForCompletion();
    await element.session.styles.settled();

    for (let frame = 0; frame < 10; frame++) {
        element.graph.scene.render();
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return element;
}

/**
 * What each node is drawn as.
 * @param element - The element on screen.
 * @returns Each node's drawn half-width and colour, by id.
 */
function drawn(element: Graphty): Map<string, { radius: number; colour: string }> {
    return new Map(
        element.graph.getNodes().map((node) => {
            node.mesh.computeWorldMatrix(true);
            const color = (node.mesh as InstancedMesh).instancedBuffers.color as
                | { r: number; g: number; b: number }
                | undefined;

            return [
                String(node.id),
                {
                    radius: node.mesh.getBoundingInfo().boundingBox.extendSizeWorld.x,
                    colour: color === undefined ? "none" : [color.r, color.g, color.b].map((c) => c.toFixed(3)).join(","),
                },
            ];
        }),
    );
}

describe("run options in the load-time algorithm list", () => {
    afterEach(() => {
        container?.remove();
        container = null;
    });

    it(
        "colours AND sizes the nodes for an entry carrying style: { size: [1, 5] }",
        async () => {
            const element = await mountWith((el) => {
                el.setAttribute("run-algorithms-on-load", "");
                el.algorithmsOnLoad = [{ algorithm: "graphty:pagerank", style: { size: [1, 5] } }];
            });

            assert.deepStrictEqual(element.algorithmsOnLoad, [
                { algorithm: "graphty:pagerank", style: { size: [1, 5] } },
            ]);

            const run = element.session.runs.list().find((entry) => entry.algorithm === "pagerank");
            const first = String(run?.result?.ranking("value", 1)[0]?.id);
            const last = String(run?.result?.ranking("value", NODES.length).at(-1)?.id);
            const nodes = drawn(element);
            const radii = [...nodes.values()].map((node) => node.radius);

            assert.strictEqual(nodes.get(first)?.radius, Math.max(...radii), "the node PageRank ranks first is largest");
            assert.closeTo(Math.max(...radii) / Math.min(...radii), 5, 0.1, "the range [1, 5] spans five times");
            assert.notStrictEqual(nodes.get(first)?.colour, nodes.get(last)?.colour, "the run colours nodes by score");

            const sizeLayers = element.session.styles.list().filter((layer) => layer.encode?.["node.size"] !== undefined);

            assert.lengthOf(sizeLayers, 1, "one size layer, from the run");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "takes a bare catalogue key, and hands the run its id and its default size range",
        async () => {
            const element = await mountWith((el) => {
                el.runAlgorithmsOnLoad = true;
                el.algorithmsOnLoad = [{ algorithm: "pagerank", as: "importance", style: { size: true } }];
            });

            const radii = [...drawn(element).values()].map((node) => node.radius);

            assert.deepStrictEqual(
                element.session.runs.list().map((run) => run.id),
                ["importance"],
                "the run carries the id the entry gave it",
            );
            assert.closeTo(Math.max(...radii) / Math.min(...radii), 3, 0.1, "size: true is the range [1, 3]");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "colours without sizing for a plain name, as it always did",
        async () => {
            const element = await mountWith((el) => {
                el.runAlgorithmsOnLoad = true;
                el.algorithmsOnLoad = ["graphty:pagerank"];
            });

            const nodes = drawn(element);
            const radii = [...nodes.values()].map((node) => node.radius);

            assert.closeTo(Math.max(...radii), Math.min(...radii), 1e-6, "every node keeps the same size");
            assert.notStrictEqual(nodes.get("hub")?.colour, nodes.get("tail")?.colour, "the run colours nodes");
        },
        TEST_TIMEOUT_MS,
    );

    it("refuses a malformed entry with E_BAD_COMMAND naming it, and keeps the list it had", () => {
        const element = new Graphty();
        element.algorithmsOnLoad = ["graphty:degree"];

        assert.throws(
            () => {
                element.algorithmsOnLoad = [
                    { algorithm: "graphty:pagerank", style: { size: "big" } } as unknown as string,
                ];
            },
            /graphty:pagerank/,
        );

        let code: unknown;

        try {
            element.algorithmsOnLoad = [{ algorithm: "" }];
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }

        assert.strictEqual(code, "E_BAD_COMMAND");

        assert.deepStrictEqual(element.algorithmsOnLoad, ["graphty:degree"]);
    });
});
