/**
 * A refused style tree verb on the REAL graphty-element, driven by real input: the row menu's
 * Duplicate is refused and the reader sees the app's words for the element's code, or the code
 * itself, never the element's English message (#5574).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, GraphtyError, type GraphtyErrorCode } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const TOAST = { selector: ".cm-toast-message" };

/** The element's own message, which no notice may show. */
const MESSAGE = "ELEMENT MESSAGE FOR DEBUGGING";

/**
 * A new project holding a small graph and one layer of the reader's own, Key people.
 * @returns the session.
 */
async function openScene(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor<GraphSession>(() => {
        const found = document.querySelector("graphty-element")?.session;
        if (found === undefined) {
            throw new Error("the element is not up yet");
        }
        return found;
    });
    await session.data.addNodes([1, 2, 3].map((id) => ({ id, name: `N${String(id)}` })));
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: [1, 2] },
        set: { "node.color": "#ff0000" },
    });
    await session.styles.settled();
    return session;
}

/**
 * Duplicates Key people from its row menu, opened with Shift+F10 on the clicked row.
 */
async function duplicateKeyPeople(): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Key people, / }));
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    const menu = await screen.findByRole("menu");
    await userEvent.click(within(menu).getByRole("menuitem", { name: /^Duplicate/ }));
}

/**
 * Makes the element refuse the next change with a GraphtyError of this code.
 * @param session - the session.
 * @param code - the code.
 */
function refuseNext(session: GraphSession, code: GraphtyErrorCode): void {
    vi.spyOn(session, "transaction").mockRejectedValueOnce(
        new GraphtyError({ code, message: MESSAGE, source: "style" }),
    );
}

describe("a refused style tree verb on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("says why in the app's words, from the element's code", async () => {
        const session = await openScene();
        refuseNext(session, "E_LOCKED");
        await duplicateKeyPeople();
        const toast = await screen.findByText("Could not duplicate Key people: its layer is locked.", TOAST);
        assert.notInclude(toast.textContent, MESSAGE);
    });

    it("names a code the app has no words for, never the element's message", async () => {
        const session = await openScene();
        refuseNext(session, "E_INTERNAL");
        await duplicateKeyPeople();
        const toast = await screen.findByText("Could not duplicate Key people (E_INTERNAL).", TOAST);
        assert.notInclude(toast.textContent, MESSAGE);
    });
});
