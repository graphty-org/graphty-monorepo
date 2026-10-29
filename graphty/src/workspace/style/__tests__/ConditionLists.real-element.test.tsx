/**
 * The Add a condition list and the cards it adds, on the REAL graphty-element, driven by real
 * keys and clicks: the first match is active after typing, so Enter takes it; the search is a
 * combobox naming its list and how many options it holds; Tab leaves the list closed; Escape
 * closes the list only; reopening focuses the search; the list stays inside the cards' column;
 * a data column that spells each node's id is listed once, as Node id; Enter in a text or number
 * box finishes the cards as Done does; an unfinished card shows the layer's count; and a layer
 * with no card shows no Done.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, RuleTree } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { FIND_ATTRIBUTE } from "../words";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * The workspace with the real element, and a graph in it.
 * @param load - Puts the graph in; Les Miserables when left out.
 * @returns The session.
 */
async function open(load?: (session: GraphSession) => Promise<unknown>): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await (load === undefined
        ? session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } })
        : load(session));
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * A blank reader's layer, selected in the tree, with its Which nodes picker open.
 * @param session - The session.
 * @returns The layer's id and the open picker.
 */
async function openPicker(session: GraphSession): Promise<{ id: string; region: HTMLElement }> {
    const layer = await session.styles.add({
        name: "Mine",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Mine, / }));
    if (screen.queryByRole("group", { name: "Which nodes" }) === null) {
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS }));
    }
    return { id: layer.id, region: await screen.findByRole("group", { name: "Which nodes" }) };
}

/**
 * Open Add a condition and wait for its search to take focus. A layer with no card opens its
 * picker on that list already, so a click there would close it.
 * @param region - The open picker.
 * @returns The search box.
 */
async function openList(region: HTMLElement): Promise<HTMLElement> {
    if (screen.queryByRole("combobox", { name: FIND_ATTRIBUTE }) === null) {
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
    }
    const search = await screen.findByRole("combobox", { name: FIND_ATTRIBUTE });
    await waitFor(() => {
        assert.strictEqual(document.activeElement, search, "the search takes focus");
    });
    return search;
}

/**
 * The only leaf of a layer's rule.
 * @param session - The session.
 * @param id - The layer.
 * @returns The leaf.
 */
function leafOfLayer(session: GraphSession, id: string): RuleTree | undefined {
    const selector = session.styles.get(id)?.selector;
    return selector?.match === "rule" ? selector.where : undefined;
}

/**
 * Wait for the picker to close onto its row.
 */
async function closedOntoRow(): Promise<void> {
    const row = await screen.findByRole("button", { name: /^Which nodes, / });
    await waitFor(() => {
        assert.strictEqual(document.activeElement, row, "focus is back on the Which row");
    });
    assert.strictEqual(row.getAttribute("aria-expanded"), "false");
}

