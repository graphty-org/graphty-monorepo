/**
 * Style panel v2 shows under a row every line of its thing the layer sets (design 2.5, "inspector panel adds
 * to section"), on the REAL graphty-element and real input: a value set in a row's pop-over adds its named
 * line under the row while the pop-over stays where it is, the line's minus there takes it off both, and an
 * unset line is never in the sidebar.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openProject, openStyle, sectionOf, written } from "./v2Harness";

describe("Style panel v2's set lines under a row", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Blur set in the Drop shadow pop-over shows under the row, named; its minus there takes it off both", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const effects = sectionOf(tab, "node-effects");
        await userEvent.click(within(effects).getByRole("button", { name: /^Add to node effects/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Drop shadow" }));
        const row = await waitFor(() => {
            const found = effects.querySelector<HTMLElement>('[data-thing="shadow"]');
            assert.isNotNull(found);
            return found;
        });
        const sidebarLine = (channel: string): HTMLElement | null =>
            row.querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNull(sidebarLine("node.shadowBlur"), "an unset line is not in the sidebar");
        for (const line of row.querySelectorAll(".ws-row[data-line]")) {
            const name = line.querySelector(".cm-legend-text")?.textContent ?? "";
            // A checkbox names itself, and a swatch describes itself (owner, 2026-11-24).
            const checkbox = line.querySelector('input[type="checkbox"], .cm-paint');
            assert.isTrue(name !== "" || checkbox !== null, `${line.getAttribute("data-line") ?? ""} is named`);
        }

        await userEvent.click(within(row).getByRole("button", { name: /^Node drop shadow settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        const box = pop.getBoundingClientRect();
        const blur = await waitFor(() => {
            const found = pop.querySelector<HTMLElement>('.ws-row[data-line="node.shadowBlur"] input');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(blur);
        await userEvent.keyboard("{Control>}a{/Control}4{Enter}");
        await waitFor(() => {
            assert.equal(written(session, id, "node.shadowBlur"), 4);
            const line = sidebarLine("node.shadowBlur");
            assert.isNotNull(line, "Blur shows under the row");
            assert.equal(line.querySelector(".cm-legend-text")?.textContent, "Blur");
        });
        const now = pop.getBoundingClientRect();
        assert.deepEqual([now.left, now.top], [box.left, box.top], "the pop-over keeps its place");

        await userEvent.keyboard("{Escape}");
        const line = sidebarLine("node.shadowBlur");
        assert.isNotNull(line);
        await userEvent.click(within(line).getByRole("button", { name: "Remove blur" }));
        await waitFor(() => {
            assert.isUndefined(written(session, id, "node.shadowBlur"), "the minus takes it off");
            assert.isNull(sidebarLine("node.shadowBlur"), "and out of the sidebar");
        });
        await userEvent.click(within(row).getByRole("button", { name: /^Node drop shadow settings/ }));
        await waitFor(() => {
            const again = document.querySelector('[data-thing-popover] .ws-row[data-line="node.shadowBlur"]');
            assert.isNotNull(again, "the pop-over still offers Blur");
            assert.isFalse(again.hasAttribute("data-set"), "unset there too");
        });
    });
});
