/**
 * What the source-steps tests share: the workspace on the REAL graphty-element, a dropped file, and
 * a pick in a select by clicks.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { StrictMode } from "react";
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
 * @param strict - mount under StrictMode, as main.tsx does in development.
 * @returns the store and the session.
 */
export async function emptyProject(strict = false): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore({ project: { name: "Doors", id: 1 }, place: "data" });
    render(
        strict ? (
            <StrictMode>
                <Workspace store={store} />
            </StrictMode>
        ) : (
            <Workspace store={store} />
        ),
    );
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

/**
 * The table's body row with a cell that reads a text.
 * @param grid - the table.
 * @param text - the text.
 * @returns the row.
 */
export function rowWith(grid: HTMLElement, text: string): HTMLElement {
    const row = within(grid)
        .getAllByRole("row")
        .find((each) =>
            [...within(each).queryAllByRole("rowheader"), ...within(each).queryAllByRole("gridcell")].some(
                (cell) => cell.textContent === text,
            ),
        );
    assert.isDefined(row, `a row for ${text}`);
    if (row === undefined) {
        throw new Error(`no row for ${text}`);
    }
    return row;
}

/**
 * Clicks a row's first cell, as a reader selects it.
 * @param row - the row.
 */
export async function select(row: HTMLElement): Promise<void> {
    await userEvent.click(within(row).getByRole("rowheader"));
}

/**
 * What a count of the preview reads, by its words.
 * @param preview - the preview section.
 * @param label - the count's words.
 * @returns its number as shown.
 */
export function count(preview: HTMLElement, label: string): string {
    const term = within(preview)
        .getAllByRole("term")
        .find((each) => each.textContent === label);
    assert.isDefined(term, `a count reads ${label}`);
    return term?.parentElement === null || term?.parentElement === undefined
        ? ""
        : (within(term.parentElement).getByRole("definition").textContent ?? "");
}
