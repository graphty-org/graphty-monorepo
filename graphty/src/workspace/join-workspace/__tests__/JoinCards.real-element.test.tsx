/**
 * The join cards (the `join-workspace` experiment) on the REAL graphty-element, driven by real
 * clicks, keys and a file pick: "+ Join" adds a card asking what each row becomes, nothing picked
 * and the guess tagged; picking an answer shows its match rows with live counts; a match follows
 * a column picked by hand; cards are added and removed; Done joins every card as one undo step and
 * Cancel leaves the graph as it was.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["selection-workspace", "join-workspace"]);

/** Four people. */
const PEOPLE = ["person_id,name,dept", "P1,Ann,Lab", "P2,Bo,Lab", "P3,Cy,Ops", "P4,Di,Ops"].join("\n");

/** Two buildings. */
const BUILDINGS = ["id,name", "b1,North", "b2,South"].join("\n");

/** Five door entries: P1 twice into b1, one unknown building, one unknown person. */
const ENTRIES = ["entry,person,building", "E1,P1,b1", "E2,P1,b1", "E3,P2,b2", "E4,P3,b9", "E5,P9,b1"].join("\n");

/**
 * The workspace on the Data place with the people and the buildings loaded, the join workspace
 * open from Join +, and the door entries held through Table +.
 * @returns the session and the workspace dialog.
 */
