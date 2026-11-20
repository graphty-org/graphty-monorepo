/**
 * Every number in Style panel v2 is Figma's number input (owner, 2026-11-19: "why is 'Size' a text entry?"),
 * on the REAL graphty-element and real input. Figma's number field has no up / down buttons: its slot at the
 * left is a scrub handle, the arrow keys step (Shift ten steps), and typing applies on Enter. A label's Size:
 * a real 20 px drag right on its slot raises it by 10 and draws a larger label, in one undo step; ArrowUp and
 * Shift+ArrowUp step 1 and 10 steps; "abc" then Enter keeps the old value.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { dragAcross } from "../../../test/real-pointer";
import { screen, waitFor } from "../../../test/test-utils";
import { openGraph, openStyle, picture, sectionOf, written } from "./v2Harness";

/**
 * The label style's size the layer writes.
 * @param session - the session.
 * @param id - the layer.
 * @returns the size.
 */
function sizeOf(session: GraphSession, id: string): number {
    const style = written(session, id, "node.labelStyle") as { size?: number } | undefined;
    return style?.size ?? Number.NaN;
}

/**
 * How many pixels of a picture are the label's red.
 * @param image - the picture.
 * @returns the count.
 */
function redPixels(image: ImageData): number {
    let count = 0;
    for (let i = 0; i < image.data.length; i += 4) {
        const [r, g, b] = [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
        if (r > g + 120 && r > b + 120) {
            count++;
        }
    }
    return count;
}

describe("every v2 number is Figma's number input", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("a label's Size scrubs from its slot, steps with the arrows, and keeps its value on bad input", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, {
            set: { "node.color": "#1971C2", "node.label": "Hi", "node.labelStyle": { size: 1, color: "#FF0000" } },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const line = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>(
                '.ws-row[data-line="node.labelStyle.size"]',
            );
            assert.isNotNull(found);
            return found;
        });
        const slot = line.querySelector<HTMLElement>(".cm-scrub-slot[data-scrub]");
        assert.isNotNull(slot, "Size has a scrub slot");
        if (slot === null) {
            return;
        }
        assert.equal(getComputedStyle(slot).cursor, "ew-resize");
        assert.isNull(line.querySelector(".mantine-NumberInput-controls, [data-stepper]"), "no stepper buttons");
        const before = await picture(element);

        await dragAcross(slot, 20);
        await waitFor(() => {
            assert.closeTo(sizeOf(session, nodes), 11, 1e-6, "20 px right raises it by 10");
        });
        await session.styles.settled();
        assert.isAbove(redPixels(await picture(element)), redPixels(before), "the label is drawn larger");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.closeTo(sizeOf(session, nodes), 1, 1e-6, "the drag is one undo step");
        });

        const input = line.querySelector<HTMLInputElement>("input");
        assert.isNotNull(input);
        if (input === null) {
            return;
        }
        await userEvent.click(input);
        await userEvent.keyboard("{ArrowUp}");
        const step = await waitFor(() => {
            const now = sizeOf(session, nodes);
            assert.isAbove(now, 1);
            return now - 1;
        });
        await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
        await waitFor(() => {
            assert.closeTo(sizeOf(session, nodes), 1 + 11 * step, 1e-6, "Shift steps ten times as far");
        });
        const kept = sizeOf(session, nodes);
        await userEvent.keyboard("{Control>}a{/Control}abc{Enter}");
        await session.styles.settled();
        assert.closeTo(sizeOf(session, nodes), kept, 1e-6, "bad input keeps the old value");
    });
});
