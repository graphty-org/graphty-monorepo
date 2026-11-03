/**
 * A line "+" just added, on the REAL graphty-element and driven by real keys and clicks, shows no
 * color until one is picked: a new Color line draws an empty swatch and an empty box named "not
 * set", over one color beneath or over colors that vary, and Enter or Tab on it writes nothing and
 * leaves it waiting; typing a color and Enter writes it; on a node's own Style tab, "red" and
 * Enter writes it. The Shape list checks nothing while no shape is set.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/**
 * Les Miserables in the workspace with the starting rows.
 * @returns the session.
 */
async function openScene(): Promise<GraphSession> {
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
    await session.styles.settled();
    return session;
}

/**
 * Opens a tree row's Style tab by a click on the row.
 * @param name - the row's visible name.
 */
async function openStyle(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await screen.findByTestId("style-tab");
}

/**
 * Adds a line with a node section's "+" (and its menu, when it has one), and waits for its box to
 * take focus.
 * @param section - the section's name, as "Add to node <section>" reads.
 * @param channel - the property.
 * @param item - the menu item, when the "+" opens a menu.
 * @returns the line.
 */
async function addLine(section: string, channel: Channel, item?: string): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: `Add to node ${section}` }));
    // A section of one property adds it at once; a section of several opens a menu.
    const menu = await waitFor(() => {
        const found = item === undefined ? null : screen.queryByRole("menuitem", { name: item });
        const line = document.querySelector(`[data-testid="style-tab"] .ws-row[data-line="${channel}"]`);
        assert.isTrue(found !== null || line !== null, "a menu or the line");
        return found;
    });
    if (menu !== null) {
        await userEvent.click(menu);
    }
    return waitFor(() => {
        const line = document.querySelector<HTMLElement>(`[data-testid="style-tab"] .ws-row[data-line="${channel}"]`);
        assert.isNotNull(line, `${channel} drawn`);
        assert.isTrue(line.contains(document.activeElement), "focus in the new line");
        return line;
    });
}

/**
 * The color the layer named `name` writes, upper case.
 * @param session - the session.
 * @param name - the layer's name.
 * @returns the color, or undefined.
 */
function colorOf(session: GraphSession, name: string): string | undefined {
    // A layer on nodes and edges is held as one layer per kind, both under its name.
    const value = session.styles.list().find((layer) => layer.name === name && layer.set?.["node.color"] !== undefined)
        ?.set?.["node.color"];
    return typeof value === "string" ? value.toUpperCase() : undefined;
}

/**
 * Adds a layer of the reader's own on every node and opens its Fill line.
 * @param session - the session.
 * @returns the line and its hex box.
 */
async function newFill(session: GraphSession): Promise<{ line: HTMLElement; box: HTMLInputElement }> {
    await session.styles.addRow({ name: "Paint", target: "both", selector: { match: "everything" } });
    await session.styles.settled();
    await openStyle("Paint");
    await showKind("node");
    const line = await addLine("fill", "node.color", "Color");
    const box = within(line).getByRole<HTMLInputElement>("textbox", { name: /^Node color(,|$)/ });
    return { line, box };
}

/**
 * Asserts a just-added Fill line shows no color: an empty swatch and an empty box, named "not set"
 * with the box's cue.
 * @param line - the line.
 * @param box - its hex box.
 */
function assertBlank(line: HTMLElement, box: HTMLInputElement): void {
    assert.equal(box.value, "", "no hex in the box");
    assert.equal(
        box.getAttribute("aria-label"),
        "Node color, not set, Pick or type",
        "named not set, with no color drawn",
    );
    const swatch = within(line).getByTestId("compact-color-input-swatch");
    assert.equal(swatch.dataset.empty, "true", "an empty swatch");
}

describe("an unset color line shows no color until one is picked", () => {
    it("Enter and Tab on a new Fill line write nothing, and the line keeps waiting", async () => {
        const session = await openScene();
        const { line, box } = await newFill(session);
        assertBlank(line, box);
        const before = JSON.stringify(session.styles.list());
        await userEvent.keyboard("{Enter}");
        await userEvent.click(box);
        await userEvent.keyboard("{Tab}");
        await session.styles.settled();
        assert.equal(JSON.stringify(session.styles.list()), before, "nothing written");
        assert.isUndefined(colorOf(session, "Paint"));
        assert.isTrue(line.isConnected, "the line is still there, waiting");
        assertBlank(line, box);
    });

    it("over colors that vary beneath, no color is drawn", async () => {
        const session = await openScene();
        await session.styles.add({
            name: "Blue",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#0000FF" },
        });
        await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "ids", nodes: ["0", "1"] },
            set: { "node.color": "#FF0000" },
        });
        await session.styles.settled();
        const { line, box } = await newFill(session);
        assertBlank(line, box);
        await userEvent.keyboard("{Enter}");
        await session.styles.settled();
        assert.isUndefined(colorOf(session, "Paint"), "Enter wrote no color");
    });

    it("typing a color and Enter writes it", async () => {
        const session = await openScene();
        await newFill(session);
        await userEvent.keyboard("e4572e{Enter}");
        await waitFor(() => {
            assert.equal(colorOf(session, "Paint"), "#E4572E");
        });
    });

    it("a node's own Style tab over a red node: 'red' and Enter on the new line writes it", async () => {
        const session = await openScene();
        const [node, other] = session.data.nodes().map((n) => String(n.id));
        await session.styles.add({
            name: "Red",
            target: "node",
            // Two nodes: a layer that paints more than this node is not the node's own.
            selector: { match: "ids", nodes: [node, other] },
            set: { "node.color": "#FF0000" },
        });
        await session.styles.settled();
        const before = JSON.stringify(session.styles.list());
        await act(async () => {
            await session.selection.apply({ nodes: [node] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        await screen.findByTestId("style-tab", {});
        const line = await addLine("fill", "node.color");
        const box = within(line).getByRole<HTMLInputElement>("textbox", { name: /^Node color(,|$)/ });
        assertBlank(line, box);
        await userEvent.keyboard("red{Enter}");
        await waitFor(() => {
            assert.notEqual(JSON.stringify(session.styles.list()), before, "red is written for the node");
        });
        const reds = session.styles.list().filter((layer) => {
            const color = layer.set?.["node.color"];
            return typeof color === "string" && color.toUpperCase() === "#FF0000";
        });
        assert.lengthOf(reds, 2, "the node's own red beside the Red layer");
    });

    it("the Shape list checks no shape while none is set", async () => {
        const session = await openScene();
        await session.styles.addRow({ name: "Paint", target: "both", selector: { match: "everything" } });
        await session.styles.settled();
        await openStyle("Paint");
        await showKind("node");
        const line = await addLine("shape", "node.shape", "Shape");
        await userEvent.click(within(line).getByRole("combobox"));
        const options = await screen.findAllByRole("option");
        assert.isAbove(options.length, 1);
        assert.deepEqual(
            options.filter((o) => o.hasAttribute("data-checked")).map((o) => o.textContent),
            [],
            "no shape is checked as if it were set",
        );
    });
});