async function openCards(): Promise<{ session: GraphSession; dialog: HTMLElement }> {
    await page.viewport(1440, 1000);
    const store = createWorkspaceStore({ project: { name: "Join", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    const people = await session.data.prepare({ type: "csv", config: { data: PEOPLE }, name: "people.csv" });
    await people.load({ mapping: { rowsAre: "nodes", key: "person_id" } });
    const buildings = await session.data.prepare({ type: "csv", config: { data: BUILDINGS }, name: "buildings.csv" });
    await buildings.load({ mode: "merge", mapping: { rowsAre: "nodes", key: "id" } });
    const place = await screen.findByRole("region", { name: "Data place" });
    await userEvent.click(await within(place).findByRole("button", { name: "Join" }));
    const dialog = await screen.findByRole("dialog", { name: "Join" });
    const input = dialog.querySelector<HTMLInputElement>('input[aria-label="Table file"]');
    if (input === null) {
        throw new Error("no Table file input");
    }
    await userEvent.upload(input, new File([ENTRIES], "door_entries.csv", { type: "text/csv" }));
    // The table is held once the header counts it.
    await within(dialog).findByText("1 table");
    return { session, dialog };
}

/**
 * Presses "+ Join" and returns the new card, which has no answer yet.
 * @param dialog - the workspace.
 * @returns the card.
 */
async function addCard(dialog: HTMLElement): Promise<HTMLElement> {
    const before = dialog.querySelectorAll("[data-unpicked]").length;
    const add = within(dialog).getByRole("button", { name: /^Join/ });
    await waitFor(() => {
        assert.isFalse((add as HTMLButtonElement).disabled);
    });
    await userEvent.click(add);
    return waitFor(() => {
        const cards = dialog.querySelectorAll<HTMLElement>("[data-unpicked]");
        assert.strictEqual(cards.length, before + 1);
        return cards[cards.length - 1];
    });
}

/**
 * Picks what each row of a card's table becomes, and returns the card its step now draws.
 * @param dialog - the workspace.
 * @param card - the card.
 * @param answer - the answer's label.
 * @param outcome - the answer's code, as the card carries it.
 * @returns the card.
 */
async function pickAnswer(
    dialog: HTMLElement,
    card: HTMLElement,
    answer: RegExp,
    outcome: string,
): Promise<HTMLElement> {
    await userEvent.click(within(card).getByRole("radio", { name: answer }));
    return waitFor(() => {
        const found = dialog.querySelector<HTMLElement>(`[data-outcome="${outcome}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * The count beside a match row: "N of M".
 * @param card - the card.
 * @param label - the row's label.
 * @returns the count's text.
 */
function countOf(card: HTMLElement, label: string): string {
    const row = picker(card, `${label} column`)?.closest<HTMLElement>(".jc-match");
    return row?.querySelector("[data-count]")?.textContent ?? "";
}

/**
 * A picker of a card (a Mantine Select's input), by its accessible name.
 * @param card - the card.
 * @param name - the picker's name.
 * @returns the picker's input, or null when the card has none.
 */
function picker(card: HTMLElement, name: string): HTMLInputElement | null {
    return card.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);
}

describe("the join cards", () => {
    it("adds a card that asks what each row becomes, nothing picked and the guess tagged", async () => {
        const { session, dialog } = await openCards();
        const card = await addCard(dialog);

        const radios = within(card).getAllByRole("radio");
        assert.lengthOf(radios, 4);
        assert.isTrue(
            radios.every((radio) => !(radio as HTMLInputElement).checked),
            "no answer starts picked",
        );
        await waitFor(() => {
            const suggested = within(card).getAllByText("suggested");
            assert.lengthOf(suggested, 1);
            assert.include(suggested[0].closest("label")?.textContent, "An edge");
        });
        // Nothing is matched or shown until the reader picks.
        assert.isNull(card.querySelector(".jc-match"));
        assert.lengthOf(session.data.edges(), 0);
    });

    it("shows only the picked answer's matches, each with its live count", async () => {
        const { session, dialog } = await openCards();
        const card = await pickAnswer(dialog, await addCard(dialog), /^An edge/, "edge");

        await waitFor(() => {
            assert.strictEqual(countOf(card, "From end"), "4 of 5");
            assert.strictEqual(countOf(card, "To end"), "4 of 5");
        });
        assert.include(card.textContent, "suggested", "the prefilled matches are tagged");
        assert.isNull(picker(card, "Match column"));
        // The preview is provisional: the graph has no edge before Done.
        assert.lengthOf(session.data.edges(), 0);

        await userEvent.click(within(card).getByRole("radio", { name: /^A node with edges/ }));
        const nodes = await waitFor(() => {
            const found = dialog.querySelector<HTMLElement>('[data-outcome="node"]');
            assert.isNotNull(found);
            return found;
        });
        await waitFor(() => {
            assert.isNotNull(picker(nodes, "Row id"));
        });
        assert.isNull(picker(nodes, "From end column"));
    });

    it("follows a match column picked by hand: the count changes", async () => {
        const { dialog } = await openCards();
        const card = await pickAnswer(dialog, await addCard(dialog), /^An edge/, "edge");
        await waitFor(() => {
            assert.strictEqual(countOf(card, "To end"), "4 of 5");
        });

        const toEnd = picker(card, "To end column");
        if (toEnd === null) {
            throw new Error("no To end picker");
        }
        await userEvent.click(toEnd);
        await userEvent.click(await screen.findByRole("option", { name: /^entry/ }));
        // No entry id names a node.
        await waitFor(() => {
            assert.strictEqual(countOf(card, "To end"), "0 of 5");
        });
        assert.notInclude(
            toEnd.closest(".jc-match")?.textContent,
            "suggested",
            "a match changed by hand is no longer the suggestion",
        );
    });

    it("adds several cards and removes them; Undo brings a removed join back", async () => {
        const { dialog } = await openCards();
        await pickAnswer(dialog, await addCard(dialog), /^An edge/, "edge");
        const second = await addCard(dialog);
        assert.lengthOf(dialog.querySelectorAll(".jr-card"), 2);

        await userEvent.click(
            within(dialog).getByRole("button", {
                name: `Delete ${second.getAttribute("aria-label")?.replace(/^Join /, "") ?? ""}`,
            }),
        );
        await waitFor(() => {
            assert.lengthOf(dialog.querySelectorAll(".jr-card"), 1);
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Delete 1 door_entries -> edges" }));
        await waitFor(() => {
            assert.lengthOf(dialog.querySelectorAll(".jr-card"), 0);
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.isNotNull(dialog.querySelector('[data-outcome="edge"]'));
        });
    });

    it("joins every card as one undo step on Done, each named by its card", async () => {
        const { session, dialog } = await openCards();
        const before = session.history.steps.length;
        const card = await pickAnswer(dialog, await addCard(dialog), /^An edge/, "edge");
        await waitFor(() => {
            assert.strictEqual(countOf(card, "To end"), "4 of 5");
        });

        await userEvent.click(within(dialog).getByRole("button", { name: /^Done/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
        assert.deepEqual(
            session.data.joins().map((join) => [join.table.name, join.shape]),
            [["door_entries -> edges", "edges"]],
        );
        assert.isAbove(session.data.edges().length, 0);
        assert.strictEqual(session.history.steps.length, before + 1);
    });

    it("leaves a card with no answer out of Done, and Cancel leaves the graph as it was", async () => {
        const { session, dialog } = await openCards();
        const nodes = session.data.nodes().length;
        const before = session.history.steps.length;
        await pickAnswer(dialog, await addCard(dialog), /^A node with edges/, "node");
        await addCard(dialog);

        await userEvent.click(within(dialog).getByRole("button", { name: /^Cancel/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.strictEqual(session.data.nodes().length, nodes);
        assert.lengthOf(session.data.edges(), 0);
        assert.lengthOf(session.data.joins(), 0);
        assert.strictEqual(session.history.steps.length, before);
    });
});
