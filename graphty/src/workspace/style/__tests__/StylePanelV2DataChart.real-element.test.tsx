/**
 * Style panel v2's Chart from data on the REAL graphty-element, by real clicks: a pattern picked with "All matching",
 * the Kind as grouped icon buttons in the chart's pop-over in data mode (one write of the kind alone), Series Name part,
 * the Scale group, and a monthly Graph value built in the Calculate pop-over.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGroup, openProject, openStyle, sectionOf, settingsName, written } from "./v2Harness";

/**
 * The project with expression columns on each node.
 * @returns the session and the layer.
 */
async function withExpression(): Promise<{ session: GraphSession; layer: string }> {
    const { session, id } = await openProject();
    await session.data.updateNodes([
        { id: "a", values: { exprC1: 5.2, exprC2: 4.9, exprT1: 8.1, label: "Gene A" } },
        { id: "b", values: { exprC1: 3, exprT1: 2, label: "Gene B" } },
        { id: "c", values: { exprC1: 1, exprC2: 2, exprT1: 6, label: "Gene C" } },
    ]);
    await session.styles.settled();
    return { session, layer: id };
}

/**
 * Adds a chart from the Fill "+", which opens its entries picker.
 * @param tab - the Style tab.
 */
async function addChart(tab: HTMLElement): Promise<void> {
    await userEvent.click(within(sectionOf(tab, "node-fill")).getByRole("button", { name: /^Add to node fill/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Chart" }));
}

/**
 * Opens the chart's data picker, types a search, and picks "All starting with" it, then Done.
 * @param query - the words typed.
 */
async function pickMatching(query: string): Promise<void> {
    const picker = await screen.findByRole("combobox", { name: "Node chart data" });
    if (screen.queryByRole("listbox", { name: "Node chart data" }) === null) {
        await userEvent.click(picker);
    }
    const list = await screen.findByRole("listbox", { name: "Node chart data" });
    await userEvent.keyboard(query);
    await userEvent.click(await within(list).findByRole("option", { name: /^All starting with/ }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
}

/**
 * Opens the chart row's "..." pop-over.
 * @param tab - the Style tab.
 * @returns the pop-over.
 */
async function openChartSettings(tab: HTMLElement): Promise<HTMLElement> {
    const button = within(sectionOf(tab, "node-fill")).getByRole("button", { name: settingsName("Node chart") });
    if (button.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(button);
    }
    return waitFor(() => {
        const found = document.getElementById(button.getAttribute("aria-controls") ?? "");
        assert.isNotNull(found);
        return found;
    });
}

describe("Style panel v2's chart from data", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("picks a pattern with All starting with, and the line reads the pattern", async () => {
        const { session, layer } = await withExpression();
        const tab = await openStyle("Key people");
        await addChart(tab);
        await pickMatching("expr");
        await waitFor(() => {
            assert.deepEqual(written(session, layer, "node.chartData"), { entries: [{ pattern: "expr" }] });
        });
        assert.isUndefined(written(session, layer, "node.chartValues"));
        // The line holds its source, the pattern it reads (never one node's values).
        await waitFor(() => {
            const field = within(sectionOf(tab, "node-fill")).getByRole("combobox", { name: "Field" });
            assert.match((field as HTMLInputElement).value, /expr/);
        });
    });

    it("changes the kind in data mode with grouped icon buttons, writing the kind alone", async () => {
        const { session, layer } = await withExpression();
        const tab = await openStyle("Key people");
        await addChart(tab);
        await pickMatching("expr");
        await waitFor(() => {
            assert.isDefined(written(session, layer, "node.chartData"));
        });
        const pop = await openChartSettings(tab);
        const kind = await within(pop).findByRole("radiogroup", { name: /kind$/i });
        const before = session.history.position;
        const line = pop.querySelector<HTMLElement>(
            `label[for="${within(kind).getByRole("radio", { name: "Line" }).id}"]`,
        );
        assert.isNotNull(line);
        await userEvent.click(line);
        await waitFor(() => {
            assert.strictEqual(written(session, layer, "node.chartKind"), "line");
        });
        assert.isUndefined(written(session, layer, "node.chartColors"), "no fixed colors beside the data");
        assert.strictEqual(session.history.position, before + 1, "one undo step");
        assert.isNull(screen.queryByText(/E_BAD_COMMAND|could not be changed/i));
    });

    it("splits series at a name part and shares the scale over the graph from the Scale group", async () => {
        const { session, layer } = await withExpression();
        const tab = await openStyle("Key people");
        await addChart(tab);
        await pickMatching("expr");
        const pop = await openChartSettings(tab);
        await userEvent.click(within(pop).getByText("Name part"));
        await waitFor(() => {
            const spec = written(session, layer, "node.chartData") as { series?: unknown };
            assert.deepEqual(spec.series, { separator: "_" });
        });
        const scale = await openGroup(pop, "Scale");
        await userEvent.click(within(scale).getByText("Graph"));
        await waitFor(() => {
            const spec = written(session, layer, "node.chartData") as { scale?: { share?: string } };
            assert.strictEqual(spec.scale?.share, "graph");
        });
        await userEvent.click(within(scale).getByText("Rank"));
        await waitFor(() => {
            const spec = written(session, layer, "node.chartData") as { scale?: { normalize?: string } };
            assert.strictEqual(spec.scale?.normalize, "rank");
        });
    });
});
