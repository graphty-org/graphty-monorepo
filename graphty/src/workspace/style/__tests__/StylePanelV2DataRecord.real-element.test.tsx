/**
 * Style panel v2's Record from data on the REAL graphty-element, by real clicks: several fields picked at once, each
 * line reading the sample's value in its entry's format, a text column first drawing its own glyph on the picker, the
 * entry's value opening its pop-over and a tab picked there keeping it open, the Points layout, a Text entry, the
 * sample named by its label, Alt+ArrowDown moving a row, and the record graphty-element draws: a list counted, a
 * Points entry's X / Y and the Text group's letters, read from the element's drawn values and the canvas's pixels.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGroup, openProject, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/**
 * The project with gene facts on each node, named by its label.
 * @returns the session and the layer.
 */
async function withGenes(): Promise<{ session: GraphSession; layer: string }> {
    const { session, id } = await openProject();
    await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
    await session.data.updateNodes([
        {
            id: "a",
            values: { label: "TP53", gene: "TP53", degree: 34, logFC: -2.31, animals: ["dog", "cat", "dog", "horse"] },
        },
        { id: "b", values: { label: "MDM2", gene: "MDM2", degree: 12, logFC: 1.2, animals: ["cat"] } },
        { id: "c", values: { label: "ATM", gene: "ATM", degree: 3, logFC: 0.4, animals: ["owl", "owl"] } },
    ]);
    await session.styles.settled();
    return { session, layer: id };
}

/**
 * Adds a Record from the Text "+" and picks fields in its entries picker, then Done.
 * @param tab - the Style tab.
 * @param fields - the fields, in pick order.
 */
async function recordOf(tab: HTMLElement, fields: readonly string[]): Promise<void> {
    await userEvent.click(within(sectionOf(tab, "node-text")).getByRole("button", { name: /^Add to node text/ }));
    // "+" opens the entries picker at once (design 5.1).
    await userEvent.click(await screen.findByRole("menuitem", { name: "Record" }));
    const list = await screen.findByRole("listbox", { name: "Node record data" });
    for (const field of fields) {
        await userEvent.click(within(list).getByRole("option", { name: new RegExp(`^${field}\\b`) }));
    }
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
}