describe("the Add a condition list", () => {
    it("typing makes the first match active, so Enter adds its card; the search says what it controls", async () => {
        const session = await open();
        const { region } = await openPicker(session);
        const search = await openList(region);
        await userEvent.keyboard("nam");
        const list = await screen.findByRole("listbox", { name: "Attributes" });
        await waitFor(() => {
            const first = within(list).getAllByRole("option")[0];
            assert.strictEqual(first.getAttribute("aria-label"), "name");
            assert.strictEqual(search.getAttribute("aria-activedescendant"), first.id, "the first match is active");
        });
        assert.strictEqual(search.getAttribute("aria-controls"), list.id, "the search controls the list");
        assert.strictEqual(search.getAttribute("aria-expanded"), "true");
        const options = within(list).getAllByRole("option").length;
        assert.strictEqual(
            search.getAttribute("aria-description"),
            options === 1 ? "1 option" : `${String(options)} options`,
        );
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox"), "the list closed");
            const card = within(region).getByRole("group", { name: /^name(,|$)/ });
            assert.isTrue(card.contains(document.activeElement), "focus is in the new card");
        });
    });

    it("Tab leaves the list closed and never lands in it; Shift+Tab lands on Add a condition", async () => {
        const session = await open();
        const { region } = await openPicker(session);
        const add = within(region).getByRole("button", { name: "Add a condition" });
        await openList(region);
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox"), "the list closed");
            assert.strictEqual(document.activeElement, add, "Shift+Tab lands on Add a condition");
        });
        await openList(region);
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox"), "the list closed");
            const at = document.activeElement;
            assert.notStrictEqual(at, document.body, "focus did not fall to the page");
            assert.notStrictEqual(at?.getAttribute("role"), "listbox", "focus is not on the list");
            assert.notStrictEqual(at, add, "Tab moved on past Add a condition");
        });
    });

    it("reopening focuses the search; Escape on an open list closes the list only", async () => {
        const session = await open();
        const { region } = await openPicker(session);
        const add = within(region).getByRole("button", { name: "Add a condition" });
        await openList(region);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox"));
            assert.strictEqual(document.activeElement, add);
        });
        await userEvent.keyboard("{Enter}");
        const search = await screen.findByRole("combobox", { name: FIND_ATTRIBUTE });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search, "reopened from the keyboard, the search has focus");
        });
        await userEvent.keyboard("{Escape}");
        await openList(region);
        add.focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox"), "Escape on the button closes the open list");
        });
        assert.isNotNull(screen.queryByRole("group", { name: "Which nodes" }), "the picker is still open");
    });

    it("stays inside the cards' column", async () => {
        const session = await open();
        const { region } = await openPicker(session);
        await openList(region);
        const list = await screen.findByRole("listbox", { name: "Attributes" });
        await waitFor(() => {
            const box = list.closest<HTMLElement>(".mantine-Combobox-dropdown")?.getBoundingClientRect();
            const column = region.getBoundingClientRect();
            assert.isDefined(box);
            assert.isAtMost(box?.right ?? Infinity, column.right + 0.5, "its right edge is inside the column");
            assert.isAtMost(box?.right ?? Infinity, window.innerWidth, "and inside the window");
        });
    });

    it("lists a data column that spells each node's id once, as Node id", async () => {
        const session = await open(async (s) => {
            await s.data.addNodes([
                { id: "a", role: "x" },
                { id: "b", role: "y" },
            ]);
        });
        assert.isTrue(
            session.data.readableValues().some((value) => value.path === "data.id"),
            "the graph carries the ids as a data column too",
        );
        const { region } = await openPicker(session);
        await openList(region);
        await userEvent.keyboard("id");
        const list = await screen.findByRole("listbox", { name: "Attributes" });
        await waitFor(() => {
            const names = within(list)
                .getAllByRole("option")
                .map((each) => each.getAttribute("aria-label"));
            assert.deepEqual(names, ["Node id"]);
        });
    });

    it("lists a column that arrives while the picker is open", async () => {
        // The picker opened before the graph's data arrived (a fast reader, or a slow open).
        const session = await open(async () => {});
        const { region } = await openPicker(session);
        await session.data.addNodes([
            { id: "a", role: "x" },
            { id: "b", role: "y" },
        ]);
        await openList(region);
        const list = await screen.findByRole("listbox", { name: "Attributes" });
        await waitFor(() => {
            const names = within(list)
                .getAllByRole("option")
                .map((each) => each.getAttribute("aria-label"));
            assert.isTrue(
                names.some((name) => name?.startsWith("role, ")),
                `role is listed: ${names.join("; ")}`,
            );
        });
    });
});

describe("the cards", () => {
    it("Enter in a text box finishes the cards as Done does", async () => {
        const session = await open();
        const { id, region } = await openPicker(session);
        await openList(region);
        await userEvent.keyboard("name{Enter}");
        const box = await within(region).findByRole("combobox", { name: "name: text to match" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box);
        });
        await userEvent.keyboard("Mme{Enter}");
        await closedOntoRow();
        assert.deepEqual(leafOfLayer(session, id), {
            kind: "text",
            reads: "data.name",
            mode: "substring",
            text: "Mme",
        });
    });

    it("Enter in a number box finishes the cards; a refused number stays with its reason", async () => {
        const session = await open(async (s) => {
            await s.data.addNodes([
                { id: "a", amount: 1 },
                { id: "b", amount: 5 },
                { id: "c", amount: 9 },
            ]);
        });
        const { id, region } = await openPicker(session);
        await openList(region);
        await userEvent.keyboard("amount{Enter}");
        const from = await within(region).findByRole("textbox", { name: "amount from, number" });
        await userEvent.click(from);
        await userEvent.keyboard("{Control>}a{/Control}x{Enter}");
        assert.isNotNull(screen.queryByRole("group", { name: "Which nodes" }), "a refused number keeps the card open");
        await userEvent.keyboard("{Control>}a{/Control}4{Enter}");
        await closedOntoRow();
        await waitFor(() => {
            const leaf = leafOfLayer(session, id);
            assert.strictEqual(leaf?.kind, "range");
            assert.strictEqual(leaf?.kind === "range" ? leaf.min : undefined, 4);
        });
    });

    it("a layer with no card opens on Add a condition and keeps Done; an unfinished card shows no count", async () => {
        const session = await open();
        const { region } = await openPicker(session);
        assert.isNotNull(within(region).queryByRole("button", { name: "Done" }), "Done is there before a card");
        // The list is closed, so one press on Add a condition opens it rather than closing it.
        assert.isNull(screen.queryByRole("listbox"), "the list did not open on its own");
        const add = within(region).getByRole("button", { name: "Add a condition" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, add, "focus is on Add a condition");
        });
        await userEvent.click(add);
        const search = await screen.findByRole("combobox", { name: FIND_ATTRIBUTE });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search, "the list opens with its search focused");
        });
        await userEvent.keyboard("name{Enter}");
        const card = await within(region).findByRole("group", { name: /^name(,|$)/ });
        assert.strictEqual(card.getAttribute("aria-label"), "name", "an unfinished card says no count");
    });
});
