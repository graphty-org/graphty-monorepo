/**
 * Style panel v2's label font style on the REAL graphty-element (owner, 2026-11-23): Bold, Italic, Underline and
 * Strikethrough are a text editor's toggle buttons on one line of the label's pop-over; each press writes its label
 * style field, Bold writes the weight, and the numeric weight is the Letters group's.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, picture, pixelsApart, written } from "./v2Harness";

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
        await userEvent.click(within(toggles).getByRole("button", { name: "Strikethrough" }));
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
    });
});
