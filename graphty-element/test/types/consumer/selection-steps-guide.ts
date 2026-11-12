/**
 * @file The selection steps guide's examples (docs/guide/selection-steps.md), compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks
 * it against `dist/`.
 */

import type { StepsReading, UnionLeaf } from "@graphty/graphty-element/session";

/** The guide's quick start, as a function over the page's element. */
export async function quickStart(): Promise<void> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    await element.session.styles.add({
        name: "Busy staff",
        target: "node",
        selector: {
            match: "rule",
            where: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [
                    {
                        start: "all",
                        steps: [
                            { op: "keep", rule: { kind: "degree", min: 6 } },
                            { op: "keep", rule: { kind: "categories", attribute: "data.role", values: ["staff"] } },
                            {
                                op: "except",
                                rule: {
                                    kind: "measure",
                                    algorithm: "betweenness",
                                    field: "value",
                                    test: { kind: "threshold", top: 3 },
                                },
                            },
                        ],
                    },
                ],
            },
        },
        set: { "node.color": "#d33" },
    });
}

/**
 * The guide's reading of counts and states.
 * @param layerRule - The rule a layer selects by.
 * @returns The total.
 */
export function readCounts(layerRule: UnionLeaf): StepsReading["total"] | undefined {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return undefined;
    }

    const watch = element.session.scope.watchSteps(layerRule, (reading) => {
        for (const branch of reading.branches) {
            console.log(branch.id, branch.color, branch.state, branch.count);
            for (const step of branch.steps) {
                console.log(step.id, step.state, step.reason?.code, step.count, step.orderMatters);
            }
        }
    });
    const { total } = watch.current;
    watch.end();
    return total;
}
