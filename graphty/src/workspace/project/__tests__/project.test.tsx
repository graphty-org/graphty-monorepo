/**
 * The Project package without the element: its commands, the Save as dialog, Close project, the
 * Recent projects list and the words for a file that does not open. The element is not registered
 * in this file; `Project.real-element.test.tsx` walks save and reopen on it.
 */
import { GraphtyError } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeEach, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";
import { problemSentence, SAVE_AS_DIALOG } from "../actions";
import { registration } from "../commands";
import { nameFromFileName } from "../files";
import { clearRecent, rememberRecent } from "../recent";

const OPEN: Partial<WorkspaceState> = { project: { name: "Les Miserables", id: 1 } };

beforeEach(async () => {
    await clearRecent();
});

describe("the Project package", () => {
    it("registers Save, Save as... and Close project, built, with their keys", () => {
        const registry = createRegistry([registration]);
        assert.deepEqual(registry.built("project.save")?.keys, ["Mod+S"]);
        assert.deepEqual(registry.built("project.save-as")?.keys, ["Shift+Mod+S"]);
        assert.equal(registry.built("project.close")?.label, "Close project");
    });

    it("opens Save as titled with the project's name, its name selected, and Cancel closes it", async () => {
        const store = createWorkspaceStore({ ...OPEN, dialog: SAVE_AS_DIALOG });
        render(<Workspace store={store} />);

        const dialog = await screen.findByRole("dialog", { name: "Save Les Miserables as" });
        const field = within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        assert.equal(field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0), "Les Miserables");

        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        assert.isNull(store.get().dialog);
    });

    it("keeps Save closed while the graph is still loading", async () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);

        await userEvent.keyboard("{Control>}s{/Control}");
        assert.isNull(store.get().dialog);
    });

    it("closes a project with nothing unsaved straight to the start screen", async () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);

        await userEvent.click(screen.getByRole("button", { name: "Project: Les Miserables" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Close project" }));
        assert.isNull(store.get().project);
        assert.isNotNull(screen.getByText("Projects you open or create appear here. They are kept in this browser."));
    });

    it("lists recent projects with their size, asks for a downloaded file with Locate..., and removes one", async () => {
        await rememberRecent({ id: "a", name: "Older", nodes: 1, at: 1 });
        await rememberRecent({ id: "b", name: "Les Miserables", nodes: 77, at: 2 });
        render(<Workspace />);

        const rows = await screen.findAllByRole("button", { name: /^Open (Older|Les Miserables)$/ });
        assert.deepEqual(
            rows.map((row) => row.getAttribute("aria-label")),
            ["Open Les Miserables", "Open Older"],
        );
        assert.isNotNull(within(rows[0]).getByText("77 nodes"));
        assert.isNotNull(within(rows[1]).getByText("1 node"));
        assert.isNotNull(within(rows[0]).getByText(/ - Locate\.\.\.$/));

        await userEvent.click(screen.getByRole("button", { name: "More for Older" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove from list" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: "Open Older" }));
        });
    });

    it("offers Open recent in the main menu once a project is remembered", async () => {
        await rememberRecent({ id: "b", name: "Karate", nodes: 34, at: 2 });
        render(<Workspace initialState={OPEN} />);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Open recent" }));
        assert.isNotNull(await screen.findByRole("menuitem", { name: /^Karate/ }));
    });

    it("words a file that does not open from the element's code", () => {
        const error = (code: "E_BAD_DOCUMENT" | "E_UNSUPPORTED_VERSION" | "E_TOO_LARGE"): GraphtyError =>
            new GraphtyError({ code, message: code, source: "data" });
        assert.equal(problemSentence("a.json", error("E_BAD_DOCUMENT")), "a.json is not a graphty project file.");
        assert.equal(
            problemSentence("a.json", error("E_UNSUPPORTED_VERSION")),
            "a.json was saved by a newer graphty. Update graphty to open it.",
        );
        assert.equal(problemSentence("a.json", error("E_TOO_LARGE")), "a.json is too large to open.");
        assert.equal(problemSentence("a.json", new Error("x")), "a.json could not be opened.");
    });

    it("names a project after its file", () => {
        assert.equal(nameFromFileName("Les Miserables.graphty.json"), "Les Miserables");
        assert.equal(nameFromFileName("plain.json"), "plain");
        assert.equal(nameFromFileName("notes.txt"), "notes.txt");
    });
});
