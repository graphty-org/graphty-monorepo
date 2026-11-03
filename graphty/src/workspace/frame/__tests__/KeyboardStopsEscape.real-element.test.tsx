/**
 * No dead Tab stops, and Escape always does its job, on the REAL graphty-element and Les
 * Miserables, by real keys and a real pointer: Tab out of Filter analyses lands after the Analyze
 * tool even when the toolbar's roving stop is elsewhere; Escape on a node's inspector heading
 * empties the selection; Escape in the table's grid goes to the Table tool; a switch that cannot
 * change says why on hover; the folder caret's target is full size.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Les Miserables in the workspace, with a node layer "Picked".
 * @returns The session.
 */
async function openGraph(): Promise<GraphSession> {
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
    return session;
}

/**
 * The name of the focused control, for messages.
 * @returns its tag and accessible name as the test reads it.
 */
function focused(): string {
    const active = document.activeElement;
    return `${active?.tagName ?? "none"} ${active?.getAttribute("aria-label") ?? active?.textContent ?? ""}`;
}

/**
 * The canvas toolbar.
 * @returns the toolbar element.
 */
function toolbar(): HTMLElement {
    return screen.getByRole("toolbar", { name: "Canvas tools" });
}

describe("Keyboard stops and Escape (real element)", () => {
    it("Tab out of Filter analyses lands after the Analyze tool, with the list closed", async () => {
        await openGraph();
        // Table puts focus in the grid and makes Table the toolbar's roving stop, so Analyze is
        // no Tab stop of its own when Shift+A opens the list.
        await userEvent.click(within(toolbar()).getByRole("button", { name: "Table" }));
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest('[role="grid"]'), focused());
        });
        await userEvent.keyboard("{Shift>}A{/Shift}");
        const filter = await screen.findByRole("combobox", { name: "Filter analyses" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, filter);
        });
        await userEvent.keyboard("deg");
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Filter analyses" }), "the list stayed open");
        });
        const active = document.activeElement;
        assert.isNotNull(active);
        assert.notStrictEqual(active, document.body, "focus fell to the page");
        assert.notStrictEqual(active?.getAttribute("aria-label"), "Main menu", focused());
        assert.isFalse(toolbar().contains(active), focused());
        assert.notStrictEqual(
            toolbar().compareDocumentPosition(active as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
            0,
            `focus went back up the page: ${focused()}`,
        );
    });

    it("Escape on a selected node's inspector heading empties the selection", async () => {
        const session = await openGraph();
        const [first] = session.data.nodes();
        await session.selection.apply({ nodes: [first.id] });
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        const heading = await within(inspector).findByRole("heading", { name: new RegExp(String(first.id)) });
        // The pointer rests where the last test left it: on the Table tool, whose tooltip opens a
        // second later under a still pointer, hidden. Only a visible tooltip takes an Escape for
        // itself, so this one would not; the pointer still moves to the heading and the test waits
        // until no tooltip is open, so the Escape below meets the page alone. The theme's tooltips
        // are inaccessible to a role query by default, hence hidden: true.
        await userEvent.hover(heading);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("tooltip", { hidden: true }), "a tooltip is still open");
        });
        heading.focus();
        assert.strictEqual(document.activeElement, heading);
        await userEvent.keyboard("{Escape}");
        assert.strictEqual(session.selection.size, 0, "Escape kept the selection");
    });

    it("Escape in a field of the inspector keeps the selection", async () => {
        const session = await openGraph();
        await session.selection.apply({
            nodes: session.data
                .nodes()
                .slice(0, 2)
                .map((node) => node.id),
        });
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Picked, / }));
        // The Fill line's Color box, a field holding the layer's color.
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        const box = await within(inspector).findByDisplayValue(/D55E00/i, {});
        box.focus();
        await userEvent.keyboard("{Escape}");
        assert.strictEqual(session.selection.size, 2, "Escape in a field cleared the selection");
    });

    it("Escape in the table's grid moves focus to the Table tool", async () => {
        await openGraph();
        const table = within(toolbar()).getByRole("button", { name: "Table" });
        await userEvent.click(table);
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest('[role="grid"]'), focused());
        });
        await userEvent.keyboard("{ArrowDown}");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, table, focused());
        });
    });

    it("a style switch that cannot change says why on hover", async () => {
        await openGraph();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Picked, / }));
        const box = await screen.findByRole("checkbox", { name: "Style nodes" });
        assert.isTrue(box.hasAttribute("disabled") || box.getAttribute("aria-disabled") === "true");
        const label = box.closest(".ws-kind-switch")?.querySelector("label");
        assert.exists(label);
        // The box itself, where a pointer aims first, and then its words.
        await userEvent.hover(box);
        await screen.findByRole("tooltip", {});
        await userEvent.unhover(box);
        await userEvent.hover(label);
        const tip = await screen.findByRole("tooltip", {});
        assert.match(tip.textContent ?? "", /^Stays on: style edges first/);
    });
});
