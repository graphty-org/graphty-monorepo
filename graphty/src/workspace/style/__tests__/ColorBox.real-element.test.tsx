/**
 * The color box of a style line, on the REAL graphty-element and driven by real clicks and keys:
 * after Enter, the next color typed replaces the value; a click into the focused box selects its
 * value, so typing replaces it; Control+Z right after Enter undoes the change in the drawing; the
 * box is read with a color word; a refused entry draws nothing (Figma reverts it silently), with the
 * name still beside the box.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/**
 * Les Miserables in the workspace, one reader's layer open on its Style tab, and a new Color
 * line added with Fill's "+", focus in its box.
 * @returns the session and the line.
 */
async function openColorLine(): Promise<{ session: GraphSession; line: HTMLElement; box: HTMLInputElement }> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
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
    await session.styles.addRow({ name: "Paint", target: "both", selector: { match: "everything" } });
    await session.styles.settled();

    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Paint, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await screen.findByTestId("style-tab");
    await showKind("node");
    await userEvent.click(await screen.findByRole("button", { name: "Add to node fill" }));
    const line = await waitFor(() => {
        const found = document.querySelector<HTMLElement>('[data-testid="style-tab"] .ws-row[data-line="node.color"]');
        assert.isNotNull(found);
        assert.isTrue(found?.contains(document.activeElement), "focus is in the new Color line");
        return found;
    });
    if (line === null) {
        throw new Error("no Color line");
    }
    const box = line.querySelector<HTMLInputElement>('[data-testid="compact-color-input-hex"]');
    if (box === null) {
        throw new Error("no color box");
    }
    return { session, line, box };
}

/**
 * The Color line's box as drawn now: the line's first write redraws the tab, with a new box.
 * @returns the box.
 */
function hexBox(): HTMLInputElement {
    const box = document.querySelector<HTMLInputElement>(
        '[data-testid="style-tab"] .ws-row[data-line="node.color"] [data-testid="compact-color-input-hex"]',
    );
    assert.isNotNull(box, "the Color line has a color box");
    return box;
}

/**
 * The colors the layers write, upper case (the reader's layer among them).
 * @param session - the session.
 * @returns the colors.
 */
function painted(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((one: Layer) => !["Hovered", "Selected"].includes(one.name ?? ""))
        .map((one: Layer) => one.set?.["node.color"])
        .filter((color): color is string => typeof color === "string")
        .map((color) => color.toUpperCase());
}

describe("a style line's color box", () => {
    it("replaces its value after Enter and after a click, undoes with Control+Z, and says the color", async () => {
        const { session } = await openColorLine();
        await userEvent.keyboard("blue{Enter}");
        await waitFor(() => {
            assert.include(painted(session), "#0000FF");
            assert.equal(hexBox().value, "0000FF");
            assert.strictEqual(document.activeElement, hexBox(), "focus is in the box drawn now");
        });
        assert.match(hexBox().getAttribute("aria-label") ?? "", /, blue$/, "read with its color word");

        await userEvent.keyboard("red{Enter}");
        await waitFor(() => {
            assert.include(painted(session), "#FF0000", "the color typed after Enter replaced the value");
        });

        await userEvent.click(hexBox());
        await userEvent.keyboard("green{Enter}");
        await waitFor(() => {
            assert.include(painted(session), "#008000", "a click into the focused box selected its value");
        });

        // Writes this close together are one undo step (the element merges edits of one value
        // within a second), so Control+Z takes the line back to before them all; what matters
        // here is that the key reached the app's undo, not the box's empty one.
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.notInclude(painted(session), "#008000", "Control+Z right after Enter undid the change");
        });
    });

    it("reverts a refused entry and draws nothing for it, the name and the vary button beside the box", async () => {
        const { session, line, box } = await openColorLine();
        const before = painted(session);
        await userEvent.keyboard("bluex{Enter}");
        await waitFor(() => {
            assert.notStrictEqual(hexBox().value.toLowerCase(), "bluex", "the box no longer holds the refused text");
        });
        assert.deepEqual(painted(session), before, "nothing was written");
        assert.isNull(within(line).queryByRole("alert"), "no sentence is drawn under the row");
        const name = line.querySelector<HTMLElement>(".ws-field-name");
        const vary = line.querySelector<HTMLElement>(".ws-vary button");
        assert.isNotNull(name);
        assert.isNotNull(vary);
        const field = box.getBoundingClientRect();
        const middle = (rect: DOMRect): number => rect.top + rect.height / 2;
        assert.closeTo(middle(name?.getBoundingClientRect() ?? field), middle(field), 2, "the name is beside the box");
        assert.closeTo(middle(vary?.getBoundingClientRect() ?? field), middle(field), 2, "so is the vary button");
    });

    it("writes the Fill opacity typed in its picker to the node opacity, the color staying six digits", async () => {
        const { session } = await openColorLine();
        await userEvent.keyboard("blue{Enter}");
        await waitFor(() => {
            assert.include(painted(session), "#0000FF");
        });
        // The Style tab's field is too narrow for the opacity box beside the hex, so the opacity
        // is typed in the picker the swatch opens.
        const line = document.querySelector<HTMLElement>('[data-testid="style-tab"] .ws-row[data-line="node.color"]');
        if (line === null) {
            throw new Error("no Color line");
        }
        await userEvent.click(within(line).getByTestId("compact-color-input-swatch"));
        const opacity = await screen.findByTestId("color-picker-opacity");
        await userEvent.tripleClick(opacity);
        await userEvent.keyboard("50{Enter}");
        await waitFor(() => {
            const paint = session.styles.list().find((one: Layer) => one.name === "Paint" && one.target === "node");
            assert.strictEqual(paint?.set?.["node.opacity"], 0.5);
            const color = paint?.set?.["node.color"];
            assert.strictEqual(typeof color === "string" ? color.toUpperCase() : color, "#0000FF");
        });
        assert.isNull(
            document.querySelector('[data-testid="style-tab"] .ws-row[data-line="node.opacity"]'),
            "no Opacity line of its own",
        );
    });
});
