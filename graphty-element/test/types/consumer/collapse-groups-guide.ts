/**
 * @file The collapsing groups guide's example (docs/guide/collapse-groups.md), compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks
 * it against `dist/`.
 */

/** The guide's example, as a function over the page's element. */
export async function collapseGroups(): Promise<void> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    const { session } = element;
    const run = await session.runs.start("louvain");
    const node = await session.groups.collapse({ run, group: 0 });
    await session.styles.add({
        name: "Collapsed groups",
        target: "node",
        selector: { match: "has", path: "data._group.size" },
        encode: {
            "node.size": {
                by: "data._group.size",
                stops: [
                    { at: 1, value: 1 },
                    { at: 50, value: 4 },
                ],
            },
        },
    });
    await session.groups.expand({ run, group: 0 });
    await session.groups.collapse({ groupBy: "data.team", group: "red" });
    console.log(node, session.groups.list());
}
