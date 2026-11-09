/**
 * The value pickers of the selection editor on a generated graph of 50,000 nodes, on the REAL
 * graphty-element, driven by real clicks and keys (design/ui/selection-groups/spec.md, section 4.3): no list
 * grows with the graph. The Links picker lists edge columns and the value picker lists columns and
 * algorithms, never values. The reference pickers are in LargeGraph.pickers.real-element.test.tsx: each
 * file fits a pull request's 8-minute test bin on its own.
 */

import type { UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, within } from "../../../test/test-utils";
import { oneStep, openGenerated, openLayer, selectStep } from "./large-graph";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

describe("the selection editor on 50,000 nodes", () => {
    it("the Links picker lists the edge columns, never values (fix 1 on 50,000 nodes)", async () => {
        const session = await openGenerated();
        await openLayer(session, "Linked", oneStep("deg", { kind: "range", attribute: "graphty.degree", min: 3 }));
        await selectStep("deg");
        const pane = document.querySelector<HTMLElement>('[data-step-pane="deg"]');
        if (pane === null) {
            throw new Error("the pane is drawn");
        }
        await userEvent.click(within(pane).getByRole("button", { name: /^Advanced/ }));
        const links = await within(pane).findByRole("radiogroup", { name: "Edges" });
        await userEvent.click(within(links).getByText("Edges where ..."));
        await userEvent.click(await within(pane).findByRole("button", { name: "Edge value: none" }));
        await screen.findByRole("combobox", { name: "Find edge attributes" });
        // The generated graph's edges carry no column: the list is the edge columns, here none,
        // and never a value of the 99,000 edges.
        assert.isBelow(screen.queryAllByRole("option").length, 50);
        await userEvent.keyboard("{Escape}");
        assert.isUndefined(
            (session.styles.list().find((layer) => layer.name === "Linked")?.selector as { where?: UnionLeaf }).where
                ?.branches[0]?.steps[0]?.links,
            "nothing picked, no links written",
        );
    });

    it("the value picker lists columns and algorithms, never values", async () => {
        const session = await openGenerated();
        await openLayer(session, "Values", oneStep("deg", { kind: "range", attribute: "graphty.degree", min: 3 }));
        await selectStep("deg");
        await userEvent.click(await screen.findByRole("button", { name: /^Value: / }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        const options = await screen.findAllByRole("option");
        assert.isBelow(options.length, 200);
        await userEvent.keyboard("{Escape}");
    });
});
