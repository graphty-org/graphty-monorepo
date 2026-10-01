/**
 * @file The custom layouts guide's second example: nodes in rows by a text category, a node with
 * no category left unplaced. The guide shows the "example" and "use" regions verbatim, and
 * test/browser/simple/define-layout.test.ts runs this file.
 */

// #region example
import { defineLayout } from "@graphty/graphty-element/extend";

defineLayout({
    id: "acme-category-rows",
    dimensions: 2,
    options: { category: { type: "attribute", default: "category" }, spacing: 2 },
    place(graph, { options }) {
        const positions = new Map();
        let row = 0;
        for (const nodes of graph.groupBy(options.category).values()) {
            nodes.forEach((node, column) => positions.set(node.id, [column * options.spacing, row * options.spacing]));
            row++;
        }
        return positions;
    },
});
// #endregion example

import type { LayoutElement } from "./layout-element";

/**
 * The guide's "use it" line, with the reader's own column name in place of the default.
 * @param element - The element on the page.
 */
export async function useCategoryRows(element: LayoutElement): Promise<void> {
    // #region use
    await element.setLayout("acme-category-rows", { category: "department" });
    // #endregion use
}
