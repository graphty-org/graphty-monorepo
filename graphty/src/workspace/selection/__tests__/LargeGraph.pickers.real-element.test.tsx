/**
 * The pickers of the selection editor on a generated graph of 50,000 nodes, on the REAL
 * graphty-element, driven by real clicks and keys (design/ui/selection-groups/spec.md, section 4.3):
 * no list grows with the graph. The reference picker lists no node before typing and at most 8
 * after; "While ... has nodes" takes one reference shown as one token; the value picker lists columns
 * and algorithms, never values.
 */

import type { UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { listed, oneStep, openGenerated, openLayer, selectStep } from "./large-graph";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

describe("the selection editor on 50,000 nodes", () => {
    it("the reference picker lists no node before typing, and at most 8 after", async () => {
        const session = await openGenerated();
        await openLayer(session, "Near", oneStep("near", { kind: "hops", max: 2 }));
        await selectStep("near");
        await userEvent.click(await screen.findByRole("button", { name: "Reference" }));
        await waitFor(() => {
            assert.include(listed().headings, "Nodes 50,000");
        });
        assert.isTrue(
            listed().options.every(
                (each) =>
                    ["Pick on canvas", "Hovered or selected", "So far"].includes(each) || each.startsWith("Selected"),
            ),
            listed().options.join(", "),
        );
        await userEvent.keyboard("12");
        await waitFor(() => {
            const nodes = listed().headings.find((each) => each.startsWith("Nodes"));
            assert.match(nodes ?? "", /^Nodes 8 of [\d,]+$/);
        });
        assert.isAtMost(listed().options.length, 4 + 8);
        // A graph with no label column is searched in every column (spec 4.3), so the node whose id
        // is exactly what was typed comes first.
        const live = ["Pick on canvas", "Hovered or selected", "So far"];
        const nodes = listed().options.filter((each) => !live.includes(each) && !each.startsWith("Selected"));
        assert.strictEqual(nodes[0], "12", nodes.join(", "));
        await userEvent.keyboard("{Escape}");
    });

    it("While has nodes takes one reference, shown as one token", async () => {
        const session = await openGenerated();
        await openLayer(session, "While", oneStep("while", { kind: "nonempty" }));
        await selectStep("while");
        await userEvent.click(await screen.findByRole("button", { name: "Reference" }));
        await userEvent.click(await screen.findByRole("option", { name: "Selected (0)" }));
        await waitFor(() => {
            assert.match(
                document.querySelector('[data-row="while"]')?.getAttribute("aria-label") ?? "",
                /^While Selected \(0\) has nodes, /,
            );
        });
        assert.isNotNull(screen.queryByRole("button", { name: "Reference: Selected (0)" }));
    });

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
