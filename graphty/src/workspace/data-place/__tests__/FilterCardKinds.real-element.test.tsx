/**
 * Each kind of filter card on the REAL graphty-element: a card says what stays (All, then Keep its
 * value); a category step holds several values; a text step writes what is typed once it is
 * committed and lists the column's values in the order a reader counts them; and a new card and a
 * match picked hand focus to the value; a letter typed on a new card's Value field searches for it;
 * and a name typed in the workspace's title names the card.
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

// Every experiment stays off here.
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
    // The new card opens in the selection workspace: its Value field lists the fields.
    await userEvent.click(await screen.findByRole("button", { name: "Value" }));
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
 * The one card's step rule: a new card in the selection workspace starts with no nodes and adds
 * what its value matches.
 * @param session - the element's session.
 * @returns the step's rule.
 */
function stepRule(session: GraphSession): unknown {
    const rule = session.visibility.conditions[0]?.rule;
    if (rule?.kind !== "union") {
        return undefined;
    }
    assert.equal(rule.branches[0]?.start, "none");
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
        await userEvent.click(
            within(await screen.findByRole("group", { name: "role values" })).getByRole("checkbox", { name: /^staff/ }),
        );
        // The card is a draft until Done writes it as one step.
        assert.lengthOf(session.visibility.conditions, 0, "a draft writes nothing before Done");
        const open = document.querySelector<HTMLElement>(".sel-ws");
        await userEvent.click(within(open ?? document.body).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
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
});

describe("a new filter card's value field and name", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("a letter typed on the empty card's Value field opens its list searching for it", async () => {
        await openPeople();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        const field = await screen.findByRole("button", { name: "Value" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field, "the new card's Value field has focus");
        });
        await userEvent.keyboard("r");
        const search = await screen.findByRole<HTMLInputElement>("combobox", { name: "Find attributes, results" });
        assert.strictEqual(search.value, "r", "the letter starts the search");
        await userEvent.click(await screen.findByRole("option", { name: /^role(,|$)/ }));
        await screen.findByRole("group", { name: "role values" });
    });

    it("a name typed in the workspace's title is the card's name on Done, and Escape in the box keeps it", async () => {
        const { session } = await openPeople();
        await newCardOn("role");
        const values = await screen.findByRole("group", { name: "role values" });
        await userEvent.click(within(values).getByRole("checkbox", { name: "board, 3 nodes" }));
        const head = (): HTMLElement => {
            const found = document.querySelector<HTMLElement>(".sel-ws .sel-ws-head");
            assert.isNotNull(found, "the workspace is open");
            return found;
        };
        await userEvent.click(within(head()).getByRole("button", { name: /, rename$/ }));
        await userEvent.keyboard("{Control>}a{/Control}Board{Enter}");
        await within(head()).findByRole("button", { name: "Board, rename" });

        await userEvent.click(within(head()).getByRole("button", { name: "Board, rename" }));
        await userEvent.keyboard("{Control>}a{/Control}Nope{Escape}");
        await within(head()).findByRole("button", { name: "Board, rename" });
        assert.isNotNull(document.querySelector(".sel-ws"), "Escape in the box leaves the workspace open");

        await userEvent.click(within(head()).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.strictEqual(session.visibility.conditions[0]?.name, "Board");
        });
    });
});
