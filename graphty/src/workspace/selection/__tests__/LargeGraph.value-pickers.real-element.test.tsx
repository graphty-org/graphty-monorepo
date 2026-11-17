/**
 * The value pickers of the selection editor on a generated graph of 50,000 nodes, on the REAL
 * graphty-element, driven by real clicks and keys (design/ui/selection-groups/spec.md, section 4.3): no list
 * grows with the graph. The Links picker lists edge columns and the value picker lists columns and
 * algorithms, never values. The reference pickers are in LargeGraph.pickers.real-element.test.tsx: each
 * file fits a pull request's 8-minute test bin on its own.
 */

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen } from "../../../test/test-utils";
import { oneStep, openGenerated, openLayer, selectStep } from "./large-graph";

// Every experiment stays off here.
withFeatures([]);

describe("the selection editor on 50,000 nodes", () => {
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
