/**
 * What the source-steps tests share: the workspace on the REAL graphty-element, a dropped file, and
 * a pick in a select by clicks.
 */

import type { GraphSession, SourceDraft, SourceStepRow } from "@graphty/graphty-element/session";
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
 * Stages a file beside the graph, drawing nothing: a waiting source, as a project saved with one holds it
 * (a dropped file is drawn at once). Its key is guessed as a dropped file's is.
 * @param name - the file's name.
 * @param text - its contents.
 * @returns the staged source's key.
 */
export async function stageFile(name: string, text: string): Promise<string> {
    const session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
        "graphty-element:not([data-start-page])",
    )?.session;
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session.data.stage({ type: "csv", config: { data: text }, name }, { guess: "values" });
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
 * Opens the join workspace with Shift+J, as a reader does over the window.
 * @returns the workspace.
 */
export async function openJoins(): Promise<HTMLElement> {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("{Shift>}J{/Shift}");
    return screen.findByRole("dialog", { name: "Join" });
}

/**
 * Picks the sources of the open card, or of a further match of it.
 * @param modal - the workspace.
 * @param one - the first one.
 * @param two - the second one.
 * @param match - the match's place, from 1.
 */
export async function pickSources(modal: HTMLElement, one: string, two: string, match = 1): Promise<void> {
    const name = match === 1 ? "Source" : `Match ${String(match)} source`;
    await choose(modal, `${name} 1`, one);
    await choose(modal, `${name} 2`, two);
}

/**
 * Picks one field in a field list, whose options also say each field's facts.
 * @param modal - the workspace.
 * @param name - the list.
 * @param field - the field.
 */
