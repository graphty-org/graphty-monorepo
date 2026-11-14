/**
 * @file The neighborhoods-in-time and selection-totals guide's examples
 * (docs/guide/selection-statistics.md), compiled against the published declarations with no cast.
 * Nothing here runs; `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

/** The guide's time-window example, as a function over the page's element. */
export function neighborhoodInTime(): void {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    element.addEventListener("graphty-node-click", (e) => {
        void element.session.selection.apply({
            neighborsOf: [e.detail.nodeId],
            window: { path: "data.date", from: "2024-01-01", to: "2025-01-01" },
        });
    });
}

/**
 * The guide's totals example and its scope variants.
 * @param setId - A kept set's id.
 */
export async function selectionTotals(setId: string): Promise<void> {
    const element = document.querySelector("graphty-element");
    const output = document.querySelector("#cost");
    if (element === null || output === null) {
        return;
    }

    /**
     * The guide's handler.
     * @returns When the total is shown.
     */
    const showCost = async (): Promise<void> => {
        const { attributes } = await element.session.selection.statistics();
        const cost = attributes.find((a) => a.path === "data.cost");
        output.textContent =
            cost?.sum === undefined ? "" : `${String(cost.sum)} (${String(cost.min)} to ${String(cost.max)})`;
    };

    element.session.on("selection:changed", () => void showCost());

    const shown = await element.session.selection.statistics({ scope: "visible" });
    const kept = await element.session.selection.statistics({ scope: { set: setId } });
    console.log(shown.edgeAttributes, kept.nodes);
}
