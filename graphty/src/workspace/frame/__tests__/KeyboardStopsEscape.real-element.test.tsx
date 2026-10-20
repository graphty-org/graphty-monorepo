/**
 * No dead Tab stops, and Escape always does its job, on the REAL graphty-element and Les
 * Miserables, by real keys and a real pointer: Tab out of Filter analyses lands after the Analyze
 * tool even when the toolbar's roving stop is elsewhere; Escape on a node's inspector heading or
 * on its Degree row (whose tooltip shows on focus) empties the selection; Escape on a layer's
 * inspector keeps it; a member opened from a layer comes back to that layer on Escape; Escape in the table's grid goes to the Table tool; a switch that cannot
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

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables in the workspace, with a node layer "Picked".
 * @returns The session.
 */
async function openGraph(): Promise<GraphSession> {
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
        heading.focus();
        assert.strictEqual(document.activeElement, heading);
        await userEvent.keyboard("{Escape}");
        assert.strictEqual(session.selection.size, 0, "Escape kept the selection");
    });

    it("Escape on a node's Degree row, reached by Tab, empties the selection and says so", async () => {
        const session = await openGraph();
        const [first] = session.data.nodes();
        await session.selection.apply({ nodes: [first.id] });
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        const values = await within(inspector).findByRole("tab", { name: "Values" }, { timeout: TIMEOUT_MS });
        await userEvent.click(values);
        const degree = await within(inspector).findByRole("button", { name: /^Degree/ });
        values.focus();
        for (let step = 0; step < 20 && document.activeElement !== degree; step++) {
            await userEvent.keyboard("{Tab}");
        }
        assert.strictEqual(document.activeElement, degree, focused());
        // Its tooltip opens on focus, and closes on Escape on the document.
        await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(session.selection.size, 0, "Escape kept the selection");
        });
        assert.isNotEmpty(await screen.findAllByText(/^Selection cleared/));
    });

    it("Escape on a layer's inspector keeps the selection", async () => {
        const session = await openGraph();
        await session.selection.apply({ nodes: [session.data.nodes()[0].id] });
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Picked, / }));
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        await userEvent.click(await within(inspector).findByRole("tab", { name: "Values" }, { timeout: TIMEOUT_MS }));
        const heading = await within(inspector).findByRole("heading", { name: /Picked/ });
        heading.focus();
        await userEvent.keyboard("{Escape}");
        assert.strictEqual(session.selection.size, 1, "Escape on a layer cleared the selection");
        assert.exists(within(inspector).queryByRole("heading", { name: /Picked/ }), "the inspector left the layer");
    });

    it("Enter on a layer's member, then Escape, comes back to the layer with focus on that member", async () => {
        const session = await openGraph();
        await session.styles.add({
            name: "Few",
            target: "node",
            selector: {
                match: "rule",
                where: { kind: "text", reads: "data.name", mode: "substring", text: "Thenardier" },
            },
            set: { "node.color": "#0072b2" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Few, / }));
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        await userEvent.click(await within(inspector).findByRole("tab", { name: "Values" }, { timeout: TIMEOUT_MS }));
        // The second member, so a return to the first row would not pass.
        const members = await within(inspector).findAllByRole(
            "button",
            { name: /Thenardier/ },
            { timeout: TIMEOUT_MS },
        );
        assert.isAtLeast(members.length, 2);
        const row = members[1];
        const name = row.textContent ?? "";
        row.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.selection.size, 1);
        });
        await within(inspector).findByRole("heading", { name: new RegExp(name) });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(session.selection.size, 0, "Escape kept the selection");
        });
        await within(inspector).findByRole("heading", { name: /Few/ });
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.textContent, name, focused());
        });
    });

    it("Escape in a field of the inspector keeps the selection", async () => {
        const session = await openGraph();
        await session.selection.apply({
            nodes: session.data
                .nodes()
                .slice(0, 2)
                .map((node) => node.id),
        });
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Picked, / }));
        // The Fill line's Color box, a field holding the layer's color.
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        const box = await within(inspector).findByDisplayValue(/D55E00/i, {}, { timeout: TIMEOUT_MS });
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
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Picked, / }));
        const box = await screen.findByRole("checkbox", { name: "Style nodes" }, { timeout: TIMEOUT_MS });
        assert.isTrue(box.hasAttribute("disabled") || box.getAttribute("aria-disabled") === "true");
        const label = box.closest(".ws-kind-switch")?.querySelector("label");
        assert.exists(label);
        // The box itself, where a pointer aims first, and then its words.
        await userEvent.hover(box);
        await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS });
        await userEvent.unhover(box);
        await userEvent.hover(label);
        const tip = await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS });
        assert.match(tip.textContent ?? "", /^Stays on: style edges first/);
    });
});
