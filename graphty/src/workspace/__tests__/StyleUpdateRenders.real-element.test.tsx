/**
 * One numeric style update on the REAL graphty-element re-renders only what reads it (#9423). An
 * animation drives `session.styles.update` once a frame; inside the workspace each update re-rendered
 * the Style tab's sections, the canvas key, the toolbar and the header, about 100 ms of React work
 * for 0.5 ms of the element's. Counted work, never timing: each panel marks its output with a
 * RenderCount, which this test counts.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withoutFeatures } from "../../test/features";
import { render, screen, waitFor, within } from "../../test/test-utils";
import { setRenderCounter } from "../renderCounter";
import { createWorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";

withoutFeatures(["file-styles"]);

type GraphElement = HTMLElementTagNameMap["graphty-element"];

/** The panels counted, by their RenderCount id. */
const PANELS = ["canvas-overlays", "legend-card", "header", "toolbar", "style-sections-node", "style-sections-edge"];

type Counts = Record<string, number>;

let counts: Counts = {};

beforeEach(() => {
    counts = Object.fromEntries(PANELS.map((id) => [id, 0]));
    setRenderCounter((id) => {
        counts[id] = (counts[id] ?? 0) + 1;
    });
});

afterEach(() => {
    setRenderCounter(null);
});

/**
 * The workspace with a 40-node ring, a layer coloring nodes by a value (so the key shows) and a
 * layer setting edge opacity, as an animation's.
 * @returns the element, its session and the opacity layer's id.
 */
async function openRing(): Promise<{ element: GraphElement; session: GraphSession; fade: string }> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Ring", id: 1 } })} />);
    let element: GraphElement | null = null;
    await waitFor(() => {
        element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const found: GraphElement = element;
    const { session } = found;
    const ids = Array.from({ length: 40 }, (_, i) => String(i));
    await session.data.addNodes(ids.map((id, i) => ({ id, dept: ["east", "west", "north"][i % 3] })));
    await session.data.addEdges(ids.map((id, i) => ({ source: id, target: ids[(i + 1) % ids.length] })));
    await session.styles.add({
        name: "Dept",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.dept" } },
    });
    const fade = await session.styles.add({
        name: "Fade",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.opacity": 1, "edge.animationSpeed": 1 },
    });
    await found.waitForSettled();
    await screen.findByRole("region", { name: "Legend" });
    return { element: found, session, fade: fade.id };
}

/**
 * The next animation frame.
 * @returns a promise that settles on it.
 */
function nextFrame(): Promise<void> {
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
}

/**
 * Updates one channel of the Fade layer once a frame for five frames, as an animation does, and
 * counts the renders.
 * @param element - the element.
 * @param session - its session.
 * @param fade - the Fade layer.
 * @param channel - the channel the animation plays.
 * @returns each component's renders over the five updates.
 */
async function animate(
    element: GraphElement,
    session: GraphSession,
    fade: string,
    channel: "edge.opacity" | "edge.animationSpeed",
): Promise<Counts> {
    // The first update is a new step, which Undo names; the rest change only the value.
    await session.styles.update(fade, { set: { [channel]: 0.95 } });
    await element.waitForSettled();
    await nextFrame();
    const before = { ...counts };
    for (const value of [0.9, 0.7, 0.5, 0.3, 0.1]) {
        await session.styles.update(fade, { set: { [channel]: value } });
        await nextFrame();
    }
    await element.waitForSettled();
    await nextFrame();
    assert.equal(session.styles.get(fade)?.set?.[channel], 0.1);
    return Object.fromEntries(PANELS.map((id) => [id, (counts[id] ?? 0) - (before[id] ?? 0)]));
}

describe("one numeric style update in the workspace", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("re-renders no panel that does not show what it changed", async () => {
        const { element, session, fade } = await openRing();
        // The Style tab shows the Dept layer, and the key does not show an animation's speed.
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(within(tree).getByRole("treeitem", { name: /^Dept, / }));
        await screen.findByTestId("style-tab");
        assert.deepEqual(await animate(element, session, fade, "edge.animationSpeed"), {
            "canvas-overlays": 0,
            "legend-card": 0,
            header: 0,
            toolbar: 0,
            "style-sections-node": 0,
            "style-sections-edge": 0,
        });
    });

    it("re-renders the open layer's sections and the key that shows the value, and nothing else", async () => {
        const { element, session, fade } = await openRing();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(within(tree).getByRole("treeitem", { name: /^Fade, / }));
        await screen.findByTestId("style-tab");
        const counted = await animate(element, session, fade, "edge.opacity");
        // Each frame's value is drawn in the open layer's Opacity, once a frame, and in the key.
        assert.isAbove(counted["style-sections-edge"], 0);
        assert.isAtMost(counted["style-sections-edge"], 5);
        assert.equal(counted["style-sections-node"], 0, "the layer paints no node");
        assert.equal(counted.header, 0);
        assert.equal(counted.toolbar, 0);
    });
});
