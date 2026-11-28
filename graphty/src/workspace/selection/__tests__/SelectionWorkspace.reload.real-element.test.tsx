/**
 * The selection workspace comes back after a reload, with what the reader was doing in it (issue
 * #9655: Safari ended the background tab, reloaded it, and the open workspace was gone). Real
 * element, real autosave, real clicks and typing; each case runs with this tab's session storage
 * kept and with it emptied, as Safari empties it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { expectRestoreMiss, forgetAutosave, openAutosaved, reload, screenNow } from "../../../test/reload";
import { screen, waitFor, within } from "../../../test/test-utils";

/** Starts with nothing kept: no autosaved work and nothing in this tab's session storage. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

/**
 * The opened element's session.
 * @returns it.
 */
async function sessionNow(): Promise<GraphSession> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(found);
        return found;
    });
}

/**
 * The open workspace, waited for.
 * @returns it.
 */
async function ws(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}

/**
 * The cards in the open workspace.
 * @returns them.
 */
const cards = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(".sel-ws .sel-card")];

/**
 * Picks a value in the value picker, opening the last empty card's Value first if it is shut.
 * @param name - what to type.
 */
async function pickValue(name: string): Promise<void> {
    if (screen.queryByRole("combobox", { name: "Find attributes, results" }) === null) {
        const empty = [...document.querySelectorAll<HTMLElement>(".sel-ws [data-new-step] [data-first-focus]")].at(-1);
        assert.isDefined(empty, "an empty card's Value");
        await userEvent.click(empty);
    }
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard(name);
    await userEvent.keyboard("{Enter}");
}

/**
 * The Degree card's lower end, waited for.
 * @returns its field.
 */
async function degreeFrom(): Promise<HTMLInputElement> {
    return waitFor(() => {
        const [card] = cards();
        assert.isDefined(card, "a card");
        return within(card).getByRole<HTMLInputElement>("textbox", { name: "Degree from, number" });
    });
}

/**
 * Types the Degree card's lower end.
 * @param value - the lower end.
 */
async function typeDegreeFrom(value: string): Promise<void> {
    const from = await degreeFrom();
    await userEvent.clear(from);
    await userEvent.type(from, `${value}{Enter}`);
}

/**
 * Waits for the first card's count to read what was typed, so what the reader sees is settled
 * before the page reloads: Les Miserables has 41 nodes of degree 5 or more and 22 of 10 or more.
 * @param count - the count the card shows.
 */
async function cardCounts(count: number): Promise<void> {
    await screen.findAllByRole("region", { name: `A, ${String(count)} of 77 nodes` });
}

/** Opens the Data place's Filters, with the sample's load drawn. */
async function openDataPlace(): Promise<void> {
    await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".dp-source-sections [data-filters-plus]"), "the load's Filters");
    });
}

/**
 * The degree a filter's first card keeps from, as graphty-element holds the condition.
 * @param session - the session.
 * @returns the lower end, or undefined.
 */
function writtenFrom(session: GraphSession): unknown {
    return JSON.stringify(session.visibility.conditions[0]?.rule ?? null).match(/"min":(\d+)/)?.[1];
}

