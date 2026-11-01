/**
 * Names a screen reader and a voice-control reader use, on the REAL graphty-element, read from the
 * accessibility tree after real clicks, hovers and keys: an icon or cut-short control's tooltip
 * says the words of its name; a sample tile's name carries its visible title; no two links in the
 * footer share a name; Escape in a color box names the kept color in the box's own words; one
 * node named "34" is not read as a count. The cases the tier 3 dry runs logged that no longer
 * reproduce (the attribute list's Data and Structure groups, two "Background color" boxes, the
 * Degree row's unsaid action) stay held by a test here.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openSampleFromStart } from "../../test/open";
import { findValuePicker, render, screen, waitFor, within } from "../../test/test-utils";
import { tooltipOf } from "../../test/tooltip";
import { createWorkspaceStore, type WorkspaceStore } from "../state/store";
import { colorName, FIND_ATTRIBUTE } from "../style/words";
import { Workspace } from "../Workspace";

/** Three kinds of node, a few of each. */
const KINDS = ["agency", "company", "person"] as const;

/**
 * The workspace on the real element, with nodes put in by `load`.
 * @param load - puts the graph in.
 * @returns the session and the store.
 */
async function open(
    load: (session: GraphSession) => Promise<unknown>,
): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Kinds", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await load(session);
    await session.config.set({ startingRows: true, editableBase: true });
    await session.styles.settled();
    return { session, store };
}

/**
 * Nine nodes of three kinds, linked in a ring.
 * @param session - the session.
 */
async function kinds(session: GraphSession): Promise<void> {
    const ids = Array.from({ length: 9 }, (_, i) => `n${String(i)}`);
    await session.data.addNodes(ids.map((id, i) => ({ id, kind: KINDS[i % 3], trained: i % 2 === 0 })));
    await session.data.addEdges(ids.map((id, i) => ({ source: id, target: ids[(i + 1) % ids.length] })));
}

/**
 * Opens a row of the layer tree in the inspector, on its Style tab.
 * @param name - the row's name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return screen.findByTestId("style-tab");
}

/**
 * Asserts that a control's tooltip says the words of its accessible name.
 * @param control - the control.
 */
async function tooltipIsName(control: HTMLElement): Promise<void> {
    const name = control.getAttribute("aria-label") ?? "";
    assert.notEqual(name, "", "the control is named");
    assert.equal(await tooltipOf(control), name, `the tooltip of "${name}"`);
}

describe("accessible names on the start page", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("names each sample tile with its visible title, and no two footer links alike", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        const library = await screen.findByRole("region", { name: "Sample library" });
        const tile = await within(library).findByRole("button", { name: /^Open the Les Miserables sample/ });
        // WCAG 2.5.3: the name holds the words drawn largest on the tile.
        assert.include(tile.getAttribute("aria-label") ?? "", "Who holds the novel together");

        const footer = screen.getByRole("contentinfo");
        const names = within(footer)
            .getAllByRole("link")
            .map((link) => link.getAttribute("aria-label") ?? link.textContent.trim());
        assert.equal(new Set(names).size, names.length, `footer links: ${names.join(" | ")}`);
    });

    it("says the turning button's name in its tooltip", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        await tooltipIsName(await screen.findByRole("button", { name: "Pause the turning" }));
    });
});

