/**
 * @file The rectangle and lasso guide's examples (docs/guide/region-select.md), compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks
 * it against `dist/`.
 */

/** Both of the guide's examples, as a function over the page's element. */
export async function regionSelect(): Promise<void> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    element.layoutBehavior = { selection: { region: "lasso" } };
    element.addEventListener("selection-changed", () => {
        console.log(element.session.selection.nodes);
    });

    const delta = await element.session.selection.apply({
        region: {
            polygon: [
                { x: 40, y: 40 },
                { x: 240, y: 40 },
                { x: 240, y: 180 },
                { x: 40, y: 180 },
            ],
        },
    });
    console.log(delta.nodes, delta.truncated);
}
