/**
 * Style panel v2's Record from data on the REAL graphty-element, by real clicks: several fields picked at once, each
 * line reading the sample's value in its entry's format, a text column first drawing its own glyph on the picker, the
 * entry's value opening its pop-over and a tab picked there keeping it open, the Points layout, a Text entry, the
 * sample named by its label, and Alt+ArrowDown moving a row.
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
 * The project with gene facts on each node, named by its label.
 * @returns the session and the layer.
 */
async function withGenes(): Promise<{ session: GraphSession; layer: string }> {
    const { session, id } = await openProject();
    await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
    await session.data.updateNodes([
        { id: "a", values: { label: "TP53", gene: "TP53", degree: 34, logFC: -2.31 } },
        { id: "b", values: { label: "MDM2", gene: "MDM2", degree: 12, logFC: 1.2 } },
        { id: "c", values: { label: "ATM", gene: "ATM", degree: 3, logFC: 0.4 } },
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

    it("picks fields in order, reads each on its line, and draws the first entry's glyph", async () => {
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
        const picker = screen.getByRole("combobox", { name: "Node record data" });
        const row = picker.closest<HTMLElement>(".ws-row");
        assert.isNotNull(row);
        assert.strictEqual(
            row.querySelector("[data-field-type]")?.getAttribute("data-field-type"),
            "string",
            "a text column first draws the text glyph, not #",
        );
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

        const first = await screen.findByRole("button", { name: /^degree, 34$/ });
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
});
