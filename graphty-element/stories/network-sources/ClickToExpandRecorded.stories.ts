// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { SourceExpanded } from "../../src/session/sources/types";
import { holds } from "../assertions";
import { loadRecordedSeed, PEOPLE_SEED } from "../fixtures/expand/source";

/**
 * Click-to-expand: a node a network source loaded is double-clicked, and the element asks that
 * source for the node's neighbors and merges them as one undoable step. The source here answers
 * from recorded responses (`fixtures/expand/people.json`), four neighbors a page, so nothing
 * reaches the network.
 *
 * The element ships no style for what it learns: each node carries neutral `_source.` attributes, and
 * this story -- a consumer -- adds its own layer that colors a node with more neighbors still to
 * fetch (`data._source.expansion == 'partial'`).
 *
 * A regression test, hidden from the sidebar: Data/Network sources/Click to expand shows the same
 * subject to a reader, on the Neo4j demo database. This one keeps what that one does not check --
 * a source other than Neo4j, answering pages of four from its own recordings, and the edges an
 * expansion brings. The meta keeps the component id these stories were first published under.
 */
const meta: Meta = {
    title: "Data/Network sources/Click to expand (recorded source)",
    id: "data-click-to-expand",
    component: "graphty-element",
};
export default meta;

type Story = StoryObj;

/** The element each story renders, and the promise that settles once its seed is loaded. */
const ready = new WeakMap<Element, Promise<Graphty>>();

/** What the story's own layer paints: a node with more neighbors still to fetch. */
const MORE_TO_FETCH_LAYER = {
    name: "More to fetch",
    target: "node",
    selector: { match: "expression", where: "data._source.expansion == 'partial'" },
    set: { "node.color": "#e8590c" },
} as const;

/**
 * Render a 2D element holding the recorded source's seed node, with double-click expansion on.
 * @returns The element.
 */
function render(): HTMLElement {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "85vh";
    ready.set(
        element,
        (async () => {
            await element.updateComplete;
            await operationQueueOf(element.graph).waitForCompletion();
            element.layoutBehavior = { expand: { trigger: "double-click" } };
            await element.session.styles.add(MORE_TO_FETCH_LAYER);
            await loadRecordedSeed(element.session, "recorded", { position: { x: 0, y: 0, z: 0 } });
            await element.graph.setLayout("fixed", { dim: 2 });
            await element.setViewMode("2d");
            await operationQueueOf(element.graph).waitForCompletion();
            // One view for before and after: a lone seed framed to fit would fill the screen.
            element.autoFrame = false;
            await element.setCameraState({ zoom: 0.4, pan: { x: 0, y: 0 } });
            await element.waitForStableFrame();
            return element;
        })(),
    );
    return element;
}

/**
 * The element a story rendered, once its seed is loaded and drawn.
 * @param canvasElement - The story's root.
 * @returns The element.
 */
async function settled(canvasElement: HTMLElement): Promise<Graphty> {
    const element = canvasElement.querySelector("graphty-element");
    const pending = element === null ? undefined : ready.get(element);
    await holds(pending !== undefined, "Click To Expand: the story rendered no <graphty-element>");
    return pending as Promise<Graphty>;
}

/**
 * Double-click a node the way a mouse does: two presses and releases on the canvas, at the spot
 * the element says the node is drawn.
 * @param element - The element.
 * @param id - The node.
 */
async function doubleClickNode(element: Graphty, id: string): Promise<void> {
    const at = element.nodeScreenPosition(id);
    await holds(at?.visible === true, `Click To Expand: node "${id}" is not on screen to be double-clicked`);
    const { canvas } = element.graph;
    const box = canvas.getBoundingClientRect();
    const pointer = {
        clientX: box.left + (at?.x ?? 0),
        clientY: box.top + (at?.y ?? 0),
        bubbles: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
    };
    canvas.dispatchEvent(new PointerEvent("pointermove", { ...pointer, button: -1, buttons: 0 }));
    for (let press = 0; press < 2; press++) {
        canvas.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, button: 0, buttons: 1 }));
        canvas.dispatchEvent(new PointerEvent("pointerup", { ...pointer, button: 0, buttons: 0 }));
    }
}

/** The seed double-clicked once: its first page of recorded neighbors, and the seed marked as having more. */
export const DoubleClickToExpand: Story = {
    // A regression story: captured and tested, not listed in the sidebar.
    tags: ["regression", "!dev", "!autodocs"],
    render,
    play: async ({ canvasElement }) => {
        const element = await settled(canvasElement);
        const expanded = new Promise<SourceExpanded>((resolve) => {
            const off = element.session.on("source:expanded", (detail) => {
                off();
                resolve(detail);
            });
        });

        await doubleClickNode(element, PEOPLE_SEED.id);
        const detail = await expanded;
        await element.waitForStableFrame();

        const snapshot = element.session.data.store.getSnapshot();
        await holds(
            snapshot.nodeCount === 5 && snapshot.edgeCount === 4,
            `the double-click brought the first page of four neighbors; the graph holds ${String(snapshot.nodeCount)} nodes`,
        );
        await holds(detail.params.partial === true, "the seed has more neighbors to fetch");
    },
};
