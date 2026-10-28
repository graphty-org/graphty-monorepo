/**
 * The Hovered row counts the node under the pointer, on the REAL graphty-element with the real
 * pointer: pointing at a node makes it count one, and moving off the drawing onto the panel
 * makes it count none again.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and the sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Opens Les Miserables from the start screen, as a reader does, with the starting rows on.
 * @returns the session.
 */
async function openSample(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore()} />);
    await userEvent.click(screen.getByRole("button", { name: "Open the Les Miserables sample" }));
    return waitFor<GraphSession>(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            if (found === undefined) {
                throw new Error("the element is not up yet");
            }
            assert.equal(found.data.statistics().nodeCount, 77);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * Whether the Hovered row's name, which carries its count, says it counts one node.
 * @returns true while it counts one.
 */
function countsOne(): boolean {
    const tree = screen.getByRole("tree", { name: "Style layers" });
    within(tree).getByRole("treeitem", { name: /^Hovered, / });
    return within(tree).queryByRole("treeitem", { name: /^Hovered, .*\b1 node\b/ }) !== null;
}

describe("the Hovered row", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("counts the node under the pointer, and none once the pointer leaves the drawing", async () => {
        const session = await openSample();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        if (element === null) {
            return;
        }
        await element.waitForSettled();
        await element.waitForStableFrame();
        const at = await waitFor(
            () => {
                assert.isFalse(countsOne(), "nothing is hovered yet");
                const drawn = element.nodeScreenPosition("Valjean");
                assert.isDefined(drawn, "the node is drawn");
                return drawn;
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.hover(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        await waitFor(() => {
            assert.strictEqual(session.selection.hovered, "Valjean", "the element hovers the node");
            assert.isTrue(countsOne(), "the row counts it");
        });

        await userEvent.hover(screen.getByRole("tree", { name: "Style layers" }));
        await waitFor(() => {
            assert.isNull(session.selection.hovered, "the pointer left the drawing");
            assert.isFalse(countsOne(), "the row counts nothing");
        });
    });
});
