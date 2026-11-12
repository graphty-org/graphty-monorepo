/**
 * A page reload in a real-element test, as the application has it: autosave on, the workspace
 * unmounted once the work is kept, and mounted again in the same tab, where this tab's work reopens
 * by itself (so the same project, with its id, and the Assistant chats kept with it).
 */

import { listAutosaves } from "@graphty/graphty-element/session";
import { assert } from "vitest";

import { WORKSPACE_AUTOSAVE_KEY } from "../workspace/autosave/autosave";
import { createWorkspaceStore, type WorkspaceStore } from "../workspace/state/store";
import { Workspace } from "../workspace/Workspace";
import { openBy } from "./open";
import { pickSample } from "./samples-dialog";
import { render, waitFor } from "./test-utils";

/**
 * Deletes autosave's database, so a test starts with nothing kept: kept work changes what the
 * start screen shows. Run it before the tab's session storage is cleared.
 * @returns settles once the database is gone.
 */
export function forgetAutosave(): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase("graphty-autosave");
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(request.error ?? new Error("the autosave database was not deleted"));
        };
    });
}

/** A mounted workspace with autosave on. */
export interface AutosavedWorkspace {
    readonly store: WorkspaceStore;
    readonly view: ReturnType<typeof render>;
}

/**
 * Mounts the workspace with autosave on, as the application does, and opens a sample.
 * @param sample - the sample's name.
 * @returns the store and the render result.
 */
export async function openAutosaved(sample: string): Promise<AutosavedWorkspace> {
    const store = createWorkspaceStore({ autosave: true });
    const view = render(<Workspace store={store} />);
    await openBy(store, () => pickSample(sample));
    return { store, view };
}

/**
 * Waits until autosave has kept the work, unmounts the workspace as a reload ends the page, mounts
 * it again and waits for this tab's work to reopen.
 * @param before - the workspace to leave.
 * @returns the workspace after the reload.
 */
export async function reload(before: AutosavedWorkspace): Promise<AutosavedWorkspace> {
    const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    );
    if (element === null) {
        throw new Error("no opened element");
    }
    const entry = await waitFor(() => {
        const { status } = element.autosaver;
        assert.strictEqual(status.state, "saved");
        assert.isNotNull(status.entry);
        return status.entry;
    });
    before.view.unmount();
    await waitFor(async () => {
        const kept = (await listAutosaves(WORKSPACE_AUTOSAVE_KEY)).find((each) => each.id === entry);
        assert.isTrue(kept !== undefined && !kept.live, "the work is not kept yet");
    });
    const store = createWorkspaceStore({ autosave: true });
    const view = render(<Workspace store={store} />);
    await openBy(store, () => Promise.resolve());
    return { store, view };
}
