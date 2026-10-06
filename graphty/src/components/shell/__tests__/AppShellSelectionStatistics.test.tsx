/**
 * The Multiple inspector against the REAL graphty-element: three nodes of the cat sample are
 * selected through the element's own selection, and the inspector draws the element's
 * `selection.statistics()` -- the selection's means beside the graph's, and how a text attribute
 * divides.
 */

// Registers the real element, which the shell's other boards never do.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";

import { CAT_SOCIAL_NETWORK } from "../../../data/sampleGraphs";
import { fireEvent, render, waitFor } from "../../../test/test-utils";
import { AppShell } from "../AppShell";

/** How long a real load, its degree pass and its repaint are given. */
const SETTLE_MS = 15_000;

/** The three cats selected, and their ages (8, 5 and 4 years). */
const PICKED = ["Mr_Whiskers", "Princess_Fluffington", "Garbage_Bandit"];

/**
 * The value drawn beside one attribute name in the inspector.
 * @param container - the render result's container.
 * @param name - the attribute's name.
 * @returns the row's value text, or undefined when no row has that name.
 */
function rowValue(container: HTMLElement, name: string): string | undefined {
    const rows = container.querySelectorAll('[data-shell-region="inspector"] [data-testid="data-row"]');

    for (const row of rows) {
        if (row.querySelector('[data-testid="data-row-name"]')?.textContent === name) {
            return row.querySelector('[data-testid="data-row-value"]')?.textContent ?? undefined;
        }
    }

    return undefined;
}

describe("AppShell multi-selection statistics", () => {
    it("draws the element's selection-vs-graph means for three selected nodes", async () => {
        const { container } = render(<AppShell initialShellWidth={1440} measureViewport={false} persist={false} />);
        const element = container.querySelector("graphty-element");

        assert.isNotNull(element);
        await waitFor(() => {
            assert.ok(element.session);
        });

        const { session } = element;

        fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
        await waitFor(
            () => {
                assert.equal(session.data.statistics().nodeCount, CAT_SOCIAL_NETWORK.nodes.length);
            },
            { timeout: SETTLE_MS },
        );

        await session.selection.apply({ ids: PICKED });

        const ages = CAT_SOCIAL_NETWORK.nodes.map((node) => node.ageYears);
        const graphMean = ages.reduce((sum, age) => sum + age, 0) / ages.length;
        const format = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 });

        await waitFor(
            () => {
                assert.include(container.textContent, "3 nodes");
                // (8 + 5 + 4) / 3
                assert.equal(rowValue(container, "ageYears"), `5.667 / ${format.format(graphMean)}`);
                assert.equal(rowValue(container, "personality"), "bossy 1, diva 1, sneaky 1");
            },
            { timeout: SETTLE_MS },
        );
        assert.isNull(
            container.querySelector('[data-testid="coming-tag"][title="Selection statistics is not built yet"]'),
            "the statistics block is no longer tagged Coming",
        );
    });
});
