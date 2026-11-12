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

describe("a network load reopened from autosave", () => {
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
        const card = await screen.findByRole("button", { name: /^NDEx/ });
        await userEvent.click(card);
        const form = await screen.findByRole("form", { name: "Network data" });
        await userEvent.type(within(form).getByRole("textbox", { name: "Network UUID" }), WP5483);
        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        const { element, session } = openedElement();
        assert.strictEqual(session.data.statistics().nodeCount, 57);

        // Leave once autosave has written the work, as a reload ends the page.
        await waitFor(() => {
            assert.strictEqual(element.autosaver.status.state, "saved");
        });
        const { entry } = element.autosaver.status;
        const named = first.store.get().project?.name;
        first.view.unmount();
        await waitFor(async () => {
            const kept = (await listAutosaves(WORKSPACE_AUTOSAVE_KEY)).find((each) => each.id === entry);
            assert.isTrue(kept !== undefined && !kept.live, "the work is not kept yet");
        });

        const second = mountWorkspace();
        await openBy(second.store, () => Promise.resolve());
        const reopened = openedElement();
        assert.strictEqual(reopened.session.data.statistics().nodeCount, 57);
        assert.strictEqual(second.store.get().project?.name, named, "the header keeps its name");
        assert.deepEqual(reopened.session.data.pendingSourceLoads(), []);
        assert.isNull(screen.queryByRole("button", { name: "Approve" }));
        assert.isNull(screen.queryByRole("list", { name: "Waiting loads" }));
    });

    it("keeps an edited load's new settings through a reload, with no Approve", async () => {
        const first = mountWorkspace();
        await userEvent.click(await screen.findByRole("button", { name: "Open network data" }));
        await userEvent.click(await screen.findByRole("button", { name: /^NDEx/ }));
        const form = await screen.findByRole("form", { name: "Network data" });
        await userEvent.type(within(form).getByRole("textbox", { name: "Network UUID" }), WP5483);
        await userEvent.click(within(form).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        const { element, session } = openedElement();
        const [{ key, name }] = session.data.sources();

        const row = await screen.findByRole("listitem", { name: /NDEx/ });
        await userEvent.click(row.querySelector(".dp-source-main") ?? row);
        const panel = await screen.findByRole("complementary", { name: "Inspector" });
        await userEvent.click(await within(panel).findByRole("button", { name: "Edit source" }));
        const edit = await screen.findByRole("form", { name: "Network data" });
        const limit = within(edit).getByLabelText("Limit");
        await userEvent.clear(limit);
        await userEvent.type(limit, "100");
        await userEvent.click(within(edit).getByRole("button", { name: "Load" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("form", { name: "Network data" }));
        });
        assert.strictEqual(session.data.sourceSettings(key)?.limits?.maxNodes, 100);
        assert.strictEqual(session.data.sources()[0].name, name, "a new limit reads the same network: same name");

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
        const [source] = reopened.session.data.sources();
        assert.strictEqual(reopened.session.data.sourceSettings(source.key)?.limits?.maxNodes, 100);
        assert.deepEqual(reopened.session.data.pendingSourceLoads(), []);
        assert.isNull(screen.queryByRole("button", { name: "Approve" }));
    });
});
