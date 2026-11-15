/**
 * Each kind of filter card on the REAL graphty-element: a card says what stays (All, then Keep its
 * value); a category step holds several values; a text step writes what is typed once it is
 * committed and lists the column's values in the order a reader counts them; and a new card and a
 * match picked hand focus to the value.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

const MME = ["Mme Burgon", "Mme Hucheloup", "Mme Magloire", "Mme Pontmercy", "Mme Thenardier", "Mme Victurnien"];
const GAL = ["GAL10", "GAL11", "GAL1", "GAL2", "GAL4", "GAL7", "GAL80", "GAL3"];
const OTHERS = [
    "Valjean",
    "Javert",
    "Fantine",
    "Cosette",
    "Marius",
    "Gavroche",
    "Eponine",
    "Fauchelevent",
    "Myriel",
    "Babet",
];

/** The first 3 are board, the next 5 staff. */
const ROLES = [
    ["board", 3],
    ["staff", 8],
] as const;

/** 24 people: 3 board, 5 staff, 16 volunteers; six named Mme, eight named GAL<n>. */
const PEOPLE = JSON.stringify({
    nodes: [...MME, ...GAL, ...OTHERS].map((name, i) => ({
        id: `p${String(i + 1)}`,
        name,
        role: ROLES.find(([, below]) => i < below)?.[0] ?? "volunteer",
    })),
    edges: Array.from({ length: 23 }, (_, i) => ({ source: `p${String(i + 1)}`, target: `p${String(i + 2)}` })),
});

/**
 * Renders the workspace on the Data place and loads the 24 people.
 * @returns the session and the chrome store.
 */
async function openPeople(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "People", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "json", name: "people.json", config: { data: PEOPLE } });
    return { session, store };
}

/**
 * Opens a new card on a field from the Filters "+".
 * @param name - the field's name.
 */
