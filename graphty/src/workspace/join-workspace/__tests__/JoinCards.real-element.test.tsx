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

/** Phones and devices per person: P1 twice, P2 and P3 sharing a phone, P9 nobody. */
const PHONES = [
    "person_id,phone,device",
    "P1,+15551001,d1",
    "P1,+15551002,d1",
    "P2,+15551003,d2",
    "P3,+15551003,d3",
    "P9,+15559999,d9",
].join("\n");

/** A second list of people: P1 in another dept, P9 new. */
const PEOPLE_B = ["person_id,name,dept", "P1,Ann,Ops", "P9,Zed,Lab"].join("\n");

/** Door entries naming a door too. */
const DOORS = ["entry,person,building,door", "E1,P1,b1,front", "E2,P1,b1,back", "E3,P2,b2,front", "E4,P3,b9,side"].join(
    "\n",
);

/** A table held through Table +: its file name and text. */
interface Held {
    readonly name: string;
    readonly text: string;
}

/**
 * The workspace on the Data place with the people and the buildings loaded, the join workspace
 * open from Join +, and the tables (the door entries by default) held through Table +.
 * @param tables - the tables to hold.
 * @returns the session and the workspace dialog.
 */
async function openCards(
    tables: readonly Held[] = [{ name: "door_entries.csv", text: ENTRIES }],
): Promise<{ session: GraphSession; dialog: HTMLElement }> {
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
    const dialog = await openJoin();
    for (const [at, table] of tables.entries()) {
        const input = dialog.querySelector<HTMLInputElement>('input[aria-label="Table file"]');
        if (input === null) {
            throw new Error("no Table file input");
        }
        await userEvent.upload(input, new File([table.text], table.name, { type: "text/csv" }));
        // The table is held once the header counts it.
        await within(dialog).findByText(at === 0 ? "1 table" : `${String(at + 1)} tables`);
    }
    return { session, dialog };
}

/**
 * Opens the join workspace from Join + on the Data place.
 * @returns the workspace dialog.
 */
async function openJoin(): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    await userEvent.click(await within(place).findByRole("button", { name: "Join" }));
    return screen.findByRole("dialog", { name: "Join" });
}

/**
 * Presses Done and waits for the workspace to close.
 * @param dialog - the workspace.
 */
async function done(dialog: HTMLElement): Promise<void> {
    await userEvent.click(within(dialog).getByRole("button", { name: /^Done/ }));
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
    });
}

/**
 * Picks one option of a card's picker (a Mantine Select).
 * @param card - the card.
 * @param name - the picker's accessible name.
 * @param option - the option's name.
 */
