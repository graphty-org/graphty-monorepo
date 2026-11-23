/**
 * Style panel v2's sides (design/ui/style-panel-v2/design.md, rubric R6 sides and R17) on the REAL
 * graphty-element, driven by real clicks and typing: a label's Margin is one number writing all four sides until
 * its "Separate sides" checkbox line splits it into top | right and bottom | left; a shape's Fit to label padding
 * is one number writing X and Y until its "Separate sides" line splits it into the pair. The modifier is a line of
 * its own (design 2.6, E674), never a toggle beside the number. Each typed value is one undo step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openAdvanced, openGraph, openProject, openStyle, sectionOf, written } from "./v2Harness";

/**
 * Waits for a line in a part of the page.
 * @param root - where it is.
 * @param line - its `data-line`.
 * @returns the line.
 */
async function lineOf(root: ParentNode, line: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = root.querySelector<HTMLElement>(`.ws-row[data-line="${line}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * The number fields of a line.
 * @param line - the line.
 * @returns its inputs.
 */
function inputsOf(line: HTMLElement): HTMLInputElement[] {
    return [...line.querySelectorAll<HTMLInputElement>("input")];
}

/**
 * Types a number into a field and commits it with Enter.
 * @param input - the field.
 * @param text - what to type.
 */
async function typeNumber(input: HTMLInputElement, text: string): Promise<void> {
    await userEvent.clear(input);
    await userEvent.type(input, `${text}{Enter}`);
}

/**
 * Opens a thing row's settings pop-over.
 * @param row - the row.
 * @param name - its settings button's name.
 * @returns the pop-over.
 */
async function popoverOf(row: HTMLElement, name: RegExp): Promise<HTMLElement> {
    await userEvent.click(within(row).getByRole("button", { name }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
        assert.isNotNull(found);
        return found;
    });
}

describe("Style panel v2 splits a padding into its sides from a line of its own", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("a label's Margin writes all four sides from one number, and four once Sides is on", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, { set: { "node.color": "#E8590C", "node.label": "Hello" } });
        const tab = await openStyle("Key people");
        const row = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>('[data-thing="label"]');
            assert.isNotNull(found);
            return found;
        });
        // Margin is a rare Box stroke line: the pop-over's Advanced dialog's (design "Input rules").
        const pop = await openAdvanced(await popoverOf(row, /^Node label settings/));
        const margin = await lineOf(pop, "node.labelStyle.marginTop");
        assert.lengthOf(inputsOf(margin), 1, "one number while the sides are joined");

        const steps = session.history.position;
        await typeNumber(inputsOf(margin)[0], "6");
        await waitFor(() => {
            const style = written(session, id, "node.labelStyle") as Record<string, unknown>;
            for (const side of ["marginTop", "marginRight", "marginBottom", "marginLeft"]) {
                assert.strictEqual(style[side], 6, `${side} takes the one number`);
            }
        });
        assert.strictEqual(session.history.position, steps + 1, "one step");

        assert.isNull(within(margin).queryByRole("button", { name: "Sides" }), "no toggle beside the number");
        const separate = await lineOf(pop, "node.labelStyle.marginTop:sides");
        await userEvent.click(within(separate).getByRole("checkbox", { name: "Separate sides" }));
        await waitFor(() => {
            assert.lengthOf(inputsOf(margin), 4, "top, right, bottom and left once split");
        });
        await typeNumber(inputsOf(margin)[1], "9");
        await waitFor(() => {
            const style = written(session, id, "node.labelStyle") as Record<string, unknown>;
            assert.strictEqual(style.marginRight, 9, "the right side alone changes");
            assert.strictEqual(style.marginTop, 6);
            assert.strictEqual(style.marginBottom, 6);
            assert.strictEqual(style.marginLeft, 6);
        });

        // Joined again, every side takes the top's value.
        await userEvent.click(within(separate).getByRole("checkbox", { name: "Separate sides" }));
        await waitFor(() => {
            const style = written(session, id, "node.labelStyle") as Record<string, unknown>;
            assert.strictEqual(style.marginRight, 6);
            assert.lengthOf(inputsOf(margin), 1);
        });
    });

    it("a node's Fit to label padding (the Size row's) writes X and Y from one number, and the pair once Sides is on", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        // Shape's "+" lists Size and Shape; Fit to label sizes the node, so it is Size's (ia-design 2).
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const row = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('[data-thing="size"]');
            assert.isNotNull(found);
            return found;
        });
        // Fit to label is a rare setting: the pop-over's Advanced dialog's (design "Input rules").
        const pop = await openAdvanced(await popoverOf(row, /^Node size settings/));
        const padding = await lineOf(pop, "node.labelPaddingX");
        assert.lengthOf(inputsOf(padding), 1, "one number while X and Y are joined");

        const steps = session.history.position;
        await typeNumber(inputsOf(padding)[0], "5");
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.labelPaddingX"), 5);
            assert.strictEqual(written(session, nodes, "node.labelPaddingY"), 5);
        });
        assert.strictEqual(session.history.position, steps + 1, "one step");

        assert.isNull(within(padding).queryByRole("button", { name: "Sides" }), "no toggle beside the number");
        const separate = await lineOf(pop, "node.labelPaddingX:sides");
        await userEvent.click(within(separate).getByRole("checkbox", { name: "Separate sides" }));
        await waitFor(() => {
            assert.lengthOf(inputsOf(padding), 2, "X and Y once split");
        });
        await typeNumber(inputsOf(padding)[1], "8");
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.labelPaddingY"), 8, "Y alone changes");
            assert.strictEqual(written(session, nodes, "node.labelPaddingX"), 5);
        });
    });
});
