/**
 * Opening a graph again, and taking a file in again, on the REAL graphty-element: a tab reloaded
 * before its project's first write opens the project again as it was opened (a dataset, a
 * generated graph), and lands on the start screen when the catalog no longer has it; the same
 * file opened again in its project replaces it at once, and another file with the same columns
 * offers to replace it; Paste with nothing on the clipboard says so.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { forgetAutosave } from "../../../test/reload";
import { render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore, type Opener, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Where a tab keeps its place across a reload (store.ts). */
const PLACE_ITEM = "app.graphty.workspace.place";

/** A small edge list. */
const FRIENDS_CSV = "source,target,weight\nann,bob,1\nbob,cy,2\n";

/** The same columns, other rows: next month's copy. */
const MARCH_CSV = "source,target,weight\nann,dee,3\n";

/**
 * Mounts the workspace with autosave on, in a tab that kept how its project was opened but
 * never wrote it: the reload of a project whose first write had not landed.
 * @param opened - how the project was opened.
 * @returns the workspace store.
 */
function reloadBeforeFirstWrite(opened: Opener): WorkspaceStore {
    sessionStorage.setItem(PLACE_ITEM, JSON.stringify({ opened }));
    const store = createWorkspaceStore({ autosave: true });
    render(<Workspace store={store} />);
    return store;
}

/**
 * The opened project's session, once its open has finished.
 * @param store - the workspace store.
 * @returns the session.
 */
async function openedSession(
    store: WorkspaceStore,
): Promise<NonNullable<HTMLElementTagNameMap["graphty-element"]["session"]>> {
    await waitFor(() => {
        assert.isNotNull(store.get().opened, "the reload started an open");
    });
    await store.get().opened;
    const session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    )?.session;
    assert.isDefined(session);
    return session;
}

beforeEach(async () => {
    await forgetAutosave();
    sessionStorage.clear();
});

afterEach(async () => {
    sessionStorage.clear();
    await forgetAutosave();
});

describe("a tab reloaded before its project's first write", () => {
    it("opens the generated graph again with the same parameters", async () => {
        const store = reloadBeforeFirstWrite({
            kind: "generator",
            generator: "balanced-tree",
            params: { branching: 2, height: 2 },
        });
        const session = await openedSession(store);
        assert.equal(store.get().project?.name, "Balanced tree");
        assert.equal(session.data.statistics().nodeCount, 7, "a binary tree of height 2");
    });

    it("opens the dataset again", async () => {
        const store = reloadBeforeFirstWrite({ kind: "dataset", dataset: "karate" });
        const session = await openedSession(store);
        assert.equal(store.get().project?.name, "Zachary's karate club");
        assert.equal(session.data.statistics().nodeCount, 34);
    });

    for (const opened of [
        { kind: "dataset", dataset: "no-such-dataset" },
        { kind: "generator", generator: "no-such-generator", params: {} },
    ] satisfies Opener[]) {
        it(`lands on the start screen when the catalog has no ${opened.kind} by that name`, async () => {
            const store = reloadBeforeFirstWrite(opened);
            await screen.findByRole("button", { name: "Open network data" });
            assert.isNull(store.get().project);
            assert.isNull(store.get().opened);
        });
    }
});

describe("a file taken in again", () => {
    it("replaces the same file at once, and offers to replace it with a file of the same columns", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await commands.chooseNextFile("friends.csv", "text/csv", FRIENDS_CSV);
        const session = await openBy(store, () => userEvent.keyboard("{Control>}o{/Control}"));
        assert.equal(session.data.statistics().nodeCount, 3);

        await commands.chooseNextFile("friends.csv", "text/csv", FRIENDS_CSV);
        await userEvent.keyboard("{Control>}o{/Control}");
        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Replaced friends\.csv with friends\.csv/);
        });
        assert.isNull(store.get().joining, "the same file needs no join screen");
        assert.equal(session.data.sources().length, 1);

        await commands.chooseNextFile("march.csv", "text/csv", MARCH_CSV);
        await userEvent.keyboard("{Control>}o{/Control}");
        const joining = await waitFor(() => {
            const held = store.get().joining;
            assert.isNotNull(held, "another file opens the join screen");
            return held;
        });
        assert.equal(joining.name, "march.csv");
        assert.equal(joining.matches, session.data.sources()[0]?.key, "it offers to replace the file it matches");
    });
});

describe("Paste", () => {
    it("says the clipboard is empty when there is nothing on it", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await commands.chooseNextFile("friends.csv", "text/csv", FRIENDS_CSV);
        const session = await openBy(store, () => userEvent.keyboard("{Control>}o{/Control}"));
        await navigator.clipboard.writeText("  ");
        await userEvent.keyboard("{Control>}v{/Control}");
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Clipboard empty");
        });
        assert.equal(session.data.sources().length, 1, "nothing was added");
    });
});
