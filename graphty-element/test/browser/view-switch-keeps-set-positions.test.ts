/**
 * @file A 2D/3D switch keeps the nodes of the fixed layout where they are drawn (issue #9637).
 *
 * The fixed layout places every node at its record's position the first time it runs, and keeps
 * what the element's position array holds after that, so a node moved with `positions.set` or a
 * drag stays put. A view-mode switch builds the layout again for the new dimension, and that new
 * engine's first run put every node back at its record's position in one frame.
 */

import { afterEach, assert, describe, test } from "vitest";

import { Graphty } from "../../src/graphty-element";

const hosts: HTMLElement[] = [];

afterEach(() => {
    for (const host of hosts.splice(0)) {
        host.remove();
    }
});

/**
 * A settled element on the fixed layout with two nodes recorded at A, and one edge.
 * @returns The element.
 */
async function fixedGraph(): Promise<Graphty> {
    const host = document.createElement("div");
    host.style.width = "600px";
    host.style.height = "400px";
    document.body.append(host);
    hosts.push(host);

    const element = new Graphty();
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    host.append(element);
    await element.waitForSettled();

    const s = element.session;
    await s.layout.set("fixed");
    await s.data.addNodes([
        { id: "a", position: { x: 0, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 2 } },
    ]);
    await s.data.addEdges([{ source: "a", target: "b" }]);
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where the session holds a node.
 * @param element - The element.
 * @param id - The node.
 * @returns Its coordinates.
 */
function at(element: Graphty, id: string): [number, number, number] {
    const p = element.session.positions.get(id);
    assert.isDefined(p);
    return [p.x, p.y, p.z];
}

describe("a view-mode switch on the fixed layout", () => {
    for (const path of [["2d", "3d"], ["2d"]] as const) {
        test(`keeps a node moved with positions.set where it was moved (${path.join(" then ")})`, async () => {
            const element = await fixedGraph();
            await element.session.positions.set([{ id: "a", x: 10, y: 5, z: 0 }]);
            await element.waitForSettled();
            assert.deepEqual(at(element, "a"), [10, 5, 0]);

            for (const mode of path) {
                await element.setViewMode(mode);
                await element.waitForSettled();
                await element.waitForStableFrame();
                assert.deepEqual(at(element, "a"), [10, 5, 0], `after switching to ${mode}`);
            }
        });
    }

    test("keeps a recorded depth through a round trip to 2D", async () => {
        const element = await fixedGraph();
        await element.setViewMode("2d");
        await element.waitForSettled();
        await element.setViewMode("3d");
        await element.waitForSettled();
        await element.waitForStableFrame();
        assert.deepEqual(at(element, "b"), [4, 0, 2]);
    });
});
