/**
 * A page reload in a real-element test, as the application has it: autosave on, the workspace
 * unmounted once the work is kept, and mounted again in the same tab, where this tab's work reopens
 * by itself (so the same project, with its id, and the Assistant chats kept with it).
 */

import { listAutosaves } from "@graphty/graphty-element/session";
import { StrictMode } from "react";
import { assert } from "vitest";

import { fingerprintChanges, screenFingerprint } from "../../acceptance/screen-fingerprint.mjs";
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

/**
 * Says this test expects a restore to lose a kept reference (restoreCheck.ts), so the test setup
 * does not fail it for that. Say why in a comment where it is called.
 */
export function expectRestoreMiss(): void {
    (globalThis as { __GRAPHTY_RESTORE_MISS_EXPECTED__?: boolean }).__GRAPHTY_RESTORE_MISS_EXPECTED__ = true;
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

/** How a test reloads. */
export interface ReloadOptions {
    /**
     * Empty this tab's session storage before the page comes back, as Safari does when it ends a
     * background tab and loads it again (issue #9655). The work then comes back through
     * graphty-element's autosave alone.
     */
    readonly lostSession?: boolean;
    /**
     * What the reader saw that the test expects a reload to lose, by the names {@link screenNow}
     * lists, each with the gap issue that tracks it in a comment where it is passed.
     */
    readonly lost?: readonly string[];
    /**
     * Unmount and mount the workspace again at once, with no page reload and without waiting for
     * autosave to keep the work: what a Vite hot swap of the workspace does to a page in
     * development (the 2026-11-22 loss). Session storage stays as it is.
     */
    readonly remount?: boolean;
}

/**
 * What the reader sees and has picked: open dialogs, lists and named regions, pressed buttons,
 * selected tabs, tree items and options, the current item, expanded controls, and the fields and
 * boxes inside what is open (acceptance/screen-fingerprint.mjs, which the dry run's reload after
 * every route reads too).
 * @returns the list, sorted, each once.
 */
export function screenNow(): string[] {
    return screenFingerprint();
}

/**
 * Waits until autosave has kept the work, unmounts the workspace as a reload ends the page, mounts
 * it again and waits for this tab's work to reopen with the screen as the reader left it: every
 * entry of {@link screenNow} the same, none gone and none changed (a picked row that comes back as
 * another is both), less what the test names in `lost`.
 * @param before - the workspace to leave.
 * @param options - how the reload goes.
 * @returns the workspace after the reload.
 */
export async function reload(before: AutosavedWorkspace, options: ReloadOptions = {}): Promise<AutosavedWorkspace> {
    const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    );
    if (element === null) {
        throw new Error("no opened element");
    }
    const shown = screenNow();
    if (options.remount === true) {
        before.view.unmount();
    } else {
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
        if (options.lostSession === true) {
            sessionStorage.clear();
        }
    }
    const store = createWorkspaceStore({ autosave: true });
    // Under StrictMode, as main.tsx mounts the app: its dev-only second run of each effect is
    // where a card that adopts reopened work at mount could write it (issue #9655 review).
    const view = render(
        <StrictMode>
            <Workspace store={store} />
        </StrictMode>,
    );
    await openBy(store, () => Promise.resolve());
    await waitFor(() => {
        const changes = fingerprintChanges(shown, screenNow(), options.lost);
        assert.deepStrictEqual(
            changes,
            { missing: [], appeared: [] },
            `the screen after the reload is the screen the reader left: ${JSON.stringify(changes)}`,
        );
    });
    return { store, view };
}
