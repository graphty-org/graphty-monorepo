/**
 * Style panel v2's Pie, Chart and Record from data on the REAL graphty-element, by real clicks: the row's entries
 * picker starts from "Fixed", a multi-pick written once on Done is one undo step, Escape writes nothing, the entry line
 * reads the sample node's parts, "Fixed" brings the fixed slices back, a layer holding only a data spec still has its
 * row, and the record and chart rows pick their entries the same way.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openProject, openStyle, sectionOf, written } from "./v2Harness";

/**
 * The project with an animals list on each node.
 * @returns the session and the layer.
 */
async function withAnimals(): Promise<{ session: GraphSession; layer: string }> {
    const { session, id } = await openProject();
    await session.data.updateNodes([
        { id: "a", values: { animals: ["dog", "dog", "cat", "horse"], degreeish: 3 } },
        { id: "b", values: { animals: ["cat"], degreeish: 1 } },
        { id: "c", values: { degreeish: 2 } },
    ]);
    await session.styles.settled();
    return { session, layer: id };
}

/**
 * Adds a thing from a section's "+".
 * @param section - the section.
 * @param kind - "fill" or "text".
 * @param thing - the menu item.
 */
async function plus(section: HTMLElement, kind: "fill" | "text", thing: string): Promise<void> {
    await userEvent.click(within(section).getByRole("button", { name: new RegExp(`^Add to node ${kind}`) }));
    await userEvent.click(await screen.findByRole("menuitem", { name: thing }));
}

/**
 * Opens a row's entries picker and checks fields by name, then clicks Done.
 * @param name - the picker's name.
 * @param fields - the fields to check.
 */
async function pick(name: string, fields: readonly string[]): Promise<void> {
    await userEvent.click(await screen.findByRole("combobox", { name }));
    const list = await screen.findByRole("listbox", { name });
    for (const field of fields) {
        await userEvent.click(within(list).getByRole("option", { name: new RegExp(`^${field}\\b`) }));
    }
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
}

describe("Style panel v2's data entries", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("starts a pie from a list field on Done, in one undo step, and reads its parts on the entry line", async () => {
        const { session, layer } = await withAnimals();
        const tab = await openStyle("Key people");
        await plus(sectionOf(tab, "node-fill"), "fill", "Pie");
        const picker = await screen.findByRole("combobox", { name: "Node pie data" });
        assert.include(picker.getAttribute("aria-label") ?? picker.textContent ?? "", "Node pie data");
        await waitFor(() => {
            assert.isDefined(written(session, layer, "node.pieColors"));
        });
        const before = session.history.position;
        await pick("Node pie data", ["animals"]);
        await waitFor(() => {
            assert.deepEqual(written(session, layer, "node.pieData"), { entries: [{ field: "data.animals" }] });
        });
        assert.isUndefined(written(session, layer, "node.pieColors"), "the fixed slices are unset in the same write");
        assert.strictEqual(session.history.position, before + 1, "one undo step");
        const merged = session.styles.explain({ node: "a" }).merged as Record<string, unknown>;
        assert.strictEqual(merged["node.pieSizes"], "0.25 0.5 0.25", "cat 1, dog 2, horse 1");
        await waitFor(() => {
            assert.isNotNull(screen.queryByRole("button", { name: /cat 1, dog 2, horse 1/ }));
        });

        await session.undo();
        await waitFor(() => {
            assert.isUndefined(written(session, layer, "node.pieData"));
        });
        assert.isDefined(written(session, layer, "node.pieColors"), "undo brings the fixed slices back");
    });

    it("writes nothing when the picker is left with Escape", async () => {
        const { session, layer } = await withAnimals();
        const tab = await openStyle("Key people");
        await plus(sectionOf(tab, "node-fill"), "fill", "Pie");
        await userEvent.click(await screen.findByRole("combobox", { name: "Node pie data" }));
        const list = await screen.findByRole("listbox", { name: "Node pie data" });
        const before = session.history.position;
        await userEvent.click(within(list).getByRole("option", { name: /^animals\b/ }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox", { name: "Node pie data" }));
        });
        assert.strictEqual(session.history.position, before);
        assert.isUndefined(written(session, layer, "node.pieData"));
    });

    it("brings the fixed slices back with Fixed, and shows a layer that holds only a data spec", async () => {
        const { session, layer } = await withAnimals();
        await session.styles.update(layer, {
            set: { "node.color": "#E8590C", "node.pieData": { entries: [{ field: "data.animals" }] } },
        });
        await session.styles.settled();
        await openStyle("Key people");
        const picker = await screen.findByRole("combobox", { name: "Node pie data" });
        await userEvent.click(picker);
        const list = await screen.findByRole("listbox", { name: "Node pie data" });
        await userEvent.click(within(list).getByRole("option", { name: "Fixed" }));
        await waitFor(() => {
            assert.isUndefined(written(session, layer, "node.pieData"));
        });
        assert.isDefined(written(session, layer, "node.pieColors"));
    });

    it("picks a record's rows and a chart's values the same way", async () => {
        const { session, layer } = await withAnimals();
        const tab = await openStyle("Key people");
        await plus(sectionOf(tab, "node-text"), "text", "Record");
        await pick("Node record data", ["degreeish"]);
        await waitFor(() => {
            assert.deepEqual(written(session, layer, "node.recordData"), { entries: [{ field: "data.degreeish" }] });
        });
        assert.isUndefined(written(session, layer, "node.shapeTexts"));
        await waitFor(() => {
            assert.isNotNull(screen.queryByRole("button", { name: /^degreeish, 3$/ }));
        });

        await plus(sectionOf(tab, "node-fill"), "fill", "Chart");
        await pick("Node chart data", ["degreeish"]);
        await waitFor(() => {
            assert.deepEqual(written(session, layer, "node.chartData"), { entries: [{ field: "data.degreeish" }] });
        });
        assert.strictEqual(written(session, layer, "node.chartKind"), "bar", "the kind stays its own channel");
    });
});
