/**
 * A network load reopened from the reader's own autosave just loads (issue #6210): Open network
 * data on the start page, NDEx's WikiPathways WP5483 by its UUID, Load, then a reload, which reopens
 * the work through graphty-element's autosave with every node drawn and no Approve row asking to
 * load it again. Real element, real IndexedDB, real input; NDEx answers from its recording.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, listAutosaves, replayFetch } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { openBy } from "../../../test/open";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { WORKSPACE_AUTOSAVE_KEY } from "../../autosave/autosave";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
// What www.ndexbio.org answered for WikiPathways WP5483 (graph-io's scripts/record-ndex.ts).
import ndexRecordings from "./ndex-wp5483.json";

type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** autosave's database (graphty-element's AUTOSAVE_DATABASE). */
const DATABASE = "graphty-autosave";

/** NDEx's origin, the only one answered from the recording. */
const NDEX = "https://www.ndexbio.org";

/** WikiPathways WP5483's UUID on NDEx, the network the recording holds. */
const WP5483 = "86719f5b-1439-11f0-9806-005056ae3c32";

/**
 * Deletes autosave's database and this tab's session storage.
 * @returns settles once the database is gone.
 */
function forgetAutosave(): Promise<void> {
    sessionStorage.clear();
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE);
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(request.error ?? new Error("the autosave database was not deleted"));
        };
    });
}

/**
 * Mounts the workspace with autosave on, as the application does.
 * @returns the store and the render result.
 */
function mountWorkspace(): { readonly store: WorkspaceStore; readonly view: ReturnType<typeof render> } {
    const store = createWorkspaceStore({ autosave: true });
    return { store, view: render(<Workspace store={store} />) };
}

/**
 * The opened project's element and its session, not the start page's own graph.
 * @returns the element and its session.
 */
function openedElement(): { element: ElementUnderTest; session: GraphSession } {
    const element = document.querySelector<ElementUnderTest>("graphty-element:not([data-start-page])");
    if (element === null) {
        throw new Error("no opened element");
    }
    return { element, session: element.session };
}

/**
 * Picks an option of a dropdown in the form by clicking it open and clicking the option.
 * @param form - the form.
 * @param label - the dropdown's label.
 * @param option - the option's text.
 */
async function pick(form: HTMLElement, label: string, option: string): Promise<void> {
    await userEvent.click(within(form).getByRole("combobox", { name: label }));
    // The list opens in a portal, outside the form.
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("a network load reopened from autosave", () => {
    withFeatures(["network-data"]);

    beforeEach(async () => {
        await forgetAutosave();
        const replay = replayFetch(ndexRecordings);
        const realFetch = globalThis.fetch;
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
            new URL(input instanceof Request ? input.url : input, location.href).origin === NDEX
                ? replay(input, init)
                : realFetch(input, init),
        );
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await forgetAutosave();
    });

    it("draws every node it loaded and asks for no approval", async () => {
        const first = mountWorkspace();
        await userEvent.click(await screen.findByRole("button", { name: "Open network data" }));
        const form = await screen.findByRole("form", { name: "Network data" });
        await pick(form, "Kind", "NDEx");
        await userEvent.type(within(form).getByRole("textbox", { name: "Network UUID" }), WP5483);
        // Load opens the project, and the graph comes in.
        await openBy(first.store, () => userEvent.click(within(form).getByRole("button", { name: "Load" })));
        assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        assert.strictEqual(first.store.get().project?.name, "NDEx");
        const { element, session } = openedElement();
        assert.strictEqual(session.data.statistics().nodeCount, 57);

        // Leave once autosave has written the work, as a reload ends the page.
        await waitFor(() => {
            assert.strictEqual(element.autosaver.status.state, "saved");
        });
        const { entry } = element.autosaver.status;
        first.view.unmount();
        await waitFor(async () => {
            const kept = (await listAutosaves(WORKSPACE_AUTOSAVE_KEY)).find((each) => each.id === entry);
            assert.isTrue(kept !== undefined && !kept.live, "the work is not kept yet");
        });

        const second = mountWorkspace();
        await openBy(second.store, () => Promise.resolve());
        const reopened = openedElement();
        assert.strictEqual(reopened.session.data.statistics().nodeCount, 57);
        assert.deepEqual(reopened.session.data.pendingSourceLoads(), []);
        assert.isNull(screen.queryByRole("button", { name: "Approve" }));
        assert.isNull(screen.queryByRole("list", { name: "Waiting loads" }));
    });
});