async function choose(card: HTMLElement, name: string, option: RegExp): Promise<void> {
    const input = picker(card, name);
    if (input === null) {
        throw new Error(`no ${name} picker`);
    }
    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * Presses one segment of a card's segmented control.
 * @param card - the card.
 * @param group - the control's accessible name.
 * @param segment - the segment's label.
 */
async function segment(card: HTMLElement, group: string, segment: string): Promise<void> {
    const control = await waitFor(() => {
        const found = card.querySelector<HTMLElement>(`[aria-label="${group}"]`);
        assert.isNotNull(found, group);
        return found;
    });
    await userEvent.click(within(control).getByText(segment, { exact: true }));
}

/**
 * The words of a card's header chips.
 * @param card - the card.
 * @returns the chips' text, joined.
 */
function chips(card: HTMLElement): string {
    return card.querySelector(".jr-sum")?.textContent ?? "";
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
        // Each answer's example is the card's own table and columns.
        assert.include(card.textContent, "door_entries -> edge: person -> building");
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

        await done(dialog);
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
        const [join] = session.data.joins();
        assert.strictEqual(
            session.data.sources().find((each) => each.key === join.source)?.name,
            "door_entries -> edges",
        );
        assert.deepEqual([join.table.name, join.shape], ["door_entries.csv", "edges"]);
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
    it("writes every matched node's values as lists with Many rows List, a plus-signed phone kept as text", async () => {
        const { session, dialog } = await openCards([{ name: "phones.csv", text: PHONES }]);
        const card = await pickAnswer(dialog, await addCard(dialog), /^Fields on a node/, "fields");
        await waitFor(() => {
            assert.strictEqual(countOf(card, "Match"), "4 of 5");
        });
        await segment(card, "Many rows", "List");
        await done(dialog);

        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
        assert.deepEqual(session.data.node("P1")?.phone, ["+15551001", "+15551002"]);
        // One row is still a list, so every matched node reads alike.
        assert.deepEqual(session.data.node("P2")?.phone, ["+15551003"]);
        assert.deepEqual(session.data.node("P3")?.device, ["d3"]);
    });

    it("counts rows per node with Many rows Count, under the table's name", async () => {
        const { session, dialog } = await openCards([{ name: "phones.csv", text: PHONES }]);
        const card = await pickAnswer(dialog, await addCard(dialog), /^Fields on a node/, "fields");
        await segment(card, "Many rows", "Count");
        await done(dialog);
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
        assert.strictEqual(session.data.node("P1")?.["phones count"], 2);
        assert.isUndefined(session.data.node("P1")?.phone);
    });

    it("lists a clash rule per column while recording each node's source, and honors it", async () => {
        const { session, dialog } = await openCards([{ name: "people_b.csv", text: PEOPLE_B }]);
        const card = await pickAnswer(dialog, await addCard(dialog), /^Fields on a node/, "fields");
        await choose(card, "Match column", /^person_id/);
        await choose(card, "Match match", /^id/);
        await waitFor(() => {
            assert.strictEqual(countOf(card, "Match"), "1 of 2");
        });
        await segment(card, "No match", "Add");
        await segment(card, "Record source", "Record source");
        // Both sides hold name and dept: one rule each, with the source recorded.
        await waitFor(() => {
            assert.isNotNull(card.querySelector('[aria-label="Clash dept"]'));
            assert.isNotNull(card.querySelector('[aria-label="Clash name"]'));
        });
        const regions = within(card).getByRole("group", { name: "Region counts" });
        assert.include(regions.textContent, "only people");
        assert.include(regions.textContent, "only people_b");
        await segment(card, "Clash dept", "New");
        await done(dialog);

        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
        assert.strictEqual(session.data.node("P1")?.dept, "Ops");
        assert.strictEqual(session.data.node("P1")?.membership, "both");
        assert.strictEqual(session.data.node("P9")?.membership, "only-from");
    });

    it("links nodes sharing a value, a typed limit applying once on Enter and undone in one step", async () => {
        const { dialog } = await openCards([{ name: "phones.csv", text: PHONES }]);
        const card = await pickAnswer(dialog, await addCard(dialog), /^Links by shared value/, "links");
        // P2 and P3 share a phone.
        await waitFor(() => {
            assert.include(chips(card), "+1 e");
        });
        const least = within(card).getByRole("textbox", { name: "At least" });
        await userEvent.clear(least);
        await userEvent.type(least, "2");
        assert.include(chips(card), "+1 e", "nothing applies while typing");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.include(chips(card), "+0 e");
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.include(chips(card), "+1 e");
            assert.strictEqual(within(card).getByRole<HTMLInputElement>("textbox", { name: "At least" }).value, "1");
        });
    });

    it("offers At least only while links are drawn as edges", async () => {
        const { dialog } = await openCards([{ name: "phones.csv", text: PHONES }]);
        const card = await pickAnswer(dialog, await addCard(dialog), /^Links by shared value/, "links");
        await within(card).findByRole("textbox", { name: "At least" });
        await segment(card, "Draw", "Value nodes");
        await waitFor(() => {
            assert.isNull(within(card).queryByRole("textbox", { name: "At least" }));
        });
    });

    it("holds Done while a card cannot run, the card saying why", async () => {
        const { session, dialog } = await openCards([{ name: "phones.csv", text: PHONES }]);
        const card = await pickAnswer(dialog, await addCard(dialog), /^Links by shared value/, "links");
        await waitFor(() => {
            assert.include(chips(card), "+1 e");
        });
        const shared = picker(card, "Shared");
        if (shared === null) {
            throw new Error("no Shared picker");
        }
        await userEvent.click(shared);
        await userEvent.keyboard("{Backspace}");
        await waitFor(() => {
            assert.include(card.textContent, "pick shared");
        });
        const button = within(dialog).getByRole<HTMLButtonElement>("button", { name: /^Done/ });
        assert.isTrue(button.disabled);
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }));
        assert.lengthOf(session.data.joins(), 0);
    });

    it("merges a second card's rows into the edges the first card made", async () => {
        const { dialog } = await openCards();
        await pickAnswer(dialog, await addCard(dialog), /^An edge/, "edge");
        const next = await addCard(dialog);
        await choose(next, "From", /^door_entries/);
        await userEvent.click(within(next).getByRole("radio", { name: /^An edge/ }));
        const second = await waitFor(() => {
            const cards = dialog.querySelectorAll<HTMLElement>('[data-outcome="edge"]');
            assert.lengthOf(cards, 2);
            return cards[1];
        });
        await segment(second, "Existing edge", "Merge into it");
        // Every pair the entries name is an edge the first card made.
        await waitFor(() => {
            assert.include(chips(second), "4 merged");
            assert.include(chips(second), "+0 e");
        });
    });

    it("makes nodes from a named column's values, counting them", async () => {
        const { dialog } = await openCards([{ name: "doors.csv", text: DOORS }]);
        const card = await pickAnswer(dialog, await addCard(dialog), /^A node with edges/, "node");
        await userEvent.click(within(card).getByRole("button", { name: "Column" }));
        const door = await waitFor(() => {
            const rows = card.querySelectorAll<HTMLElement>(".jc-match");
            const last = rows[rows.length - 1];
            assert.strictEqual(picker(last, "Named column")?.value, "door");
            return last;
        });
        await choose(door, "Named match", /^new from values/);
        await waitFor(() => {
            assert.strictEqual(door.querySelector("[data-count]")?.textContent, "3 new");
        });
        const result = within(card).getByRole("group", { name: "Result" });
        await waitFor(() => {
            assert.include(result.textContent, "new node");
        });
        assert.notInclude(result.textContent, "new end");
    });

    it("keeps a named column's load when its No match flips to Add", async () => {
        const { dialog } = await openCards([{ name: "doors.csv", text: DOORS }]);
        const card = await pickAnswer(dialog, await addCard(dialog), /^A node with edges/, "node");
        const first = await waitFor(() => {
            const found = card.querySelector<HTMLElement>(".jc-match");
            assert.isNotNull(found);
            return found;
        });
        await choose(first, "Named match", /^people\.person_id/);
        await waitFor(() => {
            assert.strictEqual(picker(first, "Named match")?.value, "people.person_id");
        });
        const column = picker(first, "Named column")?.value ?? "";
        await segment(card, `No match ${column}`, "Add");
        await waitFor(() => {
            const control = card.querySelector(`[aria-label="No match ${column}"]`);
            assert.strictEqual(control?.querySelector("[data-active]")?.textContent, "Add");
        });
        assert.strictEqual(picker(first, "Named match")?.value, "people.person_id");
    });

    it("holds a table from a URL, and shows why a URL could not be read", async () => {
        const { dialog } = await openCards([]);
        await userEvent.click(within(dialog).getByRole("button", { name: "Table" }));
        const field = await screen.findByRole("textbox", { name: "Table URL" });
        await userEvent.type(field, "http://127.0.0.1:1/missing.csv");
        await userEvent.click(screen.getByRole("button", { name: "Load" }));
        const alert = await screen.findByRole("alert");
        assert.include(alert.textContent, "Load failed");

        await userEvent.clear(field);
        await userEvent.type(field, `${location.origin}/prototype-data/supply-chain/suppliers.csv`);
        await userEvent.click(screen.getByRole("button", { name: "Load" }));
        await within(dialog).findByText("1 table");
    });

    it("reopens a committed join as a folded card; editing it and Done joins it again, one Undo back", async () => {
        const { session, dialog } = await openCards();
        await pickAnswer(dialog, await addCard(dialog), /^An edge/, "edge");
        await done(dialog);
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 1);
        });
        const pairs = session.data.edges().length;

        const again = await openJoin();
        const card = await waitFor(() => {
            const found = again.querySelector<HTMLElement>('[data-outcome="edge"]');
            assert.isNotNull(found);
            return found;
        });
        assert.isNull(again.querySelector("[data-unpicked]"));
        // It opens folded; unfolded, nothing on it is tagged as a suggestion.
        await userEvent.click(within(card).getByRole("button", { name: /^Expand/ }));
        await segment(card, "Edges", "Per row");
        assert.notInclude(card.textContent, "suggested", "a reopened join is the reader's own");
        await done(again);

        // Per row: P1 enters b1 twice.
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, pairs + 1);
        });
        assert.lengthOf(session.data.joins(), 1);
        await session.undo();
        assert.strictEqual(session.data.edges().length, pairs);
    });

    it("reopens two cards of one table as one table; editing one leaves the other's join as it is", async () => {
        const { session, dialog } = await openCards();
        await pickAnswer(dialog, await addCard(dialog), /^An edge/, "edge");
        const next = await addCard(dialog);
        await choose(next, "From", /^door_entries/);
        await pickAnswer(dialog, next, /^A node with edges/, "node");
        await done(dialog);
        await waitFor(() => {
            assert.lengthOf(session.data.joins(), 2);
        });
        // The reader's own value on an edge the first card made.
        const [edgeJoin] = session.data.joins();
        const edge = session.data.edges().find((each) => String(each.source).startsWith("P"));
        assert.isDefined(edge);
        await session.data.updateEdges([{ id: edge?.id ?? "", values: { checked: true } }]);

        const again = await openJoin();
        await within(again).findByText("1 table");
        const card = await waitFor(() => {
            const found = again.querySelector<HTMLElement>('[data-outcome="node"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(card).getByRole("button", { name: /^Expand/ }));
        const kind = within(card).getByRole("textbox", { name: "Kind" });
        await userEvent.clear(kind);
        await userEvent.type(kind, "entry{Enter}");
        await done(again);

        await waitFor(() => {
            const joins = session.data.joins();
            assert.lengthOf(joins, 2);
            assert.strictEqual(joins[1].choices.rowNode?.kind, "entry");
        });
        assert.strictEqual(session.data.joins()[0].source, edgeJoin.source);
        assert.strictEqual(session.data.edges().find((each) => each.id === edge?.id)?.checked, true);
    });
});
