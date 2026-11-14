/**
 * The category checklist of the selection editor on a generated graph of 50,000 nodes (about 5,000
 * communities), on the REAL graphty-element, driven by real clicks and keys (design/ui/selection-groups/spec.md,
 * section 4.3): the order of its rows changes only on a search, never under the pointer. Its other test is in
 * LargeGraph.checklist.real-element.test.tsx: each file fits a pull request's 8-minute test bin on its own.
 */

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { oneStep, openGenerated, openLayer, selectStep } from "./large-graph";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

describe("the selection editor on 50,000 nodes", () => {
    it("a 5,000-value checklist never re-sorts under the pointer; the order changes only on a search (check 43)", async () => {
        const session = await openGenerated();
        await openLayer(
            session,
            "Still",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        await selectStep("com");
        const values = await screen.findByRole("group", { name: "community values" });
        const boxes = (): HTMLElement[] => within(values).getAllByRole("checkbox");
        const order = (): string[] =>
            boxes().map((box) => box.getAttribute("aria-label") ?? box.closest("label")?.textContent ?? "");
        const tops = (): number[] => boxes().map((box) => Math.round(box.getBoundingClientRect().top));
        const before = order();
        const beforeTops = tops();
        await userEvent.hover(boxes()[2]);
        for (const at of [2, 3, 4]) {
            await userEvent.click(boxes()[at]);
        }
        await waitFor(() => {
            assert.lengthOf(
                boxes().filter((box) => (box as HTMLInputElement).checked),
                3,
            );
        });
        assert.deepEqual(order(), before, "every row stayed where it was");
        assert.deepEqual(tops(), beforeTops);
        const search = screen.getByRole("textbox", { name: "Search community" });
        await userEvent.type(search, "1");
        await userEvent.clear(search);
        await waitFor(() => {
            assert.notDeepEqual(order(), before, "a search sets the order again: the checked first");
        });
        assert.isTrue(
            boxes()
                .slice(0, 3)
                .every((box) => (box as HTMLInputElement).checked),
        );
    });
});
