/**
 * @file A style layer naming a set, in a real graph (design/sets/sets-design.md section 11): the
 * layer colours the set's members on screen, and redefining the set repaints exactly the nodes
 * that entered or left it. Colours are read off each node's own mesh instance, which is what the
 * element draws.
 */

import { Color3, type InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../../src/Graph";
import type { ElementSession } from "../../../src/session/types";

/** The colour the layer paints. */
const RED = "#ff0000";

/** Twenty nodes on a path. */
const IDS = Array.from({ length: 20 }, (_, index) => `n${String(index)}`);

describe("a style layer naming a set, on screen", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(IDS.map((id) => ({ id })));
        await graph.addEdges(IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })));
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Render a few frames so the painter's writes reach the meshes.
     */
    const frames = async (): Promise<void> => {
        await graph.operationQueue.waitForCompletion();
        await graph.getSession().styles.settled();
        for (let frame = 0; frame < 10; frame++) {
            graph.scene.render();
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    };

    /**
     * The nodes drawn red, sorted.
     * @returns The ids.
     */
    const drawnRed = (): string[] => {
        const red = Color3.FromHexString(RED);
        return graph
            .getNodes()
            .filter((node) => {
                const color = (node.mesh as InstancedMesh).instancedBuffers.color as
                    | { r: number; g: number; b: number }
                    | undefined;
                return (
                    color !== undefined &&
                    Math.abs(color.r - red.r) < 0.01 &&
                    Math.abs(color.g - red.g) < 0.01 &&
                    Math.abs(color.b - red.b) < 0.01
                );
            })
            .map((node) => String(node.id))
            .sort();
    };

    it("colours the set, and a redefinition repaints only the nodes that moved", async () => {
        const session = graph.getSession() as ElementSession;
        const id = session.sets.create(
            { kind: "fixed", nodes: ["n1", "n2", "n3", "n4"], reading: "induced" },
            { name: "Suspects" },
        );
        await session.styles.add({
            name: "Suspects",
            selector: { match: "member", of: { set: id } },
            set: { "node.color": RED },
        });
        await frames();
        assert.deepStrictEqual(drawnRed(), ["n1", "n2", "n3", "n4"]);

        const passes: number[] = [];
        session.paint.onPainted(() => passes.push(session.paint.lastPainted("node").length));
        const before = new Map(
            graph
                .getNodes()
                .map((node) => [String(node.id), JSON.stringify((node.mesh as InstancedMesh).instancedBuffers.color)]),
        );

        // n1 leaves, n10 and n11 join: three nodes move.
        session.sets.redefine(id, { kind: "fixed", nodes: ["n2", "n3", "n4", "n10", "n11"], reading: "induced" });
        await frames();

        assert.deepStrictEqual(drawnRed(), ["n10", "n11", "n2", "n3", "n4"]);
        assert.deepStrictEqual(passes, [3], "one pass over the three nodes that moved");
        const changed = graph
            .getNodes()
            .filter(
                (node) =>
                    JSON.stringify((node.mesh as InstancedMesh).instancedBuffers.color) !== before.get(String(node.id)),
            )
            .map((node) => String(node.id))
            .sort();
        assert.deepStrictEqual(changed, ["n1", "n10", "n11"]);
    });
});