async function newCardOn(name: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${name}(,|$)`) }));
}

/**
 * The Filters section's cards.
 * @returns how many are drawn.
 */
function cardsDrawn(): number {
    const list = within(screen.getByRole("region", { name: "Data place" })).queryByRole("list", { name: "Filters" });
    return list === null ? 0 : within(list).queryAllByRole("listitem").length;
}

/**
 * The one card's step rule: a card says what stays, All and a Keep step on its value.
 * @param session - the element's session.
 * @returns the step's rule.
 */
function stepRule(session: GraphSession): unknown {
    const rule = session.visibility.conditions[0]?.rule;
    if (rule?.kind !== "union") {
        return undefined;
    }
    assert.equal(rule.branches[0]?.start, "all");
    return rule.branches[0]?.steps[0]?.rule;
}

describe("Each kind of filter card", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("a role card holds board and staff together", async () => {
        const { session } = await openPeople();
        await newCardOn("role");
        const values = await screen.findByRole("group", { name: "role values" });
        // A value row reads box, name, then its count dimmed at the right; named as the Style card names it.
        const board = within(values).getByRole("checkbox", { name: "board, 3 nodes" });
        assert.equal(board.closest(".mantine-Checkbox-root")?.textContent, "board3");
        await userEvent.click(board);
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        await userEvent.click(
            within(await screen.findByRole("group", { name: "role values" })).getByRole("checkbox", { name: /^staff/ }),
        );
        await waitFor(() => {
            assert.deepEqual(stepRule(session), {
                kind: "categories",
                attribute: "data.role",
                values: ["board", "staff"],
            });
        });
        // A card says what stays: the board and the staff.
        assert.equal(session.visibility.summary.visibleNodes, 8);
        assert.deepEqual(session.selection.nodes, [], "a card never selects");
        assert.equal(cardsDrawn(), 1);
    });

    it("a name card opens with focus on its text, lists values in natural order, and writes on Enter as one step", async () => {
        const { session } = await openPeople();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await userEvent.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        const match = await screen.findByRole<HTMLInputElement>("combobox", { name: "name: how to match" });
        assert.equal(match.value, "Contains");
        const box = screen.getByRole<HTMLInputElement>("combobox", { name: "name: text to match" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box, "focus is in the text box");
        });

        await userEvent.keyboard("GAL");
        const listbox = await screen.findByRole("listbox");
        await waitFor(() => {
            assert.deepEqual(
                within(listbox)
                    .getAllByRole("option")
                    .map((option) => option.textContent),
                ["GAL1", "GAL2", "GAL3", "GAL4", "GAL7", "GAL10", "GAL11", "GAL80"],
            );
        });
        // Typing writes nothing yet: the step holds no text.
        const text = (): unknown => (stepRule(session) as { text?: string } | undefined)?.text ?? "";
        assert.equal(text(), "");

        const before = session.history.position;
        await userEvent.clear(box);
        await userEvent.type(box, "Mme");
        await userEvent.keyboard("{Escape}");
        assert.equal(text(), "");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual(stepRule(session), {
                kind: "text",
                reads: "data.name",
                mode: "substring",
                text: "Mme",
            });
        });
        assert.equal(session.history.position, before + 1);
        assert.equal(session.visibility.summary.visibleNodes, 6);
    });

    it("a match picked keeps the step; Escape with a value writes it and ends picking", async () => {
        const { session } = await openPeople();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await userEvent.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        await userEvent.click(await screen.findByRole("combobox", { name: "name: how to match" }));
        await userEvent.click(await screen.findByRole("option", { name: "Starts with" }));
        const text = screen.getByRole<HTMLInputElement>("combobox", { name: "name: text to match" });
        await userEvent.click(text);
        await userEvent.keyboard("GAL");
        await screen.findByRole("listbox");
        // The first Escape closes the list of names; the next writes the text and goes to the card's
        // title row (ws-polish 2: never Done from the pane); the third ends picking.
        await userEvent.keyboard("{Escape}{Escape}{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-step-pane]"), "picking ended");
        });
        assert.equal(cardsDrawn(), 1);
        assert.lengthOf(session.visibility.conditions, 1);
    });
});

describe("Cancel in a filter card's workspace", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("on a new card takes the card away, written or not, and focus goes back to Add filter", async () => {
        const { session } = await openPeople();
        await newCardOn("role");
        await userEvent.click(
            within(await screen.findByRole("group", { name: "role values" })).getByRole("checkbox", { name: /^board/ }),
        );
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1, "the ticked value writes the card");
        });
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 0, "no filter condition is left");
            assert.equal(cardsDrawn(), 0, "no card is left");
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add filter");
        });
        assert.equal(session.visibility.summary.visibleNodes, session.visibility.summary.totalNodes);
    });

    it("on a new card leaves the history as it was: nothing to undo or redo brings the card back", async () => {
        const { session, store } = await openPeople();
        const { position, steps } = session.history;
        const newest = steps[position - 1]?.id;
        await newCardOn("role");
        await userEvent.click(
            within(await screen.findByRole("group", { name: "role values" })).getByRole("checkbox", { name: /^board/ }),
        );
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1, "the ticked value writes the card");
        });
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add filter");
            assert.equal(session.history.position, position, "back to the step before the card");
        });
        assert.lengthOf(session.history.steps, position, "nothing to redo");
        assert.equal(session.history.steps[position - 1]?.id, newest);
        assert.equal(store.get().announcement, "Filter not added");
        await userEvent.keyboard("{Control>}z{/Control}");
        await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
        await waitFor(() => {
            assert.equal(session.history.pending.length, 0);
        });
        assert.lengthOf(session.visibility.conditions, 0, "Undo and Redo bring no card back");
        assert.equal(cardsDrawn(), 0);
    });

    it("on a new card opened from Quick actions, Cancel and Escape send focus to Add filter", async () => {
        const { session } = await openPeople();
        // Cancel on a written card.
        await userEvent.keyboard("{Control>}k{/Control}");
        await userEvent.keyboard("filter");
        await userEvent.click(await screen.findByRole("option", { name: /^Filters/ }));
        await userEvent.click(await screen.findByRole("option", { name: /^role(,|$)/ }));
        await userEvent.click(
            within(await screen.findByRole("group", { name: "role values" })).getByRole("checkbox", { name: /^board/ }),
        );
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1, "the ticked value writes the card");
        });
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 0, "no filter condition is left");
            assert.equal(cardsDrawn(), 0, "no card is left");
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add filter");
        });
        // Escape on the new card's empty picker.
        await userEvent.keyboard("{Control>}k{/Control}");
        await userEvent.keyboard("filter");
        await userEvent.click(await screen.findByRole("option", { name: /^Filters/ }));
        await screen.findByRole("option", { name: /^role(,|$)/ });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(cardsDrawn(), 0, "no card is left");
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add filter");
        });
    });

    it("on an existing card restores its rule and keeps the card", async () => {
        const { session } = await openPeople();
        await newCardOn("role");
        await userEvent.click(
            within(await screen.findByRole("group", { name: "role values" })).getByRole("checkbox", { name: /^board/ }),
        );
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
        });
        const before = stepRule(session);
        // Reopen it from its row, tick another value, then Cancel.
        await userEvent.click(within(screen.getByRole("list", { name: "Filters" })).getByText(/role/));
        await userEvent.click(
            within(await screen.findByRole("group", { name: "role values" })).getByRole("checkbox", { name: /^staff/ }),
        );
        await waitFor(() => {
            assert.notDeepEqual(stepRule(session), before);
        });
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.deepEqual(stepRule(session), before);
        });
        assert.equal(cardsDrawn(), 1);
    });
});
