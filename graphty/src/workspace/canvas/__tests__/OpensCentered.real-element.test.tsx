/**
 * Where a sample is drawn when it opens, and where Frame selection puts a node, on the REAL
 * graphty-element. The drawing is centered on the canvas: the overlays over it (the toolbar, the
 * key) have no part in the framing (owner, 2026-10-24, #3372). Frame selection in 3D moves the camera's target and
 * distance and keeps the direction it looks from.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Pictures to look at, relative to this file. */
const SHOTS = "../../../../../design/ui/studio/tmp/r1-dry3-frame-the-drawing/test";

/**
 * Renders the workspace and opens a sample with the layout the element recommends for it.
 * @param url - The sample's address.
 * @returns The store, the element and its session once the drawing has settled.
 */
async function open(url: string): Promise<{
    store: WorkspaceStore;
    element: HTMLElementTagNameMap["graphty-element"];
    session: GraphSession;
}> {
    const store = createWorkspaceStore({ project: { name: "Sample", id: 1 }, inspected: null });
    render(<Workspace store={store} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    const session = element?.session;
    if (element === null || session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ config: { url } }, { layout: "recommended" });
    await element.waitForSettled();
    await element.waitForStableFrame();
    return { store, element, session };
}

/**
 * The canvas the drawing is framed in: the whole element, in its own CSS pixels.
 * @param element - The element.
 * @returns The rectangle.
 */
function freeArea(element: HTMLElement): { left: number; top: number; width: number; height: number } {
    return { left: 0, top: 0, width: element.clientWidth, height: element.clientHeight };
}

describe("a sample opens centered", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    for (const [name, url] of [
        ["Les Miserables", "/samples/les-miserables.gml"],
        ["Zachary's karate club", "/samples/karate.gml"],
    ] as const) {
        it(`${name}: the drawing's box is centered on the part of the canvas left free`, async () => {
            const { element, session } = await open(url);
            await page.screenshot({ path: `${SHOTS}/${url.slice(9, -4)}.png` });
            const at = session.data.nodes().flatMap((node) => element.nodeScreenPosition(node.id) ?? []);
            assert.isNotEmpty(at);
            const xs = at.map((point) => point.x);
            const ys = at.map((point) => point.y);
            const free = freeArea(element);
            const middleX = (Math.min(...xs) + Math.max(...xs)) / 2;
            const middleY = (Math.min(...ys) + Math.max(...ys)) / 2;
            assert.closeTo(middleX, free.left + free.width / 2, free.width * 0.05, "centered across");
            assert.closeTo(middleY, free.top + free.height / 2, free.height * 0.05, "centered down");
        });
    }

    it("Frame selection in 3D keeps the camera's direction and puts the node at the center", async () => {
        const { element, session } = await open("/samples/karate.gml");
        assert.equal(session.layout.dimension, "3d");
        const direction = (): number[] => {
            const { position, target } = element.getCameraState();
            assert.exists(position);
            assert.exists(target);
            const d = [position.x - target.x, position.y - target.y, position.z - target.z];
            const length = Math.hypot(...d);
            return d.map((value) => value / length);
        };
        // The reader has turned the drawing off the angle it opened at.
        const { position, target } = element.getCameraState();
        assert.exists(position);
        assert.exists(target);
        await element.setCameraState({ position: { x: target.x + 80, y: target.y + 10, z: target.z - 30 }, target });
        await element.waitForStableFrame();
        const before = direction();

        const node = session.data.nodes()[5]?.id;
        assert.isDefined(node);
        await element.select({ nodes: [node] });
        element.focus();
        await userEvent.keyboard("f");
        await waitFor(() => {
            const at = element.nodeScreenPosition(node);
            const free = freeArea(element);
            assert.isDefined(at);
            assert.closeTo(at.x, free.left + free.width / 2, free.width * 0.05, "centered across");
            assert.closeTo(at.y, free.top + free.height / 2, free.height * 0.05, "centered down");
        });
        await element.waitForStableFrame();
        await page.screenshot({ path: `${SHOTS}/frame-selection.png` });
        const after = direction();
        before.forEach((value, axis) => {
            assert.closeTo(after[axis] ?? Number.NaN, value, 1e-3, `direction axis ${String(axis)} kept`);
        });
    });
});
