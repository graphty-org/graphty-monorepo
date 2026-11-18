/**
 * Opening files that are not a saved project, on the REAL graphty-element: Locate... from Recent
 * projects with a data file, a file nothing can read, a cancelled or refused picker; and, inside an
 * open project, Open project or file... with a saved style.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { openSampleFromStart } from "../../../test/open";
import { render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { clearRecent, rememberRecent } from "../recent";

/** A small edge list. */
const FRIENDS_CSV = "source,target\nann,bob\nbob,cy\n";

/** Bytes that are no graph format, no project and no graphty document. */
const NOT_A_GRAPH = "\u0000\u0001 not a graph \u0002";

/**
 * The start screen with one Recent projects row whose file the browser keeps no handle to, so a
 * click on it asks for the file (Locate...).
 * @returns the workspace store.
 */
async function startWithLostFile(): Promise<WorkspaceStore> {
    await rememberRecent({ id: "lost", name: "Friends study", nodes: 3, at: Date.now() });
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    return store;
}

/**
 * The Recent projects row of {@link startWithLostFile}.
 * @returns the row.
 */
function lostRow(): Promise<HTMLElement> {
    return screen.findByRole("gridcell", { name: /^Friends study/ });
}

beforeEach(async () => {
    await clearRecent();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("Locate... from Recent projects", () => {
    it("opens a data file on the Data page as a new graph", async () => {
        await startWithLostFile();
        // The file input, as in a browser without the File System Access picker.
        vi.stubGlobal("showOpenFilePicker", undefined);
        await commands.chooseNextFile("friends.csv", "text/csv", FRIENDS_CSV);
        await userEvent.click(await lostRow());

        await screen.findByRole("heading", { name: "Open as a new graph" });
    });

    it("goes back to the start screen, saying why, when the file cannot be read", async () => {
        const store = await startWithLostFile();
        vi.stubGlobal("showOpenFilePicker", undefined);
        await commands.chooseNextFile("friends.graphty.json", "application/json", NOT_A_GRAPH);
        await userEvent.click(await lostRow());

        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^friends\.graphty could not be opened/);
        });
        assert.isNull(store.get().project);
        assert.isNotNull(await lostRow());
    });

    it("stays on the start screen when the reader cancels the picker", async () => {
        const store = await startWithLostFile();
        const picker = vi.fn(() => Promise.reject(new DOMException("The user aborted a request.", "AbortError")));
        vi.stubGlobal("showOpenFilePicker", picker);
        await userEvent.click(await lostRow());

        await waitFor(() => {
            assert.equal(picker.mock.calls.length, 1);
        });
        assert.isNull(store.get().project);
        assert.isNull(store.get().notice);
    });

    it("says the project could not be opened when the browser refuses the picker", async () => {
        const store = await startWithLostFile();
        vi.stubGlobal("showOpenFilePicker", () =>
            Promise.reject(new DOMException("Must be handling a user gesture.", "SecurityError")),
        );
        await userEvent.click(await lostRow());

        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Friends study could not be opened.");
        });
        assert.isNull(store.get().project);
    });

    it("opens the picked project file and keeps its handle", async () => {
        const { session, store } = await openSampleFromStart("Florentine families");
        const saved = await session.project.save();
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        await waitFor(() => {
            assert.isNull(store.get().project);
        });
        await rememberRecent({ id: "lost", name: "Friends study", nodes: 15, at: Date.now() });
        const file = new File([saved.text], "florentine.graphty.json", { type: "application/json" });
        const handle = { kind: "file", name: file.name, getFile: () => Promise.resolve(file) };
        vi.stubGlobal("showOpenFilePicker", () => Promise.resolve([handle]));
        await userEvent.click(await lostRow());

        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Opened /);
        });
        assert.isNotNull(store.get().project);
    });
});

describe("Open project or file... inside an open project", () => {
    it("adds a saved style to the project and says so", async () => {
        const { session, store } = await openSampleFromStart("Florentine families");
        const before = session.styles.list().length;
        const style = {
            kind: "graphty-style",
            version: 1,
            layers: [{ name: "Big", selector: { match: "everything" }, set: { "node.size": 3 } }],
        };
        await commands.chooseNextFile("big.graphty.json", "application/json", JSON.stringify(style));
        await userEvent.keyboard("{Control>}o{/Control}");

        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Added big.graphty.json to this project");
        });
        assert.equal(session.styles.list().length, before + 1);
        assert.equal(store.get().project?.name, "Florentine families");
    });
});