describe.each([{ lostSession: false }, { lostSession: true }])(
    "the selection workspace across a reload (session storage emptied: $lostSession)",
    ({ lostSession }) => {
        beforeAll(async () => {
            await page.viewport(1440, 900);
        });
        beforeEach(forget);
        afterEach(forget);

        it("a style layer's Which nodes reopens on that layer with the step added", async () => {
            const before = await openAutosaved("Les Miserables");
            const session = await sessionNow();
            const layer = await session.styles.add({
                name: "Busy",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#d55e00" },
            });
            await session.styles.settled();
            const tree = await screen.findByRole("tree", { name: "Style layers" });
            await userEvent.click(page.elementLocator(tree).getByRole("treeitem", { name: /^Busy, / }));
            await userEvent.click(page.getByRole("button", { name: /^Style Nodes\.\.\./ }));
            await ws();
            await pickValue("Degree");
            await typeDegreeFrom("5");
            await cardCounts(41);
            await waitFor(() => {
                const selector = session.styles.get(layer.id)?.selector;
                assert.include(JSON.stringify(selector), '"min":5', "the step is written to the layer");
            });

            const after = await reload(before, { lostSession });
            const open = await ws();
            assert.include(open.querySelector(".sel-ws-head")?.textContent ?? "", "Busy");
            assert.strictEqual((await degreeFrom()).value, "5");
            after.view.unmount();
        });

        it("a new filter not yet Done reopens with its pick, unwritten; Done then writes one filter", async () => {
            const before = await openAutosaved("Les Miserables");
            const session = await sessionNow();
            await openDataPlace();
            await userEvent.click(page.getByRole("button", { name: "Add filter", exact: true }));
            await ws();
            await pickValue("Degree");
            await typeDegreeFrom("5");
            await cardCounts(41);
            assert.lengthOf(session.visibility.conditions, 0, "nothing is written before Done");

            const after = await reload(before, { lostSession });
            const open = await ws();
            const reopened = await sessionNow();
            assert.strictEqual((await degreeFrom()).value, "5");
            assert.lengthOf(reopened.visibility.conditions, 0, "still nothing written");
            assert.strictEqual(reopened.visibility.nodes.size, 77, "nothing is filtered yet");
            await userEvent.click(page.elementLocator(open).getByRole("button", { name: /^Done/ }));
            await waitFor(() => {
                assert.lengthOf(reopened.visibility.conditions, 1, "Done writes one filter");
            });
            await waitFor(() => {
                assert.isBelow(reopened.visibility.nodes.size, 77, "the filter now hides nodes");
            });
            after.view.unmount();
        });

        it("a new filter with nothing picked yet closes on reload, and leaves the panels usable", async () => {
            const before = await openAutosaved("Les Miserables");
            await openDataPlace();
            const was = screenNow();
            await userEvent.click(page.getByRole("button", { name: "Add filter", exact: true }));
            await ws();
            await screen.findByRole("region", { name: "Matches" });
            // The empty card holds nothing graphty-element could keep: its workspace goes with it.
            const workspace = screenNow().filter((each) => !was.includes(each));
            // A loss by design: the card holds nothing to keep, so its workspace's key names nothing.
            expectRestoreMiss();

            const after = await reload(before, { lostSession, lost: workspace });
            await waitFor(() => {
                assert.isNull(document.querySelector(".sel-ws"), "no workspace without its card");
                assert.isNull(document.querySelector("[inert]"), "nothing is left inert");
            });
            await userEvent.click(page.getByRole("button", { name: "Add filter", exact: true }));
            await ws();
            after.view.unmount();
        });

        it("a written filter being changed reopens with the change, and Cancel goes back to the written one", async () => {
            const before = await openAutosaved("Les Miserables");
            const session = await sessionNow();
            await openDataPlace();
            await userEvent.click(page.getByRole("button", { name: "Add filter", exact: true }));
            const modal = await ws();
            await pickValue("Degree");
            await typeDegreeFrom("5");
            await cardCounts(41);
            await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Done/ }));
            await waitFor(() => {
                assert.isNull(document.querySelector(".sel-ws"), "Done closes it");
                assert.strictEqual(writtenFrom(session), "5");
            });
            const list = await screen.findByRole("list", { name: "Filters" });
            await userEvent.click(list.querySelector<HTMLElement>(".dp-filter-name") ?? document.body);
            await ws();
            await typeDegreeFrom("10");
            await cardCounts(22);
            assert.strictEqual(writtenFrom(session), "5", "the change is a draft");

            const after = await reload(before, { lostSession });
            const open = await ws();
            const reopened = await sessionNow();
            assert.strictEqual((await degreeFrom()).value, "10");
            assert.strictEqual(writtenFrom(reopened), "5", "still the written filter");
            await userEvent.click(page.elementLocator(open).getByRole("button", { name: /^Cancel/ }));
            await waitFor(() => {
                assert.isNull(document.querySelector(".sel-ws"), "Cancel closes it");
            });
            assert.strictEqual(writtenFrom(reopened), "5");
            assert.deepStrictEqual(reopened.visibility.openDrafts(), [], "the draft is dropped");
            after.view.unmount();
        });
    },
);
