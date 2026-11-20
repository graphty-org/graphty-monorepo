/**
 * Open recent in the main menu and saves that fail, on the REAL graphty-element: a project no
 * longer kept in this browser, a remembered file that can no longer be read (with Locate... on the
 * notice), a remembered file the browser keeps no handle to, a second Save the browser refuses and
 * a Save local copy... the browser cannot download. Every answer is a click or a key.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withoutFeatures } from "../../../test/features";
import { openSampleFromStart } from "../../../test/open";
import { screen, waitFor, within } from "../../../test/test-utils";
import { clearRecent, refreshStored, rememberRecent } from "../recent";

// A located data file opens the join screen only with sources and steps off: on, it is staged.
withoutFeatures(["source-steps"]);

/** A small edge list. */
const FRIENDS_CSV = "source,target\nann,bob\nbob,cy\n";

/**
 * A file handle as the browser hands one out, over `file`.
 * @param file - the file it reads, or null for a file that has moved.
 * @returns the handle.
 */
function handleOf(file: File | null): FileSystemFileHandle {
    return {
        kind: "file",
        name: file?.name ?? "moved.csv",
        getFile: () =>
            file === null
                ? Promise.reject(new DOMException("A requested file could not be found.", "NotFoundError"))
                : Promise.resolve(file),
    } as unknown as FileSystemFileHandle;
}

/**
 * Opens the main menu's Open recent submenu and clicks the entry named `name`.
 * @param name - the entry's name.
 */
async function openRecentFromMenu(name: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
    await userEvent.hover(await screen.findByRole("menuitem", { name: "Open recent" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: new RegExp(`^${name}`) }));
}

/**
 * Save as through Control+S, keeping the project's name, until the project is kept in this browser.
 */
async function saveInBrowser(): Promise<void> {
    await userEvent.keyboard("{Control>}s{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Save Florentine families as" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await screen.findByText("Saved Florentine families in this browser.");
}

// Wide enough that the notice, with Locate..., clears the side panels.
beforeAll(async () => {
    await page.viewport(1440, 900);
});

beforeEach(async () => {
    await clearRecent();
});

afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await clearRecent();
});

describe("Open recent in the main menu", () => {
    it("says a project is no longer kept in this browser once it was cleared", async () => {
        const { store } = await openSampleFromStart("Florentine families");
        await saveInBrowser();
        // Cleared elsewhere (another tab, the browser's own storage settings) after the list was read.
        const [kept] = await browserProjects.list();
        await browserProjects.remove(kept.id);

        await openRecentFromMenu("Florentine families");
        await waitFor(() => {
            assert.deepEqual(store.get().notice, {
                message: "Florentine families is no longer kept in this browser.",
                error: true,
            });
        });
    });

    it("says a remembered file can no longer be read, and Locate... on the notice adds the picked file", async () => {
        const { store } = await openSampleFromStart("Florentine families");
        await rememberRecent({ id: "moved", name: "Friends study", nodes: 3, at: Date.now(), handle: handleOf(null) });
        await refreshStored();

        await openRecentFromMenu("Friends study");
        const locate = await screen.findByRole("button", { name: "Locate..." });
        assert.equal(store.get().notice?.message, "Friends study can no longer be read.");

        const picked = new File([FRIENDS_CSV], "friends.csv", { type: "text/csv" });
        vi.stubGlobal("showOpenFilePicker", () => Promise.resolve([handleOf(picked)]));
        await userEvent.click(locate);
        // A data file into a graph that holds data: the join screen, as File... adds it.
        assert.isNotNull(await screen.findByRole("region", { name: "Join friends.csv" }));
        assert.equal(store.get().project?.name, "Florentine families");
    });

    it("asks for a remembered file the browser keeps no handle to, and a cancelled picker changes nothing", async () => {
        const { store } = await openSampleFromStart("Florentine families");
        await rememberRecent({ id: "lost", name: "Friends study", nodes: 3, at: Date.now() });
        const picker = vi.fn(() => Promise.reject(new DOMException("The user aborted a request.", "AbortError")));
        vi.stubGlobal("showOpenFilePicker", picker);

        await openRecentFromMenu("Friends study");
        await waitFor(() => {
            assert.equal(picker.mock.calls.length, 1);
        });
        assert.equal(store.get().project?.name, "Florentine families");
        assert.isNull(store.get().notice);
    });
});

describe("saves the browser refuses", () => {
    it("says why a second Save did not keep the project, and the project stays unsaved", async () => {
        const { session, store } = await openSampleFromStart("Florentine families");
        await saveInBrowser();
        await session.styles.add({
            name: "Later",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        assert.isTrue(session.project.dirty);

        vi.stubGlobal("indexedDB", undefined);
        await userEvent.keyboard("{Control>}s{/Control}");
        await waitFor(() => {
            assert.deepEqual(store.get().notice, {
                message:
                    "Florentine families could not be saved: this browser does not let graphty keep projects. Save a local copy instead.",
                error: true,
            });
        });
        assert.isNull(screen.queryByRole("dialog"), "a kept project saves again without Save as");
        assert.isTrue(session.project.dirty);
    });

    it("says a local copy could not be saved when the browser cannot download it", async () => {
        const { store } = await openSampleFromStart("Florentine families");
        vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
            throw new DOMException("Downloads are blocked.", "SecurityError");
        });

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Save local copy..." }));
        await waitFor(() => {
            assert.deepEqual(store.get().notice, {
                message: "A copy of Florentine families could not be saved.",
                error: true,
            });
        });
    });
});
