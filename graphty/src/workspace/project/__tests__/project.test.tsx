/**
 * The Project package without the element: its commands, the Save as dialog, Close project, the
 * Recent projects list and the words for a file that does not open. The element is not registered
 * in this file; `Project.real-element.test.tsx` walks save and reopen on it.
 */
import { browserProjects, type GraphSession, GraphtyError } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";
import { problemSentence, SAVE_AS_DIALOG, saveProblemSentence } from "../actions";
import { registration } from "../commands";
import { clearRecent, refreshStored, rememberRecent } from "../recent";

const OPEN: Partial<WorkspaceState> = { project: { name: "Les Miserables", id: 1 } };

/** The note under Recent projects when the browser may clear what it keeps. */
const MAY_CLEAR = "This browser can clear projects kept here. Save a local copy of any project you need to keep.";

/**
 * Keeps a project in this browser through graphty-element, from a stand-in session: only what
 * `browserProjects.save` reads.
 * @param name - the project's name.
 * @param nodes - its node count.
 * @returns its id.
 */
async function keepInBrowser(name: string, nodes: number): Promise<string> {
    const session = {
        status: { counts: { nodes, edges: 0 } },
        project: {
            name,
            save: () => Promise.resolve({ text: "{}" }),
            markSaved: () => undefined,
        },
    } as unknown as GraphSession;
    const { id } = await browserProjects.save(session);
    await refreshStored();
    return id;
}

beforeEach(async () => {
    await clearRecent();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("the Project package", () => {
    it("registers Save, Save as..., Save local copy... and Close project, built, with their keys", () => {
        const registry = createRegistry([registration]);
        assert.deepEqual(registry.built("project.save")?.keys, ["Mod+S"]);
        assert.deepEqual(registry.built("project.save-as")?.keys, ["Shift+Mod+S"]);
        assert.equal(registry.built("project.save-copy")?.label, "Save local copy...");
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
        // The name is the only field: where it goes is not a choice.
        assert.lengthOf(within(dialog).getAllByRole("textbox"), 1);
        assert.isNull(within(dialog).queryByText(/Save to|download/i));

        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        assert.isNull(store.get().dialog);
    });

    it("keeps Save closed while the graph is still loading, and says why", async () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);

        await userEvent.keyboard("{Control>}s{/Control}");
        assert.isNull(store.get().dialog);
        await userEvent.click(screen.getByRole("button", { name: "Project: Les Miserables" }));
        const save = await screen.findByRole("menuitem", { name: /^Save(?! as| local)/ });
        assert.equal(save.getAttribute("aria-disabled"), "true");
        assert.isNotNull(within(save).getByText("The graph is still loading"));
    });

    it("closes a project with nothing unsaved straight to the start screen", async () => {
        const store = createWorkspaceStore(OPEN);
        render(<Workspace store={store} />);

        await userEvent.click(screen.getByRole("button", { name: "Project: Les Miserables" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Close project" }));
        assert.isNull(store.get().project);
        assert.isNotNull(screen.getByText("Projects you save appear here. They are kept in this browser."));
    });

    it("lists recent projects with their size, asks for a downloaded file with Locate..., and removes one", async () => {
        await rememberRecent({ id: "a", name: "Older", nodes: 1, at: 1 });
        await rememberRecent({ id: "b", name: "Les Miserables", nodes: 77, at: 2 });
        render(<Workspace />);

        const list = await screen.findByRole("grid", { name: "Recent projects" });
        const rows = within(list).getAllByRole("gridcell", { name: /^(Older|Les Miserables)/ });
        assert.deepEqual(
            rows.map((row) => row.querySelector(".cm-page-name")?.textContent),
            ["Les Miserables", "Older"],
        );
        assert.isNotNull(within(rows[0]).getByText("77 nodes"));
        assert.isNotNull(within(rows[1]).getByText("1 node"));
        assert.isNotNull(within(rows[0]).getByText(/ - Locate\.\.\.$/));

        await userEvent.click(screen.getByRole("button", { name: "More for Older" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Remove from list" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("gridcell", { name: /^Older/ }));
        });
    });

    it("lists a project kept in this browser, and Remove from this browser asks first, then deletes it", async () => {
        vi.spyOn(navigator.storage, "persisted").mockResolvedValue(true);
        await rememberRecent({ id: "f", name: "A file", nodes: 3, at: 1, handle: {} as FileSystemFileHandle });
        await keepInBrowser("Les Miserables", 77);
        render(<Workspace />);

        const row = await screen.findByRole("gridcell", { name: /^Les Miserables/ });
        assert.isNotNull(within(row).getByText(/^In this browser - 77 nodes - /));
        const list = screen.getByRole("grid", { name: "Recent projects" });
        assert.deepEqual(
            [...list.querySelectorAll(".cm-page-name")].map((name) => name.textContent),
            ["Les Miserables", "A file"],
        );

        await userEvent.click(screen.getByRole("button", { name: "More for Les Miserables" }));
        assert.isNotNull(await screen.findByRole("menuitem", { name: "Open" }));
        await userEvent.click(screen.getByRole("menuitem", { name: "Remove from this browser" }));
        const ask = await screen.findByRole("dialog", { name: "Remove Les Miserables from this browser?" });
        await userEvent.click(within(ask).getByRole("button", { name: "Remove" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("gridcell", { name: /^Les Miserables/ }));
        });
        assert.deepEqual(await browserProjects.list(), []);
    });

    it("notes that the browser can clear kept projects only when it has not promised to keep them", async () => {
        const persisted = vi.spyOn(navigator.storage, "persisted").mockResolvedValue(false);
        await keepInBrowser("Les Miserables", 77);
        const { unmount } = render(<Workspace />);
        assert.isNotNull(await screen.findByText(MAY_CLEAR));
        unmount();

        persisted.mockResolvedValue(true);
        render(<Workspace />);
        await screen.findByRole("gridcell", { name: /^Les Miserables/ });
        await waitFor(() => {
            assert.isAbove(persisted.mock.calls.length, 1);
        });
        // Let the answer arrive and render before looking for the note.
        await act(async () => {
            await persisted.mock.results.at(-1)?.value;
        });
        assert.isNull(screen.queryByText(MAY_CLEAR));
    });

    it("does not note storage when only remembered files are listed", async () => {
        const persisted = vi.spyOn(navigator.storage, "persisted").mockResolvedValue(false);
        await rememberRecent({ id: "f", name: "A file", nodes: 3, at: 1 });
        render(<Workspace />);
        await screen.findByRole("gridcell", { name: /^A file/ });
        assert.isNull(screen.queryByText(MAY_CLEAR));
        assert.equal(persisted.mock.calls.length, 0);
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
        assert.equal(
            saveProblemSentence("Karate", new GraphtyError({ code: "E_TOO_LARGE", message: "x", source: "data" })),
            "Karate could not be saved: this browser's storage for graphty is full.",
        );
    });
});
