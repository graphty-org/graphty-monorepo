/**
 * @file The appearance of a selected node, as something a consumer can choose.
 *
 * In 1.x a consumer restyled the selection: `SelectionManager` published
 * `getSelectionStyleLayer` and `setSelectionStyleLayer`, and a host that wanted its own
 * highlight colour handed one over. 2.0 draws a gold halo from three constants at the top of
 * `src/Node.ts` and keeps it deliberately OUT of the style stack, so it cannot be reached by
 * adding a layer either -- the element's own layers answer `E_PROTECTED`. Between those two
 * decisions the capability disappeared: there was no door at all.
 *
 * The halo belongs outside the layer stack; a selection is not a property of the data and a
 * layer that painted it would be reordered, persisted and lost at a dataset boundary along with
 * every other layer. So the door is the graph's own configuration, beside the background: what
 * colour the highlight is, how far it stands out past the node, and how solid it is.
 */

import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

/** Two nodes, so selecting one leaves something unselected to compare against. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge between them. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** The gold every selection has been drawn in. */
const DEFAULT_HALO = "#FFD700";

describe("what a selected node looks like", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("circular", { scale: 0.05 });
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The halo on screen.
     *
     * The mesh cache keeps its SOURCE mesh in the scene beside the instances, hidden and parked
     * ten thousand units below the graph, so a search by name alone finds the source and reports
     * its unscaled size. Visibility is what separates them.
     * @returns the halo instance, or undefined when none is drawn
     */
    function drawnHalo(): AbstractMesh | undefined {
        return graph.scene.meshes.find(
            (mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled(),
        );
    }

    /**
     * How big the halo on screen is, as a radius in world units.
     * @returns the halo's radius
     */
    function haloRadius(): number {
        const halo = drawnHalo();
        assert.isDefined(halo, "a selected node has a halo on screen");

        const extent = halo.getBoundingInfo().boundingBox.extendSizeWorld;

        return Math.max(extent.x, extent.y, extent.z);
    }

    /**
     * How big a node is drawn, as a radius in world units.
     * @param id - the node to measure
     * @returns the node's drawn radius
     */
    function nodeRadius(id: string): number {
        const node = graph.getNode(id);
        assert.isDefined(node, "the node to measure is in the graph");

        const extent = node.mesh.getBoundingInfo().boundingBox.extendSizeWorld;

        return Math.max(extent.x, extent.y, extent.z);
    }

    /**
     * The material the selection halo is drawn with, read off the halo on screen.
     * @returns the halo's colour and opacity, or undefined when no halo is drawn
     */
    function haloMaterial(): { emissive: string; alpha: number } | undefined {
        const material = drawnHalo()?.material;

        if (!material || !("emissiveColor" in material)) {
            return undefined;
        }

        const lit = material as unknown as { emissiveColor: { toHexString: () => string }; alpha: number };

        return { emissive: lit.emissiveColor.toHexString(), alpha: lit.alpha };
    }

    /**
     * Render a few frames, so the update loop can bring the overlays into line with the mask.
     */
    async function frames(): Promise<void> {
        for (let frame = 0; frame < 10; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, 10);
            });
        }
    }

    it("is gold when nobody has said otherwise", async () => {
        await graph.select({ nodes: ["alpha"] });
        await frames();

        assert.deepStrictEqual(haloMaterial(), { emissive: DEFAULT_HALO, alpha: 0.4 });
    });

    it("takes the colour the graph configuration asks for", async () => {
        graph.setSelectionStyle({ color: "#00BCD4" });
        await graph.select({ nodes: ["alpha"] });
        await frames();

        assert.strictEqual(haloMaterial()?.emissive, "#00BCD4");
    });

    it("takes the opacity the graph configuration asks for", async () => {
        graph.setSelectionStyle({ opacity: 0.9 });
        await graph.select({ nodes: ["alpha"] });
        await frames();

        assert.strictEqual(haloMaterial()?.alpha, 0.9);
    });

    it("restyles a selection that is already on screen", async () => {
        await graph.select({ nodes: ["alpha"] });
        await frames();
        assert.strictEqual(haloMaterial()?.emissive, DEFAULT_HALO, "the default was drawn first");

        graph.setSelectionStyle({ color: "#E91E63" });
        await frames();

        assert.strictEqual(haloMaterial()?.emissive, "#E91E63", "the halo already drawn changed colour");
    });

    it("stands clear of the node by default, so it can actually be seen", async () => {
        await graph.select({ nodes: ["alpha"] });
        await frames();

        // THE DEFECT THIS PINS. The halo was scaled by the style's `size` number against a
        // source sphere one unit across, giving radius 0.725 for a node of size 1 -- and the
        // element draws a node of size 1 at radius 0.75. The highlight sat inside the node it
        // was ringing and had never been visible in any version. The only assertion that existed
        // checked the halo OBJECT was there, which it always was.
        assert.isAbove(haloRadius(), nodeRadius("alpha"), "the halo is drawn outside the node");
    });

    it("draws the halo at the scale the configuration asks for", async () => {
        graph.setSelectionStyle({ scale: 3 });
        await graph.select({ nodes: ["alpha"] });
        await frames();

        assert.closeTo(haloRadius() / nodeRadius("alpha"), 3, 1e-6, "three times the node's own radius");
    });

    it("reports what it is currently set to", () => {
        graph.setSelectionStyle({ color: "#00BCD4" });

        assert.deepStrictEqual(graph.styles.config.graph.selection, {
            color: "#00BCD4",
            scale: 1.45,
            opacity: 0.4,
        });
    });

    it("refuses a scale that is not a positive number", () => {
        assert.throws(() => {
            graph.setSelectionStyle({ scale: 0 });
        });
    });
});
