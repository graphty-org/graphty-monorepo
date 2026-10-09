/**
 * @file A load's label animations start once the labels exist and the layout is at rest.
 *
 * They used to start on a 100 ms timer after `init()`: too early on a slow machine, a pure
 * delay on a fast one, and still armed after a dispose. Now a layout that runs starts them when
 * it settles, and one that is already at rest starts them on the first frame that has nodes. A
 * label built later -- by a style layer or any other write -- is started the same way.
 * Every wait here is on a frame or on the stable-frame promise, never on a clock.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import { Graph } from "../../src/Graph";
import { DataManager } from "../../src/managers/DataManager";
import { RichTextAnimator } from "../../src/meshes/RichTextAnimator";

const NODES = [
    { id: "a", position: { x: -2, y: 0, z: 0 } },
    { id: "b", position: { x: 2, y: 0, z: 0 } },
];

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    vi.restoreAllMocks();
    graph?.dispose();
    graph = undefined;
    container?.remove();
});

async function mount(): Promise<Graph> {
    container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const g = new Graph(container);
    graph = g;
    await g.init();
    return g;
}

/**
 * Count the starts, and whether every node had its label when each one came.
 * @returns What each start found.
 */
function watchStarts(): boolean[] {
    const starts: boolean[] = [];
    const original = DataManager.prototype.startLabelAnimations;
    vi.spyOn(DataManager.prototype, "startLabelAnimations").mockImplementation(function (this: DataManager) {
        starts.push([...this.nodes.values()].every((node) => node.label !== undefined));
        original.call(this);
    });
    return starts;
}

async function loadLabelledNodes(g: Graph): Promise<void> {
    await g.getSession().styles.add({
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "LABEL" },
    });
    await g.addNodes(NODES);
}

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
}

describe("label animations start when the labels exist", () => {
    it("starts them once, after a layout that runs has settled", async () => {
        const g = await mount();
        const starts = watchStarts();
        await g.setLayout("fixed", { dim: 3 });
        await loadLabelledNodes(g);
        await g.waitForStableFrame();

        assert.deepEqual(starts, [true], "one start, with every label in place");
    });

    it("starts them once on the first frame when the layout never runs", async () => {
        const g = await mount();
        const starts = watchStarts();
        g.setRunning(false);
        await loadLabelledNodes(g);

        while (starts.length === 0) {
            await nextFrame();
        }

        await nextFrame();
        await nextFrame();
        assert.isFalse(g.isRunning(), "the layout stayed paused");
        assert.deepEqual(starts, [true], "one start, with every label in place");
    });

    it("starts the animation of a label a later layer adds, once, while the layout stays at rest", async () => {
        const g = await mount();
        const starts = watchStarts();
        g.setRunning(false);
        await loadLabelledNodes(g);

        while (starts.length === 0) {
            await nextFrame();
        }

        const animated: RichTextAnimator[] = [];
        const setup = RichTextAnimator.prototype.setupAnimation;
        vi.spyOn(RichTextAnimator.prototype, "setupAnimation").mockImplementation(function (
            this: RichTextAnimator,
            ...args: Parameters<RichTextAnimator["setupAnimation"]>
        ) {
            animated.push(this);
            setup.apply(this, args);
        });

        await g.getSession().styles.add({
            name: "pulse a",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.labelStyle": { animation: "pulse" } },
        });

        while (animated.length === 0) {
            await nextFrame();
        }

        await nextFrame();
        await nextFrame();
        assert.isFalse(g.isRunning(), "the layout stayed paused");
        assert.lengthOf(animated, 1, "one animation started: node a's new label, and no other label restarted");
    });

    it("starts nothing when the graph is disposed first", async () => {
        const g = await mount();
        const starts = watchStarts();
        g.dispose();
        graph = undefined;

        await nextFrame();
        await nextFrame();
        assert.deepEqual(starts, []);
    });
});
