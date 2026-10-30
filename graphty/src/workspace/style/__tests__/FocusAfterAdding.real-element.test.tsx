/**
 * After adding a style line or a condition card, on the REAL graphty-element and driven by real
 * clicks and keys, focus is where the next keystroke belongs: a new Color line's text box (not its
 * swatch), so a typed color and Enter repaint at once; a Width line added on a layer made from a
 * selection in its box; a new Shape line on its select, its value not drawn selected, and a typed
 * shape name opening its list on that shape; a new text card in its text box (not its match menu), so typing straight
 * after picking the column narrows the rule.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/**
 * Les Miserables in the workspace with the starting rows, and one reader's layer on nodes and edges.
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
    await session.styles.addRow({ name: "Both", target: "both", selector: { match: "everything" } });
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
 * Adds a property with a section's "+" and its menu; a "+" with one property left adds it with no
 * menu.
 * @param kind - nodes or edges.
 * @param title - the section's title.
 * @param item - the property's name in the menu.
 * @param channel - the property.
 * @returns the new line, once it holds focus.
 */
async function addLine(kind: "node" | "edge", title: string, item: string, channel: Channel): Promise<HTMLElement> {
    const selector = `[data-testid="style-tab"] .ws-row[data-line="${channel}"]`;
    await userEvent.click(await screen.findByRole("button", { name: `Add to ${kind} ${title}` }));
    const menu = await waitFor(() => {
        const found = screen.queryByRole("menuitem", { name: item });
        assert.isTrue(found !== null || document.querySelector(selector) !== null, "a menu or the line");
        return found;
    });
    if (menu !== null) {
        await userEvent.click(menu);
    }
    return waitFor(() => {
        const line = document.querySelector<HTMLElement>(selector);
        assert.isNotNull(line, `${channel} added`);
        assert.isTrue(line?.contains(document.activeElement), `focus is in the new ${channel} line`);
        return line;
    });
}

/**
 * The value the reader's layers write for a property.
 * @param session - the session.
 * @param channel - the property.
 * @returns the values, one per layer that writes it.
 */
function written(session: GraphSession, channel: Channel): unknown[] {
    return session.styles
        .list()
        .filter(
            (layer: Layer) => layer.set?.[channel] !== undefined && !["Hovered", "Selected"].includes(layer.name ?? ""),
        )
        .map((layer: Layer) => layer.set?.[channel]);
}

describe("focus after adding a line or a card", () => {
    it.each([
        ["node", "fill", "node.color"],
        ["edge", "line", "edge.color"],
    ] as const)("a new %s Color line takes a typed color in its text box", async (kind, title, channel) => {
        const session = await openScene();
        await openStyle("Both");
        await showKind(kind);
        await addLine(kind, title, "Color", channel);
        const focused = document.activeElement as HTMLInputElement;
        assert.strictEqual(focused.tagName, "INPUT", "the color's text box, not its swatch button");
        assert.notMatch(focused.getAttribute("aria-label") ?? "", /^Pick /);
        await userEvent.keyboard("blue{Enter}");
        await waitFor(() => {
            assert.include(
                written(session, channel).map((value) => String(value).toUpperCase()),
                "#0000FF",
                "the typed color is written with no extra click",
            );
        });
    });

    it("a new Shape line holds focus on its select, draws nothing selected, and takes a typed shape", async () => {
        const session = await openScene();
        await openStyle("Both");
        await showKind("node");
        await addLine("node", "shape", "Shape", "node.shape");
        const focused = document.activeElement as HTMLInputElement;
        assert.strictEqual(focused.getAttribute("role"), "combobox");
        assert.isTrue(focused.readOnly, "a select's box takes no typing");
        assert.strictEqual(focused.selectionStart, focused.selectionEnd, "so nothing in it is drawn selected");
        // Typing a shape's name opens its list on that shape, and Enter picks it.
        await userEvent.keyboard("Box{Enter}");
        await waitFor(() => {
            assert.include(written(session, "node.shape"), "box", "the typed shape is written");
        });
    });

    it("Width added on a layer made from a found selection focuses its box", async () => {
        const session = await openScene();
        const find = await screen.findByRole("combobox", { name: "Find" });
        await userEvent.click(find);
        await userEvent.keyboard("=shared_chapters >= `5`{Enter}");
        await waitFor(() => {
            assert.isAbove(session.selection.edges.length, 0, "edges are selected");
        });
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }
        const line = await addLine("edge", "line", "Width", "edge.width");
        const focused = document.activeElement as HTMLInputElement;
        assert.isTrue(line.querySelector(".ws-field-control")?.contains(focused), "focus is in the Width box");
        assert.strictEqual(focused.tagName, "INPUT");
        await userEvent.keyboard("4{Enter}");
        await waitFor(() => {
            assert.include(written(session, "edge.width"), 4, "the typed width is written");
        });
    });

    it("a new text card takes typing in its text box at once", async () => {
        const session = await openScene();
        await session.styles.add({
            name: "Names",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#D55E00" },
        });
        await session.styles.settled();
        await openStyle("Names");
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }));
        const region = await screen.findByRole("group", { name: "Which nodes" });
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await userEvent.click(await screen.findByRole("option", { name: /^name(,|$)/ }));
        const box = await within(region).findByRole("combobox", { name: "name: text to match" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box, "focus is in the card's text box, not its match menu");
        });
        await userEvent.keyboard("Mme");
        await waitFor(() => {
            const layer = session.styles.list().find((each) => each.name === "Names");
            assert.include(JSON.stringify(layer?.selector), "Mme", "the typed words narrow the rule");
        });
    });
});
