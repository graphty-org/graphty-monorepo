/**
 * @file An edge drawn in front of an outlined node never lets the outline into the node.
 *
 * The outline is a highlight layer, drawn wherever the stencil does not hold the node's mark.
 * Every mesh of the main pass used to write the stencil, so an edge crossing in front of an
 * outlined node wiped the mark along its line and the outline color was drawn there: streaks
 * across the node. Read from the scene: during the main pass only an outlined node writes the
 * stencil.
 */

import "../../src/graphty-element";

import { type AbstractMesh, Mesh } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

describe("an outlined node with edges in front of it", () => {
    let element: Graphty;

    beforeAll(async () => {
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.session.data.addNodes([
            { id: "a", position: { x: 0, y: 0, z: 0 } },
            { id: "b", position: { x: -3, y: 0, z: 2 } },
            { id: "c", position: { x: 3, y: 0, z: 2 } },
        ]);
        await element.session.data.addEdges([{ src: "b", dst: "c" }]);
        await element.graph.setLayout("fixed", { dim: 3 });
        await element.session.styles.add({
            name: "Outlined",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.outline": "#ff0000" },
        });
        await element.session.styles.settled();
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
    });

    afterAll(() => {
        element.remove();
    });

    it("writes the stencil only while the outlined node draws, never while an edge does", () => {
        const { scene, engine } = element.graph;
        const outlined = element.graph.getDataManager().nodes.get("a")?.mesh;
        assert.isDefined(outlined);
        const source = "sourceMesh" in outlined ? (outlined.sourceMesh as AbstractMesh) : outlined;
        let main = false;
        const masks = new Map<AbstractMesh, number>();
        const before = scene.onBeforeDrawPhaseObservable.add(() => {
            main = true;
        });
        const after = scene.onAfterDrawPhaseObservable.add(() => {
            main = false;
        });
        // Instances draw through their source mesh, which is what binds.
        const drawn = scene.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh);
        const binds = drawn.map((mesh) =>
            mesh.onBeforeBindObservable.add(() => {
                if (main) {
                    masks.set(mesh, engine.getStencilMask());
                }
            }),
        );
        scene.render();
        scene.onBeforeDrawPhaseObservable.remove(before);
        scene.onAfterDrawPhaseObservable.remove(after);
        drawn.forEach((mesh, index) => mesh.onBeforeBindObservable.remove(binds[index]));

        assert.strictEqual(masks.get(source), 0xff, "the outlined node marks its silhouette");
        const others = [...masks].filter(([mesh]) => mesh !== source);
        assert.isAbove(others.length, 0, "the edge and the other nodes drew");
        for (const [mesh, mask] of others) {
            assert.strictEqual(mask, 0, `${mesh.name} leaves the outlined node's mark alone`);
        }
    });
});
