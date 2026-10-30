/**
 * Each kind of filter card on the REAL graphty-element: a new card is written only by its first
 * value (only Escape takes back a card with none), a category card holds several values, a text
 * card writes what is typed once it is committed and lists the column's values in the order a
 * reader counts them, and a new card and a match picked hand focus to the value.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent as realKeys } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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

describe("Each kind of filter card", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("a new card left with no value writes nothing and stays until Escape takes it back", async () => {
        const { session, store } = await openPeople();
        await newCardOn("role");
        await screen.findByRole("group", { name: "role values" });
        // Focus leaving for another control keeps it: only Escape takes a card back.
        await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
        await userEvent.keyboard("{Escape}");
        assert.equal(cardsDrawn(), 1);
        assert.lengthOf(session.visibility.conditions, 0);
        within(screen.getByRole("group", { name: "role values" }))
            .getByRole("checkbox", { name: /^board/ })
            .focus();
        await realKeys.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(cardsDrawn(), 0);
        });
        assert.lengthOf(session.visibility.conditions, 0);
        assert.equal(session.visibility.summary.visibleNodes, 24);
        assert.equal(store.get().notice, null);
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Add filter");
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
            assert.deepEqual(session.visibility.conditions[0]?.rule, {
                kind: "categories",
                attribute: "data.role",
                values: ["board", "staff"],
            });
        });
        // A card from "+" starts on Select: it marks the matches and takes nothing out of the picture.
        assert.equal(session.visibility.summary.visibleNodes, session.data.nodes().length);
        assert.lengthOf(session.selection.nodes, 8);
        await screen.findByRole("group", { name: "role is board or staff, Select" });
        assert.equal(cardsDrawn(), 1);
    });

    it("a name card opens with focus on its text, lists values in natural order, and writes on Enter as one step", async () => {
        const { session } = await openPeople();
        await realKeys.click(await screen.findByRole("button", { name: "Add filter" }));
        await realKeys.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        const match = await screen.findByRole<HTMLInputElement>("combobox", { name: "name: how to match" });
        assert.equal(match.value, "Contains");
        const box = screen.getByRole<HTMLInputElement>("combobox", { name: "name: text to match" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box, "focus is in the text box");
        });

        await realKeys.keyboard("GAL");
        const listbox = await screen.findByRole("listbox");
        await waitFor(() => {
            assert.deepEqual(
                within(listbox)
                    .getAllByRole("option")
                    .map((option) => option.textContent),
                ["GAL1", "GAL2", "GAL3", "GAL4", "GAL7", "GAL10", "GAL11", "GAL80"],
            );
        });
        // Typing writes nothing yet.
        assert.lengthOf(session.visibility.conditions, 0);

        const before = session.history.position;
        await userEvent.clear(box);
        await userEvent.type(box, "Mme");
        await realKeys.keyboard("{Escape}");
        assert.lengthOf(session.visibility.conditions, 0);
        await realKeys.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual(session.visibility.conditions[0]?.rule, {
                kind: "text",
                reads: "data.name",
                mode: "substring",
                text: "Mme",
            });
        });
        assert.equal(session.history.position, before + 1);
        assert.equal(session.visibility.summary.visibleNodes, session.data.nodes().length);
        assert.lengthOf(session.selection.nodes, 6);
        await screen.findByRole("group", { name: "name contains Mme, Select" });
    });

    it("picking a match hands focus to the value; Escape with a value writes it and goes to the on box", async () => {
        const { session } = await openPeople();
        await realKeys.click(await screen.findByRole("button", { name: "Add filter" }));
        await realKeys.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        await realKeys.click(await screen.findByRole("combobox", { name: "name: how to match" }));
        await realKeys.click(await screen.findByRole("option", { name: "Starts with" }));
        const text = screen.getByRole<HTMLInputElement>("combobox", { name: "name: text to match" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, text, "focus is in the text box");
        });
        await realKeys.keyboard("GAL");
        await screen.findByRole("listbox");
        // The first Escape closes the list of names; the next writes the card and keeps it.
        await realKeys.keyboard("{Escape}{Escape}");
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Apply name starts with GAL");
        });
        assert.equal(cardsDrawn(), 1);
        assert.lengthOf(session.visibility.conditions, 1);
    });
});
