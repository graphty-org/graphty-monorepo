/**
 * @file The first layout plugin of the custom layouts guide (docs/guide/extending/custom-layouts.md):
 * nodes in rows by a tier attribute. The guide shows the "example" and "use" regions verbatim, and
 * test/browser/simple/define-layout.test.ts runs this file, so the page cannot drift from tested
 * code.
 */

// #region example
import { defineLayout } from "@graphty/graphty-element/extend";

defineLayout({
    id: "acme-tiers",
    dimensions: 2,
    options: { tier: { type: "attribute", default: "tier" }, spacing: 2 },
    place(graph, { options }) {
        const positions = new Map();
        const used = new Map();
        for (const node of graph.nodes()) {
            const tier = node.number(options.tier);
            if (tier === undefined) continue; // no tier: left unplaced
            const column = used.get(tier) ?? 0;
            used.set(tier, column + 1);
            positions.set(node.id, [column * options.spacing, tier * options.spacing]);
        }
        return positions;
    },
});
// #endregion example

import type { LayoutElement } from "./layout-element";

/**
 * The guide's "use it" line.
 * @param element - The element on the page.
 */
export async function useTiers(element: LayoutElement): Promise<void> {
    // #region use
    await element.setLayout("acme-tiers", { spacing: 3 });
    // #endregion use
}
