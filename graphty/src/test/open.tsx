/**
 * How a real-element test waits for an open: the workspace's `opened`, which settles once the
 * load is read and focus handed on. Never the node count, which arrives before the rest of an
 * open (styles, history, framing, focus), so a test that waits on it acts on a half-opened
 * workspace (#3544).
 */

import type { GraphSession } from "@graphty/graphty-element/session";

import { createWorkspaceStore, type WorkspaceStore } from "../workspace/state/store";
import { Workspace } from "../workspace/Workspace";
import { pickSample } from "./samples-dialog";
import { render } from "./test-utils";

/**
 * Does what starts an open (a click on a sample, a dataset, Open...), then waits for that open to
 * finish. Waits on the store's own changes, with no deadline of its own: a hang is the test's.
 * What "finished" covers depends on the open (see the store's `opened`): a first graph brought
 * into an empty project settles at its load, with no focus step, and kept work reopened in this
 * tab may move focus a moment later, so a focus assertion there still waits on focus.
 * @param store - the workspace store.
 * @param act - the reader's action that starts the open.
 * @returns the opened project's session; rejects with the load's error when the open failed.
 */
export async function openBy(store: WorkspaceStore, act: () => Promise<unknown>): Promise<GraphSession> {
    const before = store.get().opened;
    // Settles as that open does (resolving with a promise adopts it).
    const finished = new Promise<void>((resolve) => {
        const check = (): void => {
            const { opened } = store.get();
            if (opened !== null && opened !== before) {
                stop();
                resolve(opened);
            }
        };
        const stop = store.subscribe(check);
    });
    await Promise.all([act(), finished]);
    // The opened project's element, not the start page's own graph.
    const session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    )?.session;
    if (session === undefined) {
        throw new Error("the open finished with no element on the page");
    }
    return session;
}

/**
 * Shows the workspace's start screen, clicks a sample's button, as a reader does, and waits for
 * the open to finish (see {@link openBy}).
 * @param sample - the sample's name on its button ("Open the <sample> sample").
 * @param store - the workspace store; a fresh one by default.
 * @returns the opened project's session and the store.
 */
export async function openSampleFromStart(
    sample: string,
    store: WorkspaceStore = createWorkspaceStore(),
): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    render(<Workspace store={store} />);
    const session = await openBy(store, () => pickSample(sample));
    return { session, store };
}
