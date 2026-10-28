/**
 * A count shown with a control is said through the workspace's status line when it changes: never
 * the words the control opens with, never twice for one change (a recount that briefly has no
 * number and comes back to the same one), and the first count of a thing just added is news.
 * The status line empties on the reader's next key, so browse mode never reads an old message.
 */
import userEvent from "@testing-library/user-event";
import React from "react";
import { assert, describe, it } from "vitest";

import { act, render, screen } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { Workspace } from "../../Workspace";
import { createWorkspaceStore, type WorkspaceStore } from "../store";
import { useAnnounceChange } from "../useAnnounceChange";
import { makeWorkspaceValue, WorkspaceContext } from "../WorkspaceContext";

/**
 * A control that shows some words, and says them as they change.
 * @param props - Component props
 * @param props.words - the words, or null
 * @param props.quietFirst - passed on
 * @returns nothing
 */
function Shows({ words, quietFirst }: Readonly<{ words: string | null; quietFirst?: boolean }>): null {
    useAnnounceChange(words, quietFirst);
    return null;
}

/**
 * Renders a control showing each set of words in turn, and records every write to the status line.
 * @param steps - the words, one render each.
 * @param quietFirst - passed on.
 * @returns every announcement written.
 */
function said(steps: readonly (string | null)[], quietFirst?: boolean): string[] {
    const store: WorkspaceStore = createWorkspaceStore();
    const value = makeWorkspaceValue(store, createRegistry(REGISTRATIONS), null, null);
    const spoken: string[] = [];
    let last = store.get().announced;
    store.subscribe(() => {
        if (store.get().announced !== last) {
            last = store.get().announced;
            spoken.push(store.get().announcement);
        }
    });
    const tree = (words: string | null): React.JSX.Element => (
        <WorkspaceContext.Provider value={value}>
            <Shows words={words} quietFirst={quietFirst} />
        </WorkspaceContext.Provider>
    );
    const { rerender } = render(tree(steps[0]));
    for (const words of steps.slice(1)) {
        rerender(tree(words));
    }
    return spoken;
}

describe("useAnnounceChange", () => {
    it("says a change once, when a recount briefly has no number", () => {
        assert.deepEqual(said(["24 of 24 nodes", null, "15 of 24 nodes", null, "15 of 24 nodes"]), ["15 of 24 nodes"]);
    });

    it("does not say the words a control opens with, even after a loading start", () => {
        assert.deepEqual(said([null, "24 labels", "24 labels, 4 hidden"]), ["24 labels, 4 hidden"]);
    });

    it("says the first count of a thing added while the control is open", () => {
        assert.deepEqual(said([null, null, "24 labels, 4 hidden"], false), ["24 labels, 4 hidden"]);
    });
});

describe("the status line", () => {
    it("empties on the reader's next key, so reading the page later finds no old message", async () => {
        const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
        render(<Workspace store={store} />);
        const words = "Node color added";
        act(() => {
            store.set({ announcement: words });
        });
        const line = await screen.findByText(words);
        assert.equal(line.closest("[role=status]")?.getAttribute("aria-live"), "polite");

        await userEvent.keyboard("{Tab}");

        assert.isNull(screen.queryByText(words));
        assert.equal(store.get().announcement, "");
    });
});
