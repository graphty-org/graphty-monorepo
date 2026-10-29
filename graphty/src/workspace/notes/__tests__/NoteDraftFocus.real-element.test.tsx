/**
 * Add note while a note is already being written, its editor holding text and focus elsewhere:
 * the cursor goes back into the note, its text kept. Before, the click changed nothing on
 * screen and left focus on the button, so the words typed next went nowhere.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import userEvent from "@testing-library/user-event";
import { assert, beforeEach, describe, it } from "vitest";

import { openSampleFromStart } from "../../../test/open";
import { screen, waitFor } from "../../../test/test-utils";
import { clearRecent } from "../../project/recent";
import { createWorkspaceStore } from "../../state/store";

beforeEach(async () => {
    await clearRecent();
});

describe("Add note with a note already being written", () => {
    it("puts the cursor back in the note, its text kept", async () => {
        const store = createWorkspaceStore();
        await openSampleFromStart("Florentine families", store);
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

    it("saves with Control+Enter from the editor's buttons too", async () => {
        const store = createWorkspaceStore();
        const { session } = await openSampleFromStart("Florentine families", store);
        await userEvent.click(screen.getByRole("button", { name: "Notes" }));
        await userEvent.click(screen.getByRole("button", { name: "Add note" }));
        const field = await screen.findByRole("textbox", { name: "Note" });
        await userEvent.type(field, "Marriages only");
        await userEvent.tab();
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Cancel" }));

        await userEvent.keyboard("{Control>}{Enter}{/Control}");
        await waitFor(() => {
            assert.deepEqual(
                session.notes.list().map((note) => note.text),
                ["Marriages only"],
            );
        });
    });

    it("puts focus on Add note after Cancel, not on the page", async () => {
        const store = createWorkspaceStore();
        await openSampleFromStart("Florentine families", store);
        await userEvent.click(screen.getByRole("button", { name: "Notes" }));
        await userEvent.click(screen.getByRole("button", { name: "Add note" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "Note" }), "Not this one");

        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("textbox", { name: "Note" }));
        });
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Add note" }));
    });
});
