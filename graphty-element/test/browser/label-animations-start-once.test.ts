/**
 * @file A load's label animations start once, with every label built, even when the layout
 * settles before the style paint that builds the labels has been drawn.
 *
 * On a slow machine a `fixed` layout settles on the first frame that has nodes, and the style
 * pass that gives those nodes their labels can still be on its way. Issue #2577: the settlement
 * started the animations then, with no labels yet, and the first frame after the labels were
 * built started them again. Here the frame loop is made to draw the style paint only once the
 * layout has stopped, which is that slow machine every time.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import { Graph } from "../../src/Graph";
import { DataManager } from "../../src/managers/DataManager";
import { UpdateManager } from "../../src/managers/UpdateManager";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    vi.restoreAllMocks();
    graph?.dispose();
    graph = undefined;
    container?.remove();
});

describe("label animations start once per load", () => {
    it("waits for the labels when the layout settles before their style paint is drawn", async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();

        const starts: boolean[] = [];
        const start = DataManager.prototype.startLabelAnimations;
        vi.spyOn(DataManager.prototype, "startLabelAnimations").mockImplementation(function (this: DataManager) {
            starts.push([...this.nodes.values()].every((node) => node.label !== undefined));
            start.call(this);
        });

        // The style paint reaches the meshes only once the layout has settled.
        const { syncStyles } = UpdateManager.prototype;
        vi.spyOn(UpdateManager.prototype, "syncStyles").mockImplementation(function (this: UpdateManager) {
            if (!g.isRunning()) {
                syncStyles.call(this);
            }
        });

        await g.setLayout("fixed", { dim: 3 });
        await g.getSession().styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "LABEL" },
        });
        await g.addNodes([
            { id: "a", position: { x: -2, y: 0, z: 0 } },
            { id: "b", position: { x: 2, y: 0, z: 0 } },
        ]);
        await g.waitForStableFrame();

        assert.deepEqual(starts, [true], "one start, with every label in place");
    });
});
