import axe from "axe-core";
import React from "react";
import { assert, describe, it } from "vitest";

import { render, screen } from "../../../../test/test-utils";
import { FilterStatusStrip } from "../FilterStatusStrip";
import { InsightsStrip } from "../InsightsStrip";

/*
   The canvas strips' action text ("Try it", the render-ceiling override) is text, so it must
   meet WCAG 1.4.3 (4.5:1) on the panel ground. The test providers render the dark scheme,
   where the accent fill token measured 2.64:1 (#2948).
*/

/**
 * Runs axe's color-contrast rule over one element.
 * @param element - the element to scan.
 * @returns the failing nodes, one line each.
 */
async function contrastFailures(element: Element): Promise<string[]> {
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    const results = await axe.run(element, { runOnly: ["color-contrast"], resultTypes: ["violations"] });

    return results.violations.flatMap((violation) =>
        violation.nodes.map((node) => `${node.html.slice(0, 120)}\n  ${node.failureSummary ?? ""}`),
    );
}

describe("canvas strip action text contrast", () => {
    it("the insights card's Try it meets 4.5:1", async () => {
        render(
            <InsightsStrip
                cards={[
                    {
                        id: "groups",
                        title: "Find groups",
                        body: "Cluster nodes that interact more with each other.",
                        actionLabel: "Try it",
                        onActivate: () => undefined,
                    },
                ]}
                onDismiss={() => undefined}
            />,
        );

        const failures = await contrastFailures(screen.getByText("Try it"));

        assert.deepEqual(failures, [], failures.join("\n"));
    });

    it("the render-ceiling note's override meets 4.5:1", async () => {
        render(
            <FilterStatusStrip
                chips={[]}
                note={{ label: "Edge cap: highest weight first.", actionLabel: "Show all", onAction: () => undefined }}
            />,
        );

        const failures = await contrastFailures(screen.getByRole("button", { name: "Show all" }));

        assert.deepEqual(failures, [], failures.join("\n"));
    });
});
