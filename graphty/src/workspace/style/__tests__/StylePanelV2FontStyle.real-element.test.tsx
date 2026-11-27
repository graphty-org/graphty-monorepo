/**
 * Style panel v2's label font style on the REAL graphty-element: Italic, Underline and Strikethrough are a text
 * editor's toggle buttons on one line of the label's pop-over (owner, 2026-11-23), each press writing its label style
 * field; the weight is one drop-down at the start of that line, Regular, Bold or any weight graphty-element draws, with
 * no Bold toggle and no second Weight line in the Letters group (owner, 2026-11-27: one path to any control, #10380). The
 * toggles end before the line's link button, so a press on Strikethrough never opens the link dialog.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { waitFor, within } from "../../../test/test-utils";
import { openGraph, openGroup, openStyle, picture, pixelsApart, written } from "./v2Harness";

describe("Style panel v2's label font style", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Italic, Underline and Strikethrough toggle their fields, and one Weight line writes every weight", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { ...session.styles.get(nodes)?.set, "node.label": "Hello" } });
        await session.styles.settled();
        await session.layout.setDimension("2d");
        const style = (): Record<string, unknown> => {
            const value = written(session, nodes, "node.labelStyle");
            return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
        };
        const tab = await openStyle("Key people");
        const row = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('[data-thing="label"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(row).getByRole("button", { name: /^Node label settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        const toggles = await waitFor(() => {
            const found = pop.querySelector<HTMLElement>('[data-line="node.labelStyle.weight"] [data-font-style]');
            assert.isNotNull(found, "the Style line's toggles");
            return found;
        });
        // The toggles are the line's pressed-state buttons; the weight drop-down's opener is not one.
        const pressable = within(toggles)
            .getAllByRole("button")
            .filter((button) => button.getAttribute("aria-pressed") !== null);
        assert.deepEqual(
            pressable.map((button) => button.getAttribute("aria-label")),
            ["Italic", "Underline", "Strikethrough"],
        );
        assert.isNull(within(pop).queryByRole("button", { name: "Bold" }), "no Bold toggle beside the weight");
        // Unset, each shows what is drawn: none pressed.
        for (const button of pressable) {
            assert.strictEqual(button.getAttribute("aria-pressed"), "false");
        }

        const before = await picture(element);
        await userEvent.click(within(toggles).getByRole("button", { name: "Underline" }));
        await waitFor(() => {
            assert.isTrue(style().underline, "Underline writes underline");
        });
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the underline is drawn");

        await userEvent.click(within(toggles).getByRole("button", { name: "Italic" }));
        // The toggles end before the line's link slot, with room for a finger's target (32 px over a 24 px
        // button, 4 px past each side), so the link, shown on hover, never sits on Strikethrough.
        const line = toggles.closest<HTMLElement>(".ws-row");
        assert.isNotNull(line);
        await userEvent.hover(line);
        const strike = within(toggles).getByRole("button", { name: "Strikethrough" });
        const link = within(line).getByRole("button", { name: "Node label weight by attribute" });
        assert.isAtMost(strike.getBoundingClientRect().right + 4, link.getBoundingClientRect().left - 4);
        await userEvent.click(strike);
        await waitFor(() => {
            assert.isTrue(style().italic);
            assert.isTrue(style().strikethrough);
        });

        // The one weight drop-down, at the start of the Style line: Bold picked by name, then a typed 900 (Black), drawn heavier than
        // regular. (A lighter weight would draw the same as regular in a font with no light face.)
        const regular = await picture(element);
        const weight = await waitFor(() => {
            const found = toggles.querySelector<HTMLInputElement>("input");
            assert.isNotNull(found, "the weight drop-down");
            return found;
        });
        await userEvent.tripleClick(weight);
        await userEvent.keyboard("Bold{Enter}");
        await waitFor(() => {
            assert.strictEqual(style().weight, "bold", "Weight writes Bold");
        });
        await userEvent.tripleClick(weight);
        await userEvent.keyboard("900{Enter}");
        await waitFor(() => {
            assert.strictEqual(style().weight, 900, "Weight writes the number typed");
        });
        await waitFor(async () => {
            assert.isAbove(pixelsApart(regular, await picture(element)), 0, "the heavier letters are drawn");
        });

        // The Letters group has no second Weight line.
        const letters = await openGroup(pop, "Letters");
        assert.isNull(letters.querySelector('[data-line="node.labelStyle.weight"]'), "no Weight line in Letters");
    });
});
