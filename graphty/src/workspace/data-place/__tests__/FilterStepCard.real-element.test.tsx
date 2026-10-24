/**
 * A filter step on the REAL graphty-element is a condition card: a step applies only once it is
 * added (leaving drops it and says so), a category step holds several values, a text step offers
 * contains, a text box lists the column's values in the order a reader counts them, and a match
 * picked hands focus to the value, where Escape keeps what was typed.
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
import { addStepCondition } from "./stepCards";

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
 * Opens a new step on an attribute from the Filters "+".
 * @param name - the attribute's name.
 */
async function newStepOn(name: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: "Add filter step" }));
    await addStepCondition(name);
}

describe("A filter step is a condition card", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, like the other Filters tests, tracked in #1636
    it(
        "a step never added leaves the drawing whole on leaving, and a notice says so",
        async () => {
            const { session, store } = await openPeople();
            await newStepOn("role");
            const values = await screen.findByRole("group", { name: "role values" });
            await userEvent.click(within(values).getByRole("checkbox", { name: /^board/ }));
            // The preview counts it; nothing is written.
            await screen.findByText("24 to 3 nodes");

            await userEvent.click(screen.getByRole("button", { name: "Graph" }));
            await waitFor(() => {
                assert.equal(
                    store.get().notice?.message,
                    'Filter step not added: "role is board". Press Add step to use a step.',
                );
            });
            assert.lengthOf(session.visibility.steps, 0);
            assert.equal(session.visibility.summary.visibleNodes, 24);

            // "+" starts a new step: the dropped one is not kept.
            store.set({ place: "data" });
            await userEvent.click(await screen.findByRole("button", { name: "Add filter step" }));
            await screen.findByRole("button", { name: "Add a condition" });
            assert.isNull(screen.queryByRole("group", { name: "role values" }));
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, like the other Filters tests, tracked in #1636
    it(
        "a role step holds board and staff together",
        async () => {
            const { session } = await openPeople();
            await newStepOn("role");
            const values = await screen.findByRole("group", { name: "role values" });
            await userEvent.click(within(values).getByRole("checkbox", { name: /^board/ }));
            await userEvent.click(within(values).getByRole("checkbox", { name: /^staff/ }));
            await screen.findByText("24 to 8 nodes");
            await userEvent.click(screen.getByRole("button", { name: "Add step" }));
            await waitFor(() => {
                assert.deepEqual(session.visibility.steps[0]?.rule, {
                    kind: "categories",
                    attribute: "data.role",
                    values: ["board", "staff"],
                });
            });
            assert.equal(session.visibility.summary.visibleNodes, 8);
            await screen.findByRole("treeitem", { name: "role is board or staff" });
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, like the other Filters tests, tracked in #1636
    it(
        "a name step offers contains in a named box that lists values in natural order",
        async () => {
            const { session } = await openPeople();
            await newStepOn("name");
            const match = await screen.findByRole<HTMLInputElement>("combobox", { name: "name: how to match" });
            assert.equal(match.value, "Contains");
            const box = screen.getByRole("combobox", { name: "name: text to match" });

            await userEvent.type(box, "GAL");
            const listbox = await screen.findByRole("listbox");
            await waitFor(() => {
                assert.deepEqual(
                    within(listbox)
                        .getAllByRole("option")
                        .map((option) => option.textContent),
                    ["GAL1", "GAL2", "GAL3", "GAL4", "GAL7", "GAL10", "GAL11", "GAL80"],
                );
            });

            await userEvent.clear(box);
            await userEvent.type(box, "Mme");
            await screen.findByText("24 to 6 nodes");
            await userEvent.keyboard("{Escape}");
            await userEvent.click(screen.getByRole("button", { name: "Add step" }));
            await waitFor(() => {
                assert.deepEqual(session.visibility.steps[0]?.rule, {
                    kind: "text",
                    reads: "data.name",
                    mode: "substring",
                    text: "Mme",
                });
            });
            assert.equal(session.visibility.summary.visibleNodes, 6);
            await screen.findByRole("treeitem", { name: "name contains Mme" });
        },
        TIMEOUT_MS,
    );

    it("picking an attribute hands focus to its value", async () => {
        await openPeople();
        await realKeys.click(await screen.findByRole("button", { name: "Add filter step" }));
        await realKeys.click(await screen.findByRole("button", { name: "Add a condition" }));
        await realKeys.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        const text = await screen.findByRole("combobox", { name: "name: text to match" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, text, "focus stayed in the attribute box");
        });
        // The next keys are the value, not more search text in the attribute box.
        await realKeys.keyboard("Mme");
        await screen.findByText("24 to 6 nodes");
    });

    it("picking a match hands focus to the value; Escape there keeps the text and the editor open", async () => {
        await openPeople();
        await realKeys.click(await screen.findByRole("button", { name: "Add filter step" }));
        await realKeys.click(await screen.findByRole("button", { name: "Add a condition" }));
        await realKeys.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        await realKeys.click(await screen.findByRole("combobox", { name: "name: how to match" }));
        await realKeys.click(await screen.findByRole("option", { name: "Starts with" }));
        const text = screen.getByRole<HTMLInputElement>("combobox", { name: "name: text to match" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, text, "focus is in the text box");
        });
        await realKeys.keyboard("GAL");
        await screen.findByText("24 to 8 nodes");
        // The first Escape closes the list of names; the next keeps the text and the editor.
        await realKeys.keyboard("{Escape}{Escape}");
        assert.strictEqual(text.value, "GAL");
        assert.strictEqual(document.activeElement, text, "focus stays in the box");
        screen.getByRole("button", { name: "Add step" });
    });
});
