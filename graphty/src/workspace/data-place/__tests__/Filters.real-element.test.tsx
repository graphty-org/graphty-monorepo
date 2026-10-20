/**
 * The Filters section on the REAL graphty-element: condition cards added with "+", edited by
 * typing, switched between Select and Hide, and removed, each through real input. Every assertion
 * reads the element (its filter steps, what is visible, what is selected) or what the card shows.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "a", score: 1, dept: "east" },
    { id: "b", score: 2, dept: "west" },
    { id: "c", score: 3, dept: "east" },
    { id: "d", score: 4, dept: "north" },
    { id: "e", score: 5, dept: "east" },
];
const EDGES = [
    { source: "a", target: "b", weight: 1 },
    { source: "b", target: "c", weight: 5 },
    { source: "c", target: "d", weight: 7 },
    { source: "d", target: "e", weight: 2 },
];

/**
 * Renders the workspace on the Data place with a small graph loaded.
 * @returns the session.
 */
async function openWithGraph(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Five", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return session;
}

/**
 * Adds a card on one field through the Filters "+".
 * @param name - the field's name.
 * @returns the card.
 */
async function addCard(name: string): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: "Add filter" }, { timeout: TIMEOUT_MS }));
    await userEvent.click(await screen.findByRole("menuitem", { name }));
    return screen.findByRole("group", { name });
}

/**
 * Types into a card's box and commits with Enter.
 * @param card - the card.
 * @param box - the box's name.
 * @param text - what to type.
 */
async function typeInto(card: HTMLElement, box: string, text: string): Promise<void> {
    const input = within(card).getByRole("textbox", { name: box });
    await userEvent.clear(input);
    await userEvent.type(input, `${text}{Enter}`);
}

/**
 * The count a card shows.
 * @param card - the card.
 * @returns "X of Y".
 */
const countOf = (card: HTMLElement): string => within(card).getByTestId("card-count").textContent;

describe("the Filters section's condition cards", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("hides what a node card does not hold, shows X of Y, then selects instead", async () => {
        const session = await openWithGraph();
        const card = await addCard("score");
        await typeInto(card, "Min", "3");

        await waitFor(() => {
            assert.deepEqual(
                session.visibility.steps.map((s) => [s.on, s.rule]),
                [[true, { kind: "range", attribute: "data.score", min: 3, max: 5 }]],
            );
        });
        // The card the element wrote is the one drawn: its count, Hide picked.
        const written = await screen.findByRole("group", { name: "score" });
        await waitFor(() => {
            assert.strictEqual(countOf(written), "3 of 5");
        });
        assert.isTrue(within(written).getByRole<HTMLInputElement>("radio", { name: "Hide" }).checked);
        assert.strictEqual(session.visibility.summary.visibleNodes, 3);

        await userEvent.click(within(written).getByText("Select"));
        await waitFor(() => {
            assert.isFalse(session.visibility.steps[0]?.on);
            assert.strictEqual(session.visibility.summary.visibleNodes, 5);
            assert.sameMembers([...session.selection.nodes], ["c", "d", "e"]);
        });
    });

    it("filters edges on an edge column, and remove clears the step", async () => {
        const session = await openWithGraph();
        const card = await addCard("weight");
        await typeInto(card, "Min", "5");
        await waitFor(() => {
            assert.strictEqual(session.visibility.steps[0]?.rule.kind, "edges");
            assert.strictEqual(session.visibility.summary.visibleEdges, 2);
        });
        const written = await screen.findByRole("group", { name: "weight" });
        await waitFor(() => {
            assert.strictEqual(countOf(written), "2 of 4");
        });

        await userEvent.click(within(written).getByRole("button", { name: "Remove weight" }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.steps, 0);
            assert.strictEqual(session.visibility.summary.visibleEdges, 4);
        });
    });

    it("writes a category card once a value is picked", async () => {
        const session = await openWithGraph();
        const card = await addCard("dept");
        // No value yet: nothing is written.
        assert.lengthOf(session.visibility.steps, 0);
        await userEvent.click(within(card).getByRole("textbox", { name: "Values" }));
        await userEvent.click(await screen.findByRole("option", { name: "east (3)" }));
        await waitFor(() => {
            assert.deepEqual(session.visibility.steps[0]?.rule, {
                kind: "categories",
                attribute: "data.dept",
                values: ["east"],
            });
            assert.strictEqual(session.visibility.summary.visibleNodes, 3);
        });
    });
});
