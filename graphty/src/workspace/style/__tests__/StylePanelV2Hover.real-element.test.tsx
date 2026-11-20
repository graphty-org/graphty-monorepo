/**
 * Style panel v2 highlights what a row edits while the pointer is over it, on the REAL graphty-element and
 * a real hover: the element's transient peek holds exactly the elements the row's layer matches, leaving
 * the row clears it, and the reader's "Highlight on hover" setting turned off peeks nothing.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, sectionOf } from "./v2Harness";

describe("Style panel v2's hover highlight", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("hovering a row peeks what its layer matches; leaving clears it; the setting off peeks nothing", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, { selector: { match: "ids", nodes: ["a", "b"] } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const fill = sectionOf(tab, "node-fill");
        const row = await waitFor(() => {
            const found = fill.querySelector<HTMLElement>('[data-thing="fill"]');
            assert.isNotNull(found);
            return found;
        });
        const { matched } = session.styles.counts(nodes);
        assert.equal(matched, 2);

        await userEvent.hover(row);
        await waitFor(() => {
            assert.deepEqual(session.selection.peeked, { nodes: matched, edges: 0 }, "the layer's nodes are peeked");
        });
        await userEvent.hover(within(tab).getByRole("searchbox", { name: /Find a setting/ }));
        await waitFor(() => {
            assert.isNull(session.selection.peeked, "leaving the row clears it");
        });

        await userEvent.click(screen.getByRole("button", { name: "Settings" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(within(dialog).getByRole("switch", { name: /^Highlight on hover/ }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Settings" }));
        });
        await userEvent.hover(row);
        await session.styles.settled();
        assert.isNull(session.selection.peeked, "with the setting off, nothing is peeked");

        // The setting is kept in this browser: turn it back on for the tests after this one.
        await userEvent.click(screen.getByRole("button", { name: "Settings" }));
        const again = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(within(again).getByRole("switch", { name: /^Highlight on hover/ }));
        await waitFor(() => {
            assert.isTrue(
                within(again)
                    .getByRole("switch", { name: /^Highlight on hover/ })
                    .matches(":checked"),
            );
        });
        await userEvent.keyboard("{Escape}");
    });
});
