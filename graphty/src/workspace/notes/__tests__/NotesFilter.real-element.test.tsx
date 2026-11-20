/**
 * The Notes place's filter row, tags, done marks and author warning, on the REAL graphty-element:
 * Status, Tag and Author narrow the list and Sort orders it; the editor's Tags field offers the
 * tags already in use; Mark done marks a note; and while no name is set, a dismissible warning
 * over the editor opens Settings, where Your name signs the notes written next.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { openSampleFromStart } from "../../../test/open";
import { screen, waitFor, within } from "../../../test/test-utils";
import { clearRecent } from "../../project/recent";
import { AUTHOR_KEY } from "../../settings/preferences";
import { createWorkspaceStore } from "../../state/store";

beforeEach(async () => {
    await clearRecent();
    localStorage.removeItem(AUTHOR_KEY);
});

/**
 * The texts of the notes the Notes place lists, in order.
 * @returns the texts.
 */
function listed(): (string | null)[] {
    const list = screen.queryByRole("list", { name: "Notes" });
    return list === null
        ? []
        : within(list)
              .getAllByRole("listitem")
              .map((item) => item.getAttribute("aria-label"));
}

/**
 * Picks an option of one of the filter row's dropdowns.
 * @param label - the dropdown's label.
 * @param option - the option's words.
 */
async function pick(label: string, option: string): Promise<void> {
    await userEvent.click(screen.getByRole("combobox", { name: label }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("Notes filter, tags and author, on the real element", () => {
    it("filters by status, tag and author, and sorts by time and element", async () => {
        const store = createWorkspaceStore();
        const { session } = await openSampleFromStart("Florentine families", store);
        const [a, b] = session.data.nodes();
        await session.config.set({ author: "Ada" });
        const first = session.notes.add({ text: "first", targets: [{ node: b.id }], tags: ["lead"] });
        await session.config.set({ author: "Ben" });
        session.notes.add({ text: "second", targets: [{ node: a.id }], tags: ["lead", "money"] });
        session.notes.add({ text: "third", targets: [{ graph: true }] });
        session.notes.update(first, { done: true });
        store.set({ place: "notes" });

        await waitFor(() => {
            assert.deepEqual(listed(), ["third", "second", "first"]);
        });
        await pick("Status", "Open");
        await waitFor(() => {
            assert.deepEqual(listed(), ["third", "second"]);
        });
        await pick("Status", "Done");
        await waitFor(() => {
            assert.deepEqual(listed(), ["first"]);
        });
        await pick("Status", "All");
        await pick("Tag", "lead");
        await waitFor(() => {
            assert.deepEqual(listed(), ["second", "first"]);
        });
        await pick("Author", "Ada");
        await waitFor(() => {
            assert.deepEqual(listed(), ["first"]);
        });
        await pick("Author", "All");
        await pick("Tag", "All");
        await pick("Sort", "Oldest");
        await waitFor(() => {
            assert.deepEqual(listed(), ["first", "second", "third"]);
        });
        await pick("Sort", "Element");
        const byName = ["first", "second", "third"].sort((x, y) => {
            const name = (text: string): string =>
                text === "third" ? "Graph" : String(text === "first" ? b.id : a.id);
            return name(x).localeCompare(name(y), undefined, { numeric: true });
        });
        await waitFor(() => {
            assert.deepEqual(listed(), byName);
        });

        // Mark done on a note marks it, and the button says it is pressed.
        const list = screen.getByRole("list", { name: "Notes" });
        await userEvent.click(within(list).getByRole("button", { name: "Mark done: third" }));
        await waitFor(() => {
            assert.isDefined(session.notes.list({ done: true }).find((note) => note.text === "third"));
        });
        assert.equal(
            within(list).getByRole("button", { name: "Mark open: third" }).getAttribute("aria-pressed"),
            "true",
        );
    });

    it("offers the tags in use on a new note, and saves the ones picked", async () => {
        const store = createWorkspaceStore();
        const { session } = await openSampleFromStart("Florentine families", store);
        session.notes.add({ text: "earlier", targets: [{ graph: true }], tags: ["lead"] });
        (document.activeElement as HTMLElement | null)?.blur();

        await userEvent.keyboard("n");
        const field = await screen.findByRole("textbox", { name: "Note" });
        await userEvent.type(field, "later");
        await userEvent.click(screen.getByRole("textbox", { name: "Tags" }));
        await userEvent.click(await screen.findByRole("option", { name: "lead" }));
        // The tag list stays open over Save until Esc closes it.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("option", { name: "lead" }));
        });
        await userEvent.click(screen.getByRole("button", { name: "Save note" }));

        await waitFor(() => {
            const saved = session.notes.list().find((note) => note.text === "later");
            assert.deepEqual(saved?.tags, ["lead"]);
        });
        const note = within(screen.getByRole("list", { name: "Notes" })).getByRole("listitem", { name: "later" });
        assert.isNotNull(within(note).getByText("lead"));
    });

    it("warns while no name is set until dismissed, and Your name signs the next note", async () => {
        const store = createWorkspaceStore();
        const { session } = await openSampleFromStart("Florentine families", store);
        (document.activeElement as HTMLElement | null)?.blur();

        await userEvent.keyboard("n");
        await screen.findByRole("textbox", { name: "Note" });
        assert.isNotNull(screen.getByText("No author name"));
        await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        assert.isNull(screen.queryByText("No author name"));
        // Closed and opened again in the same page view: still dismissed.
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("n");
        await screen.findByRole("textbox", { name: "Note" });
        assert.isNull(screen.queryByText("No author name"));

        // Set name opens Settings on Your name, which signs the notes written from then on.
        store.set({ authorWarningClosed: false });
        await userEvent.click(await screen.findByRole("button", { name: "Set name" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Your name" }), "Ada{Enter}");
        await waitFor(() => {
            assert.equal(session.config.author, "Ada");
        });
        assert.equal(localStorage.getItem(AUTHOR_KEY), "Ada");
        await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
        assert.isNull(screen.queryByText("No author name"));

        await userEvent.click(screen.getByRole("textbox", { name: "Note" }));
        await userEvent.keyboard("signed{Control>}{Enter}{/Control}");
        await waitFor(() => {
            assert.equal(session.notes.list().find((note) => note.text === "signed")?.author, "Ada");
        });
    });

    it("tells each opened project the name kept in this browser", async () => {
        localStorage.setItem(AUTHOR_KEY, "Grace");
        const store = createWorkspaceStore();
        const { session } = await openSampleFromStart("Florentine families", store);
        assert.equal(session.config.author, "Grace");
    });
});
