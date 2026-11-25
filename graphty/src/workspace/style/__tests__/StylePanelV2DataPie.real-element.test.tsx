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
import { openGroup, openProject, openStyle, sectionOf, written } from "./v2Harness";

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
    // "+" opens the entries picker at once (design 5.1); Escape keeps the fixed values, for the steps that follow.
    await screen.findByRole("listbox", { name: `Node ${thing.toLowerCase()} data` });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByRole("listbox", { name: `Node ${thing.toLowerCase()} data` }));
    });
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

/**
 * The pop-over a settings button has open.
 * @param name - the start of the button's name.
 * @returns the pop-over.
 */
async function openFrom(name: string): Promise<HTMLElement> {
    return waitFor(() => {
        const button = document.querySelector<HTMLElement>(`button[aria-label^="${name}"]`);
        assert.isNotNull(button, name);
        assert.strictEqual(button.getAttribute("aria-expanded"), "true", `${name} is open`);
        const pop = document.getElementById(button.getAttribute("aria-controls") ?? "");
        assert.isNotNull(pop);
        return pop;
    });
}

/**
 * A pop-over opened beside another, by its title.
 * @param title - its title.
 * @returns its content.
 */
async function beside(title: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-beside-pop="${title}"]`);
        assert.isNotNull(found, `${title} is open`);
        return found;
    });
}

describe("Style panel v2's data entries", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("starts a pie from a list field on Done, in one undo step, its entry line showing its setting", async () => {
        const { session, layer } = await withAnimals();
        const tab = await openStyle("Key people");
        await plus(sectionOf(tab, "node-fill"), "fill", "Pie");
        const picker = await screen.findByRole<HTMLInputElement>("combobox", { name: "Node pie data" });
        // Named by its label element (findByRole above); it reads "Fixed" while the layer holds fixed slices.
        assert.strictEqual(picker.value, "Fixed");
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
        // The entry line shows what it reads, never one node's values (the sidebar holds controls only).
        await waitFor(() => {
            assert.isNotNull(screen.queryByRole("button", { name: "animals, animals" }));
        });
        assert.isNull(screen.queryByRole("button", { name: /cat 1, dog 2, horse 1/ }));

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
            // The entry line shows what it reads, not one node's values.
            assert.isNotNull(screen.queryByRole("button", { name: "degreeish, degreeish" }));
        });

        await plus(sectionOf(tab, "node-fill"), "fill", "Chart");
        await pick("Node chart data", ["degreeish"]);
        await waitFor(() => {
            assert.deepEqual(written(session, layer, "node.chartData"), { entries: [{ field: "data.degreeish" }] });
        });
        assert.strictEqual(written(session, layer, "node.chartKind"), "bar", "the kind stays its own channel");
    });

    it("counts each node's neighbors by a column from Calculate (owner's pie case 2)", async () => {
        const { session, layer } = await withAnimals();
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "a", target: "c" },
        ]);
        await session.data.updateNodes([
            { id: "a", values: { community: "red" } },
            { id: "b", values: { community: "blue" } },
            { id: "c", values: { community: "red" } },
        ]);
        await session.styles.settled();
        const tab = await openStyle("Key people");
        await plus(sectionOf(tab, "node-fill"), "fill", "Pie");
        await userEvent.click(await screen.findByRole("combobox", { name: "Node pie data" }));
        const list = await screen.findByRole("listbox", { name: "Node pie data" });
        await userEvent.click(within(list).getByRole("option", { name: "Calculate..." }));
        const calculate = await beside("Calculate");
        await userEvent.click(within(calculate).getByText("Neighbors"));
        await waitFor(() => {
            const spec = written(session, layer, "node.pieData") as { entries: { graph?: { over: string } }[] };
            assert.strictEqual(spec.entries[0].graph?.over, "neighbors");
        });
        await userEvent.click(within(await beside("Calculate")).getByRole("combobox", { name: "Group by" }));
        const fields = await screen.findByRole("listbox", { name: "Group by" });
        await userEvent.click(within(fields).getByRole("option", { name: /^community\b/ }));
        await waitFor(() => {
            assert.deepEqual(written(session, layer, "node.pieData"), {
                entries: [
                    {
                        graph: {
                            over: "neighbors",
                            measure: "count",
                            groupBy: { by: "value", path: "data.community" },
                        },
                    },
                ],
            });
        });
        const merged = session.styles.explain({ node: "a" }).merged as Record<string, unknown>;
        assert.strictEqual(merged["node.pieSizes"], "0.5 0.5", "one blue neighbor, one red");
    });

    it('opens an entry from its "...", renames a category from Colors, and draws a ring from its No values', async () => {
        const { session, layer } = await withAnimals();
        await session.styles.update(layer, {
            set: { "node.color": "#E8590C", "node.pieData": { entries: [{ field: "data.animals" }] } },
        });
        await session.styles.settled();
        await openStyle("Key people");
        const more = await screen.findByRole("button", { name: "animals settings" });
        await userEvent.hover(more.closest<HTMLElement>(".ws-row") ?? more);
        await userEvent.click(more);
        const entry = await openFrom("animals settings");
        await userEvent.click(within(entry).getByText("Equal share"));
        await waitFor(() => {
            const spec = written(session, layer, "node.pieData") as { entries: { each?: string }[] };
            assert.strictEqual(spec.entries[0].each, "equal");
        });
        await userEvent.keyboard("{Escape}");

        const settings = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(
                '[data-line="node.pieData"] button[aria-label^="Node pie settings"]',
            );
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(settings);
        const pop = await openFrom("Node pie settings");
        const colors = await openGroup(pop, "Colors");
        await userEvent.click(within(colors).getByRole("combobox", { name: "Category" }));
        await userEvent.click(await screen.findByRole("option", { name: "dog" }));
        const name = within(colors).getByRole("textbox", { name: "Name" });
        assert.strictEqual((name as HTMLInputElement).value, "dog", "unset, the name shows the category's name");
        await userEvent.clear(name);
        await userEvent.type(name, "Dogs{Enter}");
        await waitFor(() => {
            const spec = written(session, layer, "node.pieData") as { categories?: unknown };
            assert.deepEqual(spec.categories, { dog: { label: "Dogs" } });
        });
        // No values is a line of Colors, not a group of one line.
        await userEvent.click(within(colors).getByText("Ring"));
        await waitFor(() => {
            assert.strictEqual((written(session, layer, "node.pieData") as { empty?: string }).empty, "ring");
        });
    });
});
