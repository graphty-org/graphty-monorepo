/**
 * @file The custom layouts guide's third example: nodes at coordinates their data already carries,
 * with `z` optional so a 2D dataset is not refused. The guide shows the "example" and "use"
 * regions verbatim, and test/browser/simple/define-layout.test.ts runs this file.
 */

// #region example
import { defineLayout } from "@graphty/graphty-element/extend";

defineLayout({
    id: "acme-precomputed",
    options: {
        x: { type: "attribute", default: "x" },
        y: { type: "attribute", default: "y" },
        z: { type: "attribute", default: null },
    },
    place(graph, { options }) {
        const positions = new Map();
        for (const node of graph.nodes()) {
            const x = node.number(options.x);
            const y = node.number(options.y);
            if (x !== undefined && y !== undefined) positions.set(node.id, [x, y, node.number(options.z) ?? 0]);
        }
        return positions;
    },
});
// #endregion example

import type { LayoutElement } from "./layout-element";

/**
 * The guide's "use it" line: the optional `z` bound to the data's own column.
 * @param element - The element on the page.
 */
export async function usePrecomputed(element: LayoutElement): Promise<void> {
    // #region use
    await element.setLayout("acme-precomputed", { z: "z" });
    // #endregion use
}
