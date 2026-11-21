/**
 * A long Style panel v2 section groups its rows by kind (implementation plan 6.7, ledger E268: "the list of label
 * styles is massive, is there a way to break it up?"), on the REAL graphty-element and real input: nine Text rows
 * added by real "+" clicks (a Label, six further labels, a Tooltip and an External label) sit under three always
 * open legends, Label, Tooltip and External label; nothing below the section's own header folds, and every row is
 * shown without a click.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, sectionOf } from "./v2Harness";

/**
 * Clicks the Text section's "+" and one of its items, then picks Node id from the source list that opens.
 * @param text - the Text section.
 * @param item - the "+" item.
 * @param list - the source list's name.
 */
async function plus(text: HTMLElement, item: string, list: string): Promise<void> {
    await userEvent.click(within(text).getByRole("button", { name: "Add to node text" }));
    await userEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: item }));
    const [options] = await screen.findAllByRole("group", { name: list });
    await userEvent.click(await within(options).findByRole("option", { name: /^Node id/ }));
}

/**
 * The Text section's rows: each thing row and each further label.
 * @param text - the Text section.
 * @returns the rows.
 */
function rowsOf(text: HTMLElement): HTMLElement[] {
    return [...text.querySelectorAll<HTMLElement>("[data-thing]")];
}

describe("a long Style section", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("groups nine Text rows under three open legends, with no fold below the section", async () => {
        await openGraph();
        const tab = await openStyle("Key people");
        const text = sectionOf(tab, "node-text");
        await plus(text, "Label", "Node label");
        for (let n = 2; n <= 7; n++) {
            await plus(text, "Label", `Node label ${String(n)}`);
            await waitFor(() => {
                assert.lengthOf(rowsOf(text), n, `${String(n)} label rows`);
            });
        }
        await plus(text, "Tooltip", "Node tooltip");
        await plus(text, "External label", "Node external label");
        await waitFor(() => {
            assert.lengthOf(rowsOf(text), 9, "nine Text rows");
        });

        // Three always-open legends, one per kind, in the section's order, each over its own rows.
        const legends = [...text.querySelectorAll<HTMLElement>("[data-plus-list-kind]")];
        assert.deepEqual(
            legends.map((legend) => legend.dataset.plusListKind),
            ["Label", "Tooltip", "External label"],
        );
        assert.deepEqual(
            legends.map((legend) => legend.querySelectorAll("[data-thing]").length),
            [7, 1, 1],
        );
        for (const legend of legends) {
            const shown = legend.querySelector<HTMLElement>('[data-testid="control-group-label"]');
            assert.equal(shown?.textContent, legend.dataset.plusListKind, "the legend names its kind");
            assert.isTrue(shown?.checkVisibility(), "and is shown");
        }

        // No caret below the section's own header: one fold, the section's.
        assert.lengthOf(text.querySelectorAll('[data-testid="control-section-toggle"]'), 1, "one section fold");
        assert.lengthOf(text.querySelectorAll('[data-testid="control-section-chevron-slot"]'), 1, "one caret");

        // Every row is shown, with nothing clicked open.
        for (const row of rowsOf(text)) {
            assert.isTrue(row.checkVisibility(), `${row.dataset.labelEntry ?? row.dataset.thing ?? ""} is shown`);
        }
    });
});
