/**
 * The Pinned look a new project gets, on the REAL graphty-element: a node the reader drags is
 * pinned and wears the thin gray ring of the Pinned starting row, a node left alone wears none, and
 * selecting the pinned node shows the Selected highlight, whose row sits above Pinned's.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { dragAcross } from "../../../test/real-pointer";
import { pickSample } from "../../../test/samples-dialog";
import { render, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The ring a new project gives a pinned node. */
const RING = "#868e96";

/**
 * The halo color the style layers give a node now.
 * @param session - the element's session.
 * @param node - the node.
 * @returns the color in lower case, or undefined when no layer gives it a halo.
 */
function halo(session: GraphSession, node: string | number): string | undefined {
    return session.styles.explain({ node }).merged["node.haloColor"]?.hex.toLowerCase();
}

beforeAll(async () => {
    await page.viewport(1366, 768);
});

describe("the Pinned look of a new project", () => {
    it("rings a node the reader drags, and Selected wins over the ring", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        await pickSample("Florentine families");
        let found: HTMLElementTagNameMap["graphty-element"] | null = null;
        await waitFor(() => {
            found = document.querySelector("graphty-element");
            assert.equal(found?.session?.data.statistics().nodeCount, 15);
        });
        if (found === null) {
            throw new Error("the element never came up");
        }
        const element: HTMLElementTagNameMap["graphty-element"] = found;
        const { session } = element;
        await waitFor(() => {
            assert.isDefined(session.config.pinnedStyle, "a new project sets the pinned look");
        });
        // The picture is still once the layout has converged, so the node stays where it is read.
        await element.waitForStableFrame();
        const [dragged, alone] = session.data.nodes().map((node) => node.id);
        // Pressed where the element says the node is drawn now, and again until the drag pins it.
        await waitFor(async () => {
            const at = element.nodeScreenPosition(String(dragged));
            assert.isTrue(at?.visible, "the node is on screen");
            assert.equal(element.elementAt({ x: at?.x ?? 0, y: at?.y ?? 0 })?.id, dragged);
            await dragAcross(element, 60, { x: at?.x ?? 0, y: at?.y ?? 0 });
            assert.isTrue(session.positions.pinned.has(dragged), "the drag pinned the node");
        });
        await waitFor(() => {
            assert.strictEqual(halo(session, dragged), RING, "the pinned node wears the ring");
        });
        assert.notStrictEqual(halo(session, alone), RING, "a node left alone wears no ring");

        // A click on the pinned node selects it.
        await element.waitForStableFrame();
        const now = element.nodeScreenPosition(String(dragged));
        assert.isTrue(now?.visible, "the dragged node is on screen");
        await userEvent.click(element, { position: { x: now?.x ?? 0, y: now?.y ?? 0 } });
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], [dragged], "the click selected the pinned node");
            assert.notStrictEqual(halo(session, dragged), RING, "Selected sits above Pinned and wins");
            assert.isDefined(halo(session, dragged));
        });
        // The reader's Escape clears the selection; the ring is back.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(halo(session, dragged), RING);
        });
    });
});
