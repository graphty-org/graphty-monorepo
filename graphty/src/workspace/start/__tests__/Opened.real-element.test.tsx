/**
 * The workspace's `opened` on the REAL graphty-element: a sample opened from the start screen
 * settles it only once the whole open is done -- the graph read, its history started and focus
 * handed to the graph's heading -- and a sample that cannot be read rejects it with the reason.
 * It is what every test waits on after an open, never the node count, which arrives first (#3544).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { openBy } from "../../../test/open";
import { sampleTile } from "../../../test/samples-dialog";
import { render, screen } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { openUrl } from "../open";

describe("opened: an open's whole run", () => {
    it("settles once the sample is read, its history started and focus is on its heading", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await userEvent.click(screen.getByRole("button", { name: sampleTile("Les Miserables") }));
        const { opened } = store.get();
        assert.instanceOf(opened, Promise, "the click started an open the workspace tracks");
        await opened;
        const session = document.querySelector("graphty-element")?.session;
        assert.equal(session?.data.statistics().nodeCount, 77);
        assert.isFalse(session?.canUndo, "opening is not a step to undo");
        assert.equal(document.activeElement?.id, INSPECTOR_TITLE_ID);
        assert.isNull(store.get().notice);
    });

    it("rejects with the load's error when the file cannot be read, as the notice says", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        let failure: unknown;
        await openBy(store, async () => {
            openUrl(store, new URL("/no-such-sample.graphml", location.href).href);
            await Promise.resolve();
        }).catch((error: unknown) => {
            failure = error;
        });
        assert.instanceOf(failure, Error);
        assert.isNull(store.get().project, "a failed open goes back to the start screen");
        assert.isTrue(store.get().notice?.error);
    });
});