/**
 * The pop-over a settings button has open.
 * @param name - the button's name.
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

describe("Style panel v2's record from data", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("picks fields in order, reads each on its line, and draws the first entry's glyph on its line", async () => {
        const { session, layer } = await withGenes();
        const tab = await openStyle("Key people");
        await recordOf(tab, ["gene", "degree", "logFC"]);
        await waitFor(() => {
            assert.deepEqual(written(session, layer, "node.recordData"), {
                entries: [{ field: "data.gene" }, { field: "data.degree" }, { field: "data.logFC" }],
            });
        });
        // Each entry's line holds its source, the field it reads (never one node's value).
        await waitFor(() => {
            const fields = screen.queryAllByRole<HTMLInputElement>("combobox", { name: "Field" });
            assert.deepEqual(
                fields.map((each) => each.value),
                ["gene", "degree", "logFC"],
            );
        });
        // The row's picker only adds entries (one path to any control); the first entry's own line draws its
        // column's glyph: a text column the text glyph, not #.
        const [first] = screen.getAllByRole("combobox", { name: "Field" });
        const line = first.closest<HTMLElement>(".ws-row");
        assert.isNotNull(line);
        assert.strictEqual(line.querySelector("[data-field-type]")?.getAttribute("data-field-type"), "string");
    });

    it('opens an entry from its "...", keeps it open on a tab pick, and signs a value from Format', async () => {
        const { session, layer } = await withGenes();
        const tab = await openStyle("Key people");
        await recordOf(tab, ["logFC"]);
        const more = await screen.findByRole("button", { name: "logFC settings" });
        await userEvent.hover(more.closest<HTMLElement>(".ws-row") ?? more);
        await userEvent.click(more);
        const pop = await openFrom("logFC settings");
        // The Format line's button is the one way to the Format pop-over (one path to any control).
        assert.isNull(within(pop).queryByRole("combobox", { name: "Format" }), "no preset drop-down beside it");
        await userEvent.click(within(pop).getByRole("button", { name: /^logFC format, -2\.31$/ }));
        const format = await openFrom("logFC format");
        await userEvent.click(within(format).getByText("Always"));
        await waitFor(() => {
            const spec = written(session, layer, "node.recordData") as { entries: { format?: unknown }[] };
            assert.deepEqual(spec.entries[0].format, { signDisplay: "exceptZero" });
        });
        await userEvent.click(within(pop).getByText("Text"));
        await waitFor(() => {
            const spec = written(session, layer, "node.recordData") as { entries: Record<string, unknown>[] };
            assert.strictEqual(spec.entries[0].text, "Text");
        });
        // Its name follows its source; the line keeps its place, so its pop-over stays open.
        await openFrom("Text settings");
    });

    it("lays rows out as points, names the sample by its label, and moves a row with Alt+ArrowDown", async () => {
        const { session, layer } = await withGenes();
        const tab = await openStyle("Key people");
        await recordOf(tab, ["degree", "logFC"]);
        const settings = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>(
                '[data-line="node.recordData"] button[aria-label^="Node record settings"]',
            );
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(settings);
        const pop = await openFrom("Node record settings");
        await userEvent.click(within(pop).getByText("Points"));
        await waitFor(() => {
            assert.strictEqual((written(session, layer, "node.recordData") as { layout?: string }).layout, "points");
        });
        assert.match(within(pop).getByRole<HTMLInputElement>("combobox", { name: "Sample" }).value, /^TP53/);
        await userEvent.keyboard("{Escape}");

        // The first entry's line moves from any of its own controls: its "..." here.
        const first = await screen.findByRole("button", { name: "degree settings" });
        first.focus();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        await waitFor(() => {
            const spec = written(session, layer, "node.recordData") as { entries: { field?: string }[] };
            assert.deepEqual(
                spec.entries.map((each) => each.field),
                ["data.logFC", "data.degree"],
            );
        });
    });

    it("draws a list counted, a Points entry at its X / Y, and its words in the Text group's letters", async () => {
        const { session, layer } = await withGenes();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        const tab = await openStyle("Key people");
        await recordOf(tab, ["animals"]);
        // graphty-element counts a list of words, most first: the drawn table's value cell reads the counts.
        await waitFor(() => {
            assert.include(drawnCells(session), "dog 2, cat 1, horse 1");
        });

        // Each value: Once draws each word once.
        const more = await screen.findByRole("button", { name: "animals settings" });
        await userEvent.hover(more.closest<HTMLElement>(".ws-row") ?? more);
        await userEvent.click(more);
        const entry = await openFrom("animals settings");
        await userEvent.click(within(entry).getByText("Once"));
        await waitFor(() => {
            const spec = written(session, layer, "node.recordData") as { entries: { each?: string }[] };
            assert.strictEqual(spec.entries[0].each, "equal");
            assert.include(drawnCells(session), "dog, cat, horse");
        });
        // A table entry has no X / Y: its cell is its place.
        assert.isNull(entry.querySelector('[data-line="entry.at"]'));
        await userEvent.keyboard("{Escape}");

        // The record's Text group: color, size and the font picker; a larger size redraws the words.
        const settings = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>(
                '[data-line="node.recordData"] button[aria-label^="Node record settings"]',
            );
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(settings);
        const pop = await openFrom("Node record settings");
        const text = await openGroup(pop, "Text");
        assert.strictEqual(text.dataset.groupPop, "Text");
        for (const channel of ["node.labelColor", "node.labelLetterSize", "node.labelFont"]) {
            assert.isNotNull(text.querySelector(`[data-line="${channel}"]`), channel);
        }
        const before = await picture(element);
        const size = text.querySelector<HTMLInputElement>('[data-line="node.labelLetterSize"] input');
        assert.isNotNull(size);
        await userEvent.clear(size);
        await userEvent.type(size, "2{Enter}");
        await waitFor(() => {
            assert.strictEqual(written(session, layer, "node.labelLetterSize"), 2);
        });
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the record's words are drawn larger");

        // Points: the entry's pop-over gains X / Y, and the drawn text sits at the point typed.
        await userEvent.click(within(pop).getByText("Points"));
        await waitFor(() => {
            assert.strictEqual((written(session, layer, "node.recordData") as { layout?: string }).layout, "points");
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        const again = await screen.findByRole("button", { name: "animals settings" });
        await userEvent.hover(again.closest<HTMLElement>(".ws-row") ?? again);
        await userEvent.click(again);
        const point = await openFrom("animals settings");
        const x = await waitFor(() => {
            const found = point.querySelector<HTMLInputElement>(
                '[data-line="entry.at"] input[aria-label="animals point x"]',
            );
            assert.isNotNull(found, "the X / Y line");
            return found;
        });
        await userEvent.clear(x);
        await userEvent.type(x, "0.5{Enter}");
        await waitFor(() => {
            const spec = written(session, layer, "node.recordData") as { entries: { at?: number[] }[] };
            assert.deepEqual(spec.entries[0].at, [0.5, 0]);
            const texts = session.styles
                .drawnValues("node.shapeTexts")
                .flatMap((each) => JSON.parse(String(each.value)) as unknown[][]);
            assert.deepInclude(texts, [0.5, 0, "dog, cat, horse"]);
        });
    });
});

/**
 * Every value cell's words of the record tables graphty-element draws.
 * @param session - the session.
 * @returns the words.
 */
function drawnCells(session: GraphSession): string[] {
    return session.styles.drawnValues("node.labelTable").flatMap((each) => {
        const table = JSON.parse(String(each.value)) as { rows: { cells: { lines: { text: string }[] }[] }[] };
        return table.rows.map((row) => (row.cells.at(-1)?.lines ?? []).map((line) => line.text).join(""));
    });
}
