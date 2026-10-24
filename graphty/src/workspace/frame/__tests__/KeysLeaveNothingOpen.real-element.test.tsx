/**
 * Keys that must close what they leave and land focus where the reader goes next, on the REAL
 * graphty-element and Les Miserables, by real keys: Done and Remove hand focus to the control that
 * takes the next step, Tab out of the Which picker and out of Filter analyses closes them, a card's
 * remove button is a Tab stop and a full section's "+" is not, Escape on an inspector button
 * clears the selection, a disabled Undo says why, and the drawing is a named region.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Les Miserables in the workspace, with a layer "Picked" holding a name condition and a color.
 * @returns The session and the store.
 */
async function openGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await session.styles.add({
        name: "Picked",
        target: "node",
        selector: { match: "rule", where: { kind: "text", reads: "data.name", mode: "substring", text: "M" } },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    return { session, store };
}

/**
 * Opens a style tree row in the inspector.
 * @param name - the row's name.
 */
async function openRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

/**
 * The collapsed Which nodes row.
 * @returns The row button.
 */
async function whichRow(): Promise<HTMLElement> {
    return screen.findByRole("button", { name: /^Which nodes, / });
}

/**
 * The name of the focused control, for messages.
 * @returns its accessible name as the test reads it.
 */
function focused(): string {
    const active = document.activeElement;
    return `${active?.tagName ?? "none"} ${active?.getAttribute("aria-label") ?? active?.textContent ?? ""}`;
}

describe("keys that close what they leave and land focus in the right place", () => {
    it("Done on a new layer with no condition hands focus back to its Which row", async () => {
        await openGraph();
        await userEvent.click(await screen.findByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await screen.findByRole("textbox", { name: "Layer name" });
        await userEvent.keyboard("{Escape}");
        let region = screen.queryByRole("group", { name: "Which nodes" });
        if (region === null) {
            await userEvent.click(await whichRow());
            region = await screen.findByRole("group", { name: "Which nodes" });
        }
        within(region).getByRole("button", { name: "Done" }).focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(async () => {
            assert.strictEqual(document.activeElement, await whichRow(), focused());
        });
    });

    it("Remove node color hands focus to the Fill + that adds it back", async () => {
        await openGraph();
        await openRow("Everything");
        const remove = await screen.findByRole("button", { name: "Remove node color" });
        // A pointer press, as a reader with a mouse makes it: the next section slides up under it.
        await userEvent.click(remove);
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "Add to node fill", focused());
        });
    });

    it("Tab past Done closes the Which picker and keeps its cards", async () => {
        const { session } = await openGraph();
        await openRow("Picked");
        await userEvent.click(await whichRow());
        const region = await screen.findByRole("group", { name: "Which nodes" });
        within(region).getByRole("button", { name: "Done" }).focus();
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Which nodes" }), "the cards stayed open");
        });
        assert.notStrictEqual(document.activeElement, document.body, "focus fell to the page");
        const picked = session.styles.list().find((each) => each.name === "Picked");
        assert.strictEqual(picked?.selector?.match, "rule", "the condition was kept");
    });

    it("Shift+Tab from a card's value reaches the card's remove button, drawn at the card's top", async () => {
        await openGraph();
        await openRow("Picked");
        await userEvent.click(await whichRow());
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const card = within(region).getByRole("group", { name: /^name/ });
        const remove = within(card).getByRole("button", { name: /^Remove / });
        card.querySelector<HTMLElement>("input:not([type=hidden])")?.focus();
        // The remove button comes before the card's own controls in the Tab order, as it is drawn.
        for (let press = 0; press < 3 && document.activeElement !== remove; press++) {
            await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        }
        assert.strictEqual(document.activeElement, remove, focused());
    });

    it("Tab leaves Filter analyses and closes it; Shift+Tab goes back to Analyze", async () => {
        await openGraph();
        const analyze = within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", {
            name: "Analyze",
        });
        await userEvent.click(analyze);
        await screen.findByRole("combobox", { name: "Filter analyses" });
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Filter analyses" }), "still open");
        });
        assert.notStrictEqual(document.activeElement, document.body, "focus fell to the page");
        assert.notStrictEqual(document.activeElement, analyze, "Tab went back, not on");

        await userEvent.click(analyze);
        await screen.findByRole("combobox", { name: "Filter analyses" });
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Filter analyses" }), "still open");
            assert.strictEqual(document.activeElement, analyze, focused());
        });
    });

    it("Tab in Filter analyses with letters typed takes the highlighted analysis", async () => {
        await openGraph();
        const analyze = within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", {
            name: "Analyze",
        });
        await userEvent.click(analyze);
        await screen.findByRole("combobox", { name: "Filter analyses" });
        await userEvent.keyboard("cluster");
        const highlighted = await waitFor(() => {
            const option = screen.getAllByRole("option").find((o) => o.getAttribute("aria-selected") === "true");
            assert.isDefined(option, "no analysis highlighted");
            return option.textContent ?? "";
        });
        await userEvent.keyboard("{Tab}");
        // Its card opens, with focus on its Run button, so Enter runs it.
        const card = await screen.findByRole("form");
        assert.include(highlighted, card.getAttribute("aria-label") ?? "(no name)");
        assert.strictEqual(document.activeElement, within(card).getByRole("button", { name: /^Run / }), focused());
    });

    it("Escape on a button in the inspector clears the graph's selection", async () => {
        const { session } = await openGraph();
        await session.selection.apply({
            nodes: session.data
                .nodes()
                .slice(0, 2)
                .map((node) => node.id),
        });
        // The inspector shows the selection; on its Style tab, Add to node shape is a button, not a field.
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        await userEvent.click(await within(inspector).findByRole("tab", { name: "Style" }));
        const field = await within(inspector).findByRole("button", { name: "Add to node shape" });
        field.focus();
        await userEvent.keyboard("{Escape}");
        // The command runs on the key press itself, so the selection reads as it stands.
        assert.strictEqual(session.selection.size, 0, "Escape kept the selection");
    });

    it("Enter on Undo with nothing left to undo says so", async () => {
        const { store } = await openGraph();
        await openRow("Picked");
        await userEvent.click(await screen.findByRole("button", { name: "Remove node color" }));
        const undo = screen.getByRole("button", { name: /^Undo( |$)/ });
        await waitFor(() => {
            assert.strictEqual(undo.getAttribute("aria-disabled"), "false");
        });
        undo.focus();
        // Every step the setup and the removal recorded, taken back one Enter at a time.
        for (let press = 0; press < 10 && undo.getAttribute("aria-disabled") === "false"; press++) {
            const before = store.get().notice;
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.notStrictEqual(store.get().notice, before, "Undo said nothing");
            });
        }
        await waitFor(() => {
            assert.strictEqual(undo.getAttribute("aria-disabled"), "true", "there was still something to undo");
        });
        assert.strictEqual(document.activeElement, undo, "focus stays on Undo");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.strictEqual(store.get().announcement, "Nothing to undo");
        });
    });

    it("Tab from Add to node text passes over the full Fill +", async () => {
        await openGraph();
        await openRow("Everything");
        const text = await screen.findByRole("button", { name: "Add to node text" });
        const fill = screen.getByRole("button", { name: "Add to node fill" });
        assert.strictEqual(fill.getAttribute("aria-disabled"), "true", "Fill has nothing left to add");
        text.focus();
        await userEvent.keyboard("{Tab}");
        assert.notStrictEqual(document.activeElement, fill, focused());
        assert.notStrictEqual(document.activeElement, document.body, "focus fell to the page");
        // The pointer still hears why.
        await userEvent.hover(fill);
        // A hang guard: the tooltip waits its 1 s open delay, as long as findBy's default.
        const tip = await screen.findByRole("tooltip", {});
        assert.strictEqual(tip.textContent, "Everything in node fill is set");
    });

    it("puts the drawing in a region named for it", async () => {
        await openGraph();
        const region = screen.getByRole("region", { name: "Graph drawing" });
        assert.isNotNull(region.querySelector("graphty-element"));
    });
});
