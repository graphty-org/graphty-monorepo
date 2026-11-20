/**
 * What the source-steps tests share: the workspace on the REAL graphty-element, a dropped file, and
 * a pick in a select by clicks.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Drops a file as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param name - the file's name.
 * @param text - its contents.
 */
export function drop(name: string, text: string): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([text], name, { type: "text/csv" }));
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * An empty project on the Data place, once the element is up.
 * @returns the store and the session.
 */
export async function emptyProject(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore({ project: { name: "Doors", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return { store, session };
}

/**
 * Picks a choice in a select by clicking it open and clicking the option.
 * @param where - where the select is.
 * @param name - the select's name.
 * @param option - the option.
 */
export async function choose(where: HTMLElement, name: string, option: string): Promise<void> {
    await userEvent.click(within(where).getByRole("combobox", { name }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
}
