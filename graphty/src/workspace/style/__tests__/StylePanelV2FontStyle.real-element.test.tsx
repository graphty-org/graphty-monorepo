/**
 * Style panel v2's label font style on the REAL graphty-element (owner, 2026-11-23): Bold, Italic, Underline and
 * Strikethrough are a text editor's toggle buttons on one line of the label's pop-over; each press writes its label
 * style field, Bold writes the weight, and the numeric weight is the Letters group's. The toggles end before the
 * line's link button, so a press on Strikethrough never opens the link dialog.
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

    it("Bold, Italic, Underline and Strikethrough toggle their fields, and Underline changes the picture", async () => {
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
        const names = within(toggles)
            .getAllByRole("button")
            .map((button) => button.getAttribute("aria-label"));
        assert.deepEqual(names, ["Bold", "Italic", "Underline", "Strikethrough"]);
        // Unset, each shows what is drawn: none pressed.
        for (const button of within(toggles).getAllByRole("button")) {
            assert.strictEqual(button.getAttribute("aria-pressed"), "false");
        }

        const before = await picture(element);
        await userEvent.click(within(toggles).getByRole("button", { name: "Underline" }));
        await waitFor(() => {
            assert.isTrue(style().underline, "Underline writes underline");
        });
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the underline is drawn");

        await userEvent.click(within(toggles).getByRole("button", { name: "Bold" }));
        await waitFor(() => {
            assert.strictEqual(style().weight, "bold", "Bold writes the weight");
        });
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
        await userEvent.click(within(toggles).getByRole("button", { name: "Bold" }));
        await waitFor(() => {
            assert.strictEqual(style().weight, "normal", "Bold again writes the regular weight");
            assert.strictEqual(
                within(toggles).getByRole("button", { name: "Bold" }).getAttribute("aria-pressed"),
                "false",
            );
        });

        // Any other weight is the Letters group's Weight (owner, 2026-11-24: every style graphty-element has is
        // editable in the panel): a typed 900 (Black) is written and drawn heavier than regular. (A lighter weight
        // would draw the same as regular in a font with no light face.)
        const regular = await picture(element);
        const letters = await openGroup(pop, "Letters");
        const weight = await waitFor(() => {
            const found = letters.querySelector<HTMLInputElement>('[data-line="node.labelStyle.weight"] input');
            assert.isNotNull(found, "the Weight line");
            return found;
        });
        await userEvent.tripleClick(weight);
        await userEvent.keyboard("900{Enter}");
        await waitFor(() => {
            assert.strictEqual(String(style().weight), "900", "Weight writes the number typed");
        });
        await waitFor(async () => {
            assert.isAbove(pixelsApart(regular, await picture(element)), 0, "the heavier letters are drawn");
        });
    });
});
