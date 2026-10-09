/**
 * Add note while a note is already being written, its editor holding text and focus elsewhere:
 * the cursor goes back into the note, its text kept. Before, the click changed nothing on
 * screen and left focus on the button, so the words typed next went nowhere.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeEach, describe, it } from "vitest";

import { render, screen, waitFor } from "../../../test/test-utils";
import { clearRecent } from "../../project/recent";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Waits for an element whose session is not `previous`.
 * @param previous - a session that no longer counts.
 * @returns the session.
 */
async function elementSession(previous?: GraphSession): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
            assert.notStrictEqual(session, previous);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * Opens the Florentine families sample from the empty app.
 * @param store - the workspace store.
 * @returns the session.
 */
async function openSample(store: WorkspaceStore): Promise<GraphSession> {
    render(<Workspace store={store} />);
    await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
    const session = await elementSession();
    await waitFor(
        () => {
            assert.equal(session.data.statistics().nodeCount, 15);
        },
        { timeout: TIMEOUT_MS },
    );
    return session;
}

beforeEach(async () => {
    await clearRecent();
});

describe("Add note with a note already being written", () => {
    it("puts the cursor back in the note, its text kept", async () => {
        const store = createWorkspaceStore();
        await openSample(store);
        await userEvent.click(screen.getByRole("button", { name: "Notes" }));
        await userEvent.click(screen.getByRole("button", { name: "Add note" }));
        const field = await screen.findByRole("textbox", { name: "Note" });
        await userEvent.type(field, "Check the 1434 return");
        (document.activeElement as HTMLElement | null)?.blur();

        await userEvent.click(screen.getByRole("button", { name: "Add note" }));
        await waitFor(() => {
            assert.strictEqual(document.activeElement, screen.getByRole("textbox", { name: "Note" }));
        });
        assert.equal((document.activeElement as HTMLTextAreaElement).value, "Check the 1434 return");
    });
});