export async function pickField(modal: HTMLElement, name: string, field: string): Promise<void> {
    await userEvent.click(within(modal).getByRole("combobox", { name }));
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${field}( |$)`) }));
}

/**
 * Picks the fields of the open card, or of a further match of it.
 * @param modal - the workspace.
 * @param one - the first source's.
 * @param two - the second one's, or null where it is new nodes.
 * @param match - the match's place, from 1.
 */
export async function pickFields(modal: HTMLElement, one: string, two: string | null, match = 1): Promise<void> {
    const name = match === 1 ? "Field" : `Match ${String(match)} field`;
    await pickField(modal, `${name} 1`, one);
    if (two !== null) {
        await pickField(modal, `${name} 2`, two);
    }
}

/**
 * Adds a match to the open card.
 * @param modal - the workspace.
 * @param place - its place, from 2.
 * @param one - its first source and field.
 * @param two - its second source and field, the field null for new nodes.
 */
export async function addMatch(
    modal: HTMLElement,
    place: number,
    one: readonly [string, string],
    two: readonly [string, string | null],
): Promise<void> {
    await userEvent.click(within(modal).getByRole("button", { name: "+ Match" }));
    await pickSources(modal, one[0], two[0], place);
    await pickFields(modal, one[1], two[1], place);
}

/**
 * Says how the open card joins.
 * @param modal - the workspace.
 * @param words - the way, as the card words it.
 */
export async function joinAs(modal: HTMLElement, words: string): Promise<void> {
    await userEvent.click(await within(modal).findByRole("radio", { name: words }));
}

/**
 * The ways the open card can join, as it words them.
 * @param modal - the workspace.
 * @returns them.
 */
export function waysToJoin(modal: HTMLElement): string[] {
    const group = within(modal).queryByRole("radiogroup", { name: "Join type" });
    return group === null
        ? []
        : within(group)
              .getAllByRole<HTMLInputElement>("radio")
              .map((radio) => radio.labels?.[0]?.textContent ?? "");
}

/**
 * The join type the open card is on, as it words it.
 * @param modal - the workspace.
 * @returns its label, or null while none is picked.
 */
export function checkedWay(modal: HTMLElement): string | null {
    const group = within(modal).queryByRole("radiogroup", { name: "Join type" });
    const radio = group === null ? null : within(group).queryByRole<HTMLInputElement>("radio", { checked: true });
    return radio === null ? null : (radio.labels?.[0]?.textContent ?? "");
}

/**
 * The ways to join the open card offers that can be picked: those whose rows match.
 * @param modal - the workspace.
 * @returns their labels.
 */
export function pickableWays(modal: HTMLElement): string[] {
    const group = within(modal).queryByRole("radiogroup", { name: "Join type" });
    return group === null
        ? []
        : within(group)
              .getAllByRole<HTMLInputElement>("radio")
              .filter((radio) => !radio.disabled)
              .map((radio) => radio.labels?.[0]?.textContent ?? "");
}

/**
 * Unfolds the open card's rarer options.
 * @param modal - the workspace.
 */
export async function advanced(modal: HTMLElement): Promise<void> {
    await userEvent.click(await within(modal).findByRole("button", { name: "Expand Advanced" }));
}

/**
 * The joins listed: the workspace's cards by their titles, or the sidebar's lines under Join +.
 * @param where - the workspace, or the Data place.
 * @returns their titles or lines.
 */
export function joinLines(where: HTMLElement): string[] {
    const cards = within(where).queryByRole("group", { name: "Joins" });
    if (cards !== null) {
        return [...cards.querySelectorAll("[data-card-id] .cm-card-title")].map((title) => title.textContent ?? "");
    }
    const list = within(where).queryByRole("grid", { name: "Joins" });
    return list === null
        ? []
        : [...list.querySelectorAll("[data-id]")].map(
              (row) =>
                  `${row.querySelector(".cm-page-name")?.textContent ?? ""}${row.querySelector("[data-rest]")?.textContent ?? ""}`,
          );
}

/**
 * Opens a join's card in the workspace by unfolding it, as a reader does; an open one stays open.
 * @param modal - the workspace.
 * @param line - its title.
 */
export async function selectJoin(modal: HTMLElement, line: string): Promise<void> {
    const fold = within(modal).queryByRole("button", { name: `Expand ${line}` });
    if (fold !== null) {
        await userEvent.click(fold);
    }
}

/**
 * Removes the open card by its x, as a reader does.
 * @param modal - the workspace.
 */
export async function removeOpen(modal: HTMLElement): Promise<void> {
    const card = await waitFor(() => {
        const open = modal.querySelector<HTMLElement>("[data-card-id]:not([data-folded])");
        assert.isNotNull(open, "an open card");
        return open;
    });
    if (card === null) {
        throw new Error("no open card");
    }
    await userEvent.click(within(card).getByRole("button", { name: /^Delete / }));
}

/**
 * Opens the workspace's "..." menu in its header, as a reader does.
 * @param modal - the workspace.
 * @returns the open menu.
 */
export async function headMenu(modal: HTMLElement): Promise<HTMLElement> {
    const head = modal.querySelector<HTMLElement>(".sel-ws-head");
    if (head === null) {
        throw new Error("no header");
    }
    await userEvent.click(within(head).getByRole("button", { name: "More for Join" }));
    return screen.findByRole("menu");
}

/**
 * Runs an item of the workspace's "..." menu, such as Undo, as a reader does.
 * @param modal - the workspace.
 * @param item - the item's name.
 */
export async function fromHeadMenu(modal: HTMLElement, item: string): Promise<void> {
    const menu = await headMenu(modal);
    await userEvent.click(within(menu).getByRole("menuitem", { name: new RegExp(`^${item}`, "u") }));
}

/**
 * Presses Done and waits for the workspace to close.
 * @param modal - the workspace.
 */
export async function done(modal: HTMLElement): Promise<void> {
    await userEvent.click(within(modal).getByRole("button", { name: "Done" }));
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
    });
}

/**
 * The open draft.
 * @param session - the session.
 * @returns it.
 */
export function draftOf(session: GraphSession): SourceDraft {
    const draft = session.data.currentDraft();
    if (draft === null) {
        throw new Error("no draft is open");
    }
    return draft;
}

/**
 * The open draft's join steps.
 * @param session - the session.
 * @returns them.
 */
export function joinsOf(session: GraphSession): readonly SourceStepRow[] {
    return draftOf(session)
        .steps()
        .filter((row) => row.act !== null || row.link !== null || row.extract !== null);
}

/**
 * Waits for the draft's newest step to be as a test needs it.
 * @param session - the session.
 * @param is - what it must be.
 * @param why - the test's words.
 * @returns the step.
 */
export async function newest(
    session: GraphSession,
    is: (step: SourceStepRow) => boolean,
    why: string,
): Promise<SourceStepRow> {
    return waitFor(() => {
        const step = draftOf(session).steps().at(-1);
        assert.isTrue(step !== undefined && is(step), why);
        if (step === undefined) {
            throw new Error(why);
        }
        return step;
    });
}