describe("accessible names in the workspace", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("says the Main menu's and a layer eye's names in their tooltips", async () => {
        await open(kinds);
        await tooltipIsName(screen.getByRole("button", { name: "Main menu" }));
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await tooltipIsName(within(tree).getByRole("button", { name: "Hide Everything" }));
    });

    it("Escape in the background color box names the kept color in the box's words", async () => {
        await open(kinds);
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(within(tree).getByRole("treeitem", { name: /^Everything, / }));
        const place = screen.getByRole("region", { name: "Graph place" });
        await userEvent.click(within(place).getByRole("button", { name: "Graph Kinds" }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const styleTab = await within(inspector).findByRole("tab", { name: "Style" });
        await userEvent.click(styleTab);
        const group = await within(inspector).findByRole("group", { name: "Background color" });
        // One control per name in the tab: the dry runs heard two "Background color".
        assert.lengthOf(within(inspector).getAllByRole("textbox", { name: /^Background color/ }), 1);
        const box = within(group).getByRole<HTMLInputElement>("textbox", { name: /^Background color/ });
        const kept = box.value;
        assert.include(box.getAttribute("aria-label") ?? "", colorName(`#${kept}`), "the box names its color");
        await userEvent.click(box);
        await userEvent.keyboard("123456{Escape}");
        // Waits for the note, whatever its words, so wrong words fail rather than wait.
        const said = await waitFor(() => {
            const notes = within(group)
                .getAllByRole("status")
                .map((status) => status.textContent)
                .filter((text) => text.startsWith("Edit discarded"));
            assert.isNotEmpty(notes);
            return notes;
        });
        assert.include(said, `Edit discarded; this stays ${kept} ${colorName(`#${kept}`)}.`);
    });

    it("says one node named 34 as a node, not a count", async () => {
        const { store } = await open(async (session) => {
            await session.data.addNodes([{ id: "34" }, { id: "2" }, { id: "3" }]);
            await session.data.addEdges([
                { source: "34", target: "2" },
                { source: "2", target: "3" },
            ]);
        });
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("no element");
        }
        await element.waitForStableFrame();
        const at = element.nodeScreenPosition("34");
        assert.isTrue(at?.visible, "node 34 is on screen");
        await userEvent.click(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        // Waits for the selection to be said, whatever the words, so wrong words fail rather than wait.
        const said = await waitFor(() => {
            const words = store.get().announcement ?? "";
            assert.match(words, / selected$/);
            return words;
        });
        assert.equal(said, "node 34 selected");
    });

    it("names the attribute list's Data and Structure groups", async () => {
        const { session } = await open(kinds);
        await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();
        await openStyle("Mine");
        if (screen.queryByRole("group", { name: "Which nodes" }) === null) {
            await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }));
        }
        const region = await screen.findByRole("group", { name: "Which nodes" });
        if (screen.queryByRole("combobox", { name: FIND_ATTRIBUTE }) === null) {
            await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        }
        const list = await screen.findByRole("listbox", { name: "Attributes" });
        const data = within(list).getByRole("group", { name: "Data" });
        assert.isNotNull(within(data).queryByRole("option", { name: /^kind(,|$)/ }), "kind is under Data");
        const structure = within(list).getByRole("group", { name: "Structure" });
        assert.isAbove(within(structure).getAllByRole("option").length, 0);
    });

    it("says the names of a data-colored layer's Stop varying and value actions in their tooltips", async () => {
        const { session } = await open(kinds);
        await session.styles.encode({ column: { kind: "node", name: "kind" }, channel: "node.color", name: "Kinds" });
        await session.styles.settled();
        const tab = await openStyle("Kinds");
        await tooltipIsName(await within(tab).findByRole("button", { name: "Stop varying node color by data" }));
        // The color box opens the popover listing each kind.
        await userEvent.click(await within(tab).findByRole("button", { name: /^Node color: kind/ }));
        const grid = await screen.findByRole("grid", { name: /groups$/ });
        const company = within(grid)
            .getAllByRole("row")
            .find((row) => row.querySelector("[data-group-name]")?.textContent.startsWith("company") === true);
        assert.isDefined(company, "a row for company");
        // Its name cell reads the group then its count, with no space before the comma.
        const cell = company?.querySelector<HTMLElement>("[data-group-name]");
        assert.match(cell?.textContent ?? "", /^company, \d+ nodes?/);
        await tooltipIsName(within(company).getByRole("button", { name: "kind company actions" }));
    });

    it("says a label's cut-short source and its settings gear in tooltips that match their names", async () => {
        await open(kinds);
        const tab = await openStyle("Everything");
        const nodes = tab.querySelector<HTMLElement>('[data-group="node"]');
        if (nodes === null) {
            throw new Error("the Style tab draws no Nodes group");
        }
        await userEvent.click(within(nodes).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: /^kind(,|$)/ }));
        const source = await screen.findByRole("button", { name: "Label source: kind" });
        await tooltipIsName(source);
        const entry = source.closest<HTMLElement>("[data-line]");
        assert.isNotNull(entry);
        await tooltipIsName(within(entry).getByRole("button", { name: / settings$/ }));
    });

    it("tells a reader what the Degree row does, in its description", async () => {
        await open(kinds);
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("no element");
        }
        await element.waitForStableFrame();
        const at = element.nodeScreenPosition("n0");
        await userEvent.click(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const values = await within(inspector).findByRole("group", { name: "Summary values" });
        const degree = await within(values).findByRole("button", { name: /^Degree/ });
        assert.equal(degree.getAttribute("aria-description"), "Select this node and its neighbors");
    });

    it("names a data-colored layer's popover close and palette reset by what they act on", async () => {
        const { session } = await open(kinds);
        await session.styles.encode({ column: { kind: "node", name: "kind" }, channel: "node.color", name: "Kinds" });
        await session.styles.settled();
        const tab = await openStyle("Kinds");
        await userEvent.click(await within(tab).findByRole("button", { name: /^Node color: kind/ }));
        const grid = await screen.findByRole("grid", { name: /groups$/ });
        const popover = grid.closest<HTMLElement>("[role=dialog]");
        if (popover === null) {
            throw new Error("the groups are in no pop-out");
        }
        const title = popover.querySelector("h2")?.textContent ?? "";
        assert.notEqual(title, "", "the pop-out has a title");
        assert.isNotNull(within(popover).queryByRole("button", { name: `Close ${title}` }), "Close names its panel");

        await userEvent.click(within(popover).getByRole("combobox", { name: /^Palette/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Seven bright colors" }));
        // Waits for the reset, whatever its words, so wrong words fail rather than wait.
        const reset = await within(popover).findByRole("button", { name: /^Reset .*palette/i });
        assert.equal(reset.getAttribute("aria-label"), "Reset the node color palette to default");
        await tooltipIsName(reset);
    });

    it("says a number-colored layer's step actions in their tooltips", async () => {
        const { session } = await open(async (s) => {
            await s.data.addNodes(Array.from({ length: 9 }, (_, i) => ({ id: `n${String(i)}`, score: i + 1 })));
        });
        await session.styles.encode({ column: { kind: "node", name: "score" }, channel: "node.color", name: "Scores" });
        await session.styles.settled();
        const tab = await openStyle("Scores");
        await userEvent.click(await within(tab).findByRole("button", { name: /^Node color: score/ }));
        const popover = await screen.findByRole("dialog", { name: /score/ });
        await userEvent.click(within(popover).getByRole("combobox", { name: /^Scale/ }));
        await userEvent.click(await screen.findByRole("option", { name: /^Equal bins/ }));
        const steps = await within(popover).findByRole("list", { name: "Steps" });
        const [first] = within(steps).getAllByRole("listitem");
        await tooltipIsName(within(first).getByRole("button", { name: / actions$/ }));
    });

    it("says the filter and time window chips' names in their tooltips", async () => {
        const { session } = await open(async (s) => {
            await kinds(s);
            await s.data.addNodes([{ id: "dated", kind: "agency", seen: Date.UTC(2025, 0, 1) }]);
        });
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "text", reads: "data.kind", mode: "exact", text: "agency" },
        });
        await tooltipIsName(await screen.findByRole("button", { name: /^Filter: / }));
        await session.time.setField({ nodes: { start: "seen" } });
        await session.time.window({ from: Date.UTC(2024, 11, 30), to: Date.UTC(2025, 0, 2) });
        await tooltipIsName(await screen.findByRole("button", { name: /^Time: / }));
    });

    it("names the samples dialog's separate-graph icon in its tooltip too", async () => {
        // Over an open project, so each tile offers to open as a separate graph.
        const { session, store } = await openSampleFromStart("Les Miserables");
        assert.isAbove(session.data.sources().length, 0, "the sample is a source");
        store.set({ place: "data" });
        await userEvent.click(await screen.findByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /Samples/ }));
        const dialog = await screen.findByRole("dialog", { name: "Samples" });
        // The tiles draw with the dialog, so a missing icon fails at once rather than waits.
        await tooltipIsName(within(dialog).getByRole("button", { name: "Open Les Miserables as a separate graph" }));
    });
});
