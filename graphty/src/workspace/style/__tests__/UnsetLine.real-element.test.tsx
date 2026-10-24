/**
 * A line "+" just added, on the REAL graphty-element and driven by real keys and clicks, takes the
 * value it shows: Enter on a new Color line writes the color it shows in italics, and so does
 * typing exactly that color; on a node's own Style tab, "red" and Enter on its italic red line
 * writes it. Its box says it is not set and what the drawing shows. The Shape list checks nothing
 * while no shape is set.
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
 * @returns the line's hex box and the color it shows.
 */
async function newFill(session: GraphSession): Promise<{ box: HTMLInputElement; shown: string }> {
    await session.styles.addRow({ name: "Paint", target: "both", selector: { match: "everything" } });
    await session.styles.settled();
    await openStyle("Paint");
    await showKind("node");
    const line = await addLine("fill", "node.color", "Color");
    const box = within(line).getByRole<HTMLInputElement>("textbox", { name: /^Node color(,|$)/ });
    assert.equal(box.dataset.isDefault, "true", "the line shows a color it does not set");
    return { box, shown: box.value.toUpperCase() };
}

describe("an unset line takes the value it shows", () => {
    it("Enter on a new Fill line writes the color it shows, and its box said it was not set", async () => {
        const session = await openScene();
        const { box, shown } = await newFill(session);
        assert.match(
            box.getAttribute("aria-label") ?? "",
            new RegExp(`^Node color, not set, drawn #${shown} \\w`),
            "not set, and what the drawing shows",
        );
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(colorOf(session, "Paint"), `#${shown}`, "the layer holds the color shown");
        });
    });

    it("typing exactly the color shown, and Enter, writes it", async () => {
        const session = await openScene();
        const { shown } = await newFill(session);
        await userEvent.keyboard(`${shown.toLowerCase()}{Enter}`);
        await waitFor(() => {
            assert.equal(colorOf(session, "Paint"), `#${shown}`);
        });
    });

    it("a node's own Style tab: 'red' and Enter on a line showing red writes it", async () => {
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
        assert.equal(box.value, "FF0000", "the line shows the red the node draws");
        assert.equal(box.dataset.isDefault, "true", "in italics: not set here");
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
