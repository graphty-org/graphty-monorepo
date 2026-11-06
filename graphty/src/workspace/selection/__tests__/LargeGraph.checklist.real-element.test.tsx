/**
 * The category checklist of the selection editor on a generated graph of 50,000 nodes, on the REAL
 * graphty-element, driven by real clicks and keys (design/ui/selection-groups/spec.md, section 4.3):
 * it draws at most 8 rows, "Check N" ticks a search's matches and the row summarizes them.
 */

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { oneStep, openGenerated, openLayer, selectStep } from "./large-graph";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

describe("the selection editor on 50,000 nodes", () => {
    it("the category checklist draws at most 8 rows; Check N ticks a search's matches and the row summarizes them", async () => {
        const session = await openGenerated();
        const layer = await openLayer(
            session,
            "Communities",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        await selectStep("com");
        const values = await screen.findByRole("group", { name: "community values" });
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 9, "8 values and (no value) at most");
        const search = screen.getByRole("textbox", { name: "Search community" });
        assert.match(search.getAttribute("placeholder") ?? "", /^Search [\d,]+$/);
        await userEvent.type(search, "1");
        const check = await screen.findByRole("button", { name: /^Check [\d,]+$/ });
        const matches = Number((check.textContent ?? "").replace(/\D/g, ""));
        assert.isAbove(matches, 8);
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 8);
        await userEvent.click(check);
        await waitFor(() => {
            const steps = session.styles.get(layer.id)?.selector;
            const rule = steps?.match === "rule" && steps.where.kind === "union" ? steps.where : undefined;
            const step = rule?.branches[0]?.steps[0]?.rule as { values?: unknown[] } | undefined;
            assert.lengthOf(step?.values ?? [], matches);
        });
        await userEvent.clear(search);
        await waitFor(() => {
            assert.isNotNull(screen.queryByText(`${(matches - 6).toLocaleString("en-US")} more checked`));
        });
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 9);
        // A list of more than nine values is said as its count (spec 3.1), else two names and "N more".
        assert.match(
            document.querySelector('.sel-ws-outline [data-row="com"]')?.getAttribute("aria-label") ?? "",
            matches > 9
                ? new RegExp(`${matches.toLocaleString("en-US")} values`)
                : new RegExp(`and ${(matches - 2).toLocaleString("en-US")} more`),
        );
    });

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
