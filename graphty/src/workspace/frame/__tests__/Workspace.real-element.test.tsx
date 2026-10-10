/**
 * The workspace frame on the REAL graphty-element: the element mounts inside the frame, hands
 * up its session, and the header's Undo and Redo and the Esc key act on the element's own
 * history and selection. Every assertion reads what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, describe, it } from "vitest";
import { page, userEvent as realInput } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the workspace with a project open and waits for the element's session.
 * @returns the session.
 */
async function openWorkspace(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Ring", id: 1 } })} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            const element = document.querySelector("graphty-element");
            session = element?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

describe("the workspace frame on the real element", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "undoes and redoes the element's own steps from the header and the keys",
        async () => {
            const session = await openWorkspace();
            const undo = screen.getByRole("button", { name: "Undo" });
            assert.equal(undo.getAttribute("aria-disabled"), "true");

            await session.data.addNodes([{ id: "a" }, { id: "b" }]);
            await waitFor(() => {
                assert.equal(undo.getAttribute("aria-disabled"), "false");
            });
            const applied = session.history.position;

            await userEvent.click(undo);
            await waitFor(() => {
                assert.equal(session.history.position, applied - 1);
            });

            await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
            await waitFor(() => {
                assert.equal(session.history.position, applied);
            });

            await userEvent.keyboard("{Control>}z{/Control}");
            await waitFor(() => {
                assert.equal(session.history.position, applied - 1);
            });
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "clears the element's selection with Esc",
        async () => {
            const session = await openWorkspace();
            await session.data.addNodes([{ id: "a" }, { id: "b" }]);
            await session.selection.apply({ ids: ["a"] });
            assert.equal(session.selection.size, 1);

            await userEvent.keyboard("{Escape}");
            assert.equal(session.selection.size, 0);
        },
        TIMEOUT_MS,
    );

    it("opens the shortcuts sheet with ? while a closed Select's list is mounted on the page", async () => {
        // The inspector has room at the design's width, and its Layout group holds a Select.
        await page.viewport(1366, 768);
        const session = await openWorkspace();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ src: "a", dst: "b" }]);
        // Mantine keeps a closed Select's options mounted, hidden: the case that once switched
        // every single-key shortcut off.
        await waitFor(
            () => {
                const lists = [...document.querySelectorAll('[role="listbox"]')];
                assert.isTrue(
                    lists.some((list) => !list.checkVisibility()),
                    "a hidden list is on the page",
                );
            },
            { timeout: TIMEOUT_MS },
        );

        await realInput.keyboard("?");

        await screen.findByRole("region", { name: "Keyboard shortcuts" });
    });
});
