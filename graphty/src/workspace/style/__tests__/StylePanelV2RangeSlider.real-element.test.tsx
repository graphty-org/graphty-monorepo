/**
 * A number with a fixed least and greatest value is a slider with its number beside it (owner's input rules,
 * 2026-11-23: "slider for a range"), not only a percent, on the REAL graphty-element and real input: the edge
 * line's Taper (0 to 4) is a slider in its Shape group, its keys step the value and write it, and its number field
 * still takes a typed value.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openGroup, openStyle, sectionOf, written } from "./v2Harness";

describe("Style panel v2 draws a fixed range as a slider", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("the edge line's Taper (0 to 4) is a slider whose keys write the taper", async () => {
        const { session, edges } = await openGraph();
        await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(await screen.findByTestId("style-tab"), "edge-line");
        await userEvent.click(within(line).getByRole("button", { name: "Edge line settings" }));
        const shape = await openGroup(
            await waitFor(() => {
                const found = document.querySelector<HTMLElement>("[data-thing-popover]");
                assert.isNotNull(found);
                return found;
            }),
            "Shape",
        );
        const taper = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('.ws-row[data-line="edge.taper"]');
            assert.isNotNull(found);
            return found;
        });
        const thumb = within(taper).getByRole("slider");
        assert.strictEqual(thumb.getAttribute("aria-valuemax"), "4", "the slider ends at Taper's greatest value");
        await userEvent.click(thumb);
        await userEvent.keyboard("{End}");
        await waitFor(() => {
            assert.strictEqual(written(session, edges, "edge.taper"), 4, "End writes the greatest taper");
        });
        await userEvent.keyboard("{ArrowLeft}");
        await waitFor(() => {
            assert.closeTo(Number(written(session, edges, "edge.taper")), 3.9, 1e-9, "a key steps one tenth");
        });
    });
});
