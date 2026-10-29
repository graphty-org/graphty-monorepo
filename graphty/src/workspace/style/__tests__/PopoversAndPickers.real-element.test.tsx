/**
 * The binding popover's rows and readings, and the two value lists, on the REAL graphty-element,
 * driven by real input: on College football the conference column offers "One color per value"
 * and paints one palette color per conference; at 900 x 700 the ramp popover is 240 px wide and
 * fits; on Les Miserables Louvain's group grid lines up column for column, a recolored row
 * included, and a set select's Clear is a minus; the vary picker and the rule editor name Degree's and
 * Louvain's values the same.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openSampleFromStart } from "../../../test/open";
import { findValuePicker, screen, waitFor, within } from "../../../test/test-utils";
import { type WorkspaceStore } from "../../state/store";

/**
 * Opens a layer's Style tab and its color binding popover by clicking the color's value pill.
 * @param store - the workspace store.
 * @param layer - the layer.
 * @returns the popover.
 */
async function openBinding(store: WorkspaceStore, layer: Layer): Promise<HTMLElement> {
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
    const tab = await screen.findByTestId("style-tab", {});
    const pill = await waitFor(() => {
        const found = tab.querySelector<HTMLElement>(".cm-var-fill-button");
        assert.isNotNull(found);
        return found;
    });
    if (pill === null) {
        throw new Error("no value pill");
    }
    await userEvent.click(pill);
    return screen.findByRole("group", { name: "Color binding" });
}

/**
 * The distinct colors the nodes are painted.
 * @param session - the session.
 * @returns the colors.
 */
function nodeColors(session: GraphSession): Set<string | undefined> {
    return new Set(
        session.data.nodes().map((n) => session.styles.explain({ node: n.id }).merged["node.color"]?.hex.slice(0, 7)),
    );
}

/**
 * The run-made layer that colors the nodes.
 * @param session - the session.
 * @returns the layer.
 */
function runColorLayer(session: GraphSession): Layer {
    const layer = session.styles.list().find((l) => l.source.by === "run" && l.encode?.["node.color"] !== undefined);
    if (layer === undefined) {
        throw new Error("no run colors the nodes");
    }
    return layer;
}

/**
 * The names of the options a list shows now.
 * @param list - the list.
 * @returns the names.
 */
function optionNames(list: HTMLElement): string[] {
    return within(list)
        .queryAllByRole("option")
        .map((o) => (o.getAttribute("aria-label") ?? o.textContent ?? "").split(", ")[0]);
}

describe("the binding popover's rows and readings", () => {
    it("College football: conference offers one color per value and paints 12; the popover is 240 wide and fits at 900 x 700", async () => {
        await page.viewport(900, 700);
        const { session, store } = await openSampleFromStart("College football");
        await session.styles.settled();
        const layer = await session.styles.add({
            name: "Conference",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.value" } },
        });
        await session.styles.settled();
        const popover = await openBinding(store, layer);
        const dialog = popover.closest<HTMLElement>("[role=dialog]");
        assert.isNotNull(dialog);
        const box = dialog?.getBoundingClientRect();
        assert.equal(Math.round(box?.width ?? 0), 240, "the ramp popover is 240 px wide");
        assert.isAtLeast(box?.top ?? -1, 0, "its top is in the window");
        assert.isAtMost(box?.bottom ?? Infinity, window.innerHeight, "its bottom is in the window");
        assert.isAtMost(box?.right ?? Infinity, window.innerWidth, "it fits across");

        // No way out of varying in here: that is the field's own Stop varying button.
        assert.isNull(within(popover).queryByRole("button", { name: /^Use one (color|value)/ }));

        await userEvent.click(within(popover).getByRole("button", { name: "One color per value" }));
        await waitFor(() => {
            const binding = session.styles.get(layer.id)?.encode?.["node.color"];
            assert.equal(binding !== undefined && "by" in binding ? binding.scale : undefined, "ordinal");
            assert.equal(nodeColors(session).size, 12, "12 conferences, 12 colors");
        });
        assert.isDefined(
            await within(popover).findByRole("combobox", { name: /^Palette/ }),
            "the categorical palettes are offered",
        );
    });

    it("Les Miserables: Louvain's group rows line up, a recolored row included; a set select's Clear is a minus", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSampleFromStart("Les Miserables");
        await session.styles.settled();
        await session.runs.start("louvain");
        await session.styles.settled();
        const layer = runColorLayer(session);
        const popover = await openBinding(store, layer);
        const grid = within(popover).getByRole("grid", { name: /groups$/ });
        const dataRows = (): HTMLElement[] =>
            within(grid)
                .getAllByRole("row")
                .filter((row) => row.querySelector("[role=gridcell]") !== null);

        // Recolor the first row through its chip.
        const [first] = dataRows();
        await userEvent.click(within(first).getByTestId("compact-color-input-chip"));
        const hex = await screen.findByTestId("color-picker-value");
        await userEvent.tripleClick(hex);
        await userEvent.keyboard("00AA00{Enter}");
        await waitFor(() => {
            assert.isDefined(
                session.styles.categories(layer.id, "node.color").find((c) => c.entry !== undefined),
                "the row wrote its own color",
            );
        });
        // Enter keeps the picker open (Figma); Escape closes it.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByTestId("color-picker-value"), "Escape closes the picker");
        });

        // Every column lines up row to row, the recolored row included: the grid's own columns.
        const rows = dataRows();
        const lefts = (column: number): number[] =>
            rows.map(
                (row) =>
                    Math.round(
                        (row.querySelectorAll<HTMLElement>("[role=gridcell]")[column]?.getBoundingClientRect().left ??
                            -1) * 2,
                    ) / 2,
            );
        for (const [column, what] of ["the chip", "the name", "the count", "the eye and menu"].entries()) {
            const values = lefts(column);
            assert.isAtLeast(values[0], 0, `${what} is drawn`);
            assert.deepEqual(
                values,
                values.map(() => values[0]),
                `${what} lines up on every row`,
            );
        }
        for (const row of rows) {
            assert.match(row.querySelectorAll("[role=gridcell]")[2]?.textContent ?? "", /^\d+$/, "the count");
        }

        // Clear on a set select is a minus, never an "x"; the recolored row's Clear is in its menu.
        const firstName = rows[0].querySelector("[data-group-name]")?.firstChild?.textContent ?? "";
        await userEvent.click(within(rows[0]).getByRole("button", { name: new RegExp(` ${firstName} actions$`) }));
        assert.isDefined(await within(popover).findByRole("menuitem", { name: /^Clear color/ }));
        await userEvent.keyboard("{Escape}");
        // A set select's own Clear: the palette, once one is picked.
        await userEvent.click(within(popover).getByRole("combobox", { name: /^Palette/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Seven bright colors" }));
        const reset = await within(popover).findByRole("button", { name: /^Reset Palette/ });
        assert.isDefined(reset, "the palette select's Clear");
        const marks = reset.querySelectorAll("svg line, svg path");
        assert.lengthOf(marks, 1, "one stroke");
        const line = marks[0];
        assert.equal(line.getAttribute("y1"), line.getAttribute("y2"), "a level stroke: a minus");
    });

    it("the vary picker and the Which picker name Degree's and Louvain's values the same", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSampleFromStart("Les Miserables");
        await session.styles.settled();
        await session.runs.start("degree");
        await session.runs.start("louvain");
        await session.styles.settled();
        const layer = await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#FF0000" },
        });
        store.set({ inspected: { kind: "layer-row", id: layer.id } });
        const tab = await screen.findByTestId("style-tab", {});

        // The vary picker on Node size, every value unfolded.
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const field = await waitFor(() => {
            const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('.ws-row[data-line="node.size"]');
            assert.isNotNull(found, "a Size row");
            return found;
        });
        await userEvent.hover(field);
        await userEvent.click(await within(field).findByRole("button", { name: "Node size by attribute" }));
        const picker = await findValuePicker();
        const fold = within(picker).queryByRole("option", { name: /^\d+ attributes?, (hidden|shown)$/ });
        if (fold !== null) {
            await userEvent.click(fold);
        }
        const picked = optionNames(picker);
        for (const name of ["Degree", "Louvain"]) {
            assert.include(picked, name, `the picker lists ${name}`);
        }
        // A look lists each measure once: no rank or percentile beside it.
        assert.notInclude(picked, "Degree rank (1 = highest)");
        assert.notInclude(picked, "Degree percentile");
        const numberGlyph = within(picker)
            .getByRole("option", { name: /^Degree(,|$)/ })
            .querySelector("svg")?.outerHTML;
        const categoryGlyph = within(picker)
            .getByRole("option", { name: /^Louvain(,|$)/ })
            .querySelector("svg")?.outerHTML;
        assert.notEqual(numberGlyph, categoryGlyph, "numbers and categories have different glyphs");
        const row = within(picker)
            .getByRole("option", { name: /^Degree(,|$)/ })
            .getBoundingClientRect();
        assert.isAtMost(row.height, 32, "a picker row takes one line");
        await userEvent.click(within(picker).getByRole("combobox"));
        await userEvent.keyboard("Louvain");
        await waitFor(() => {
            assert.include(optionNames(picker), "Louvain", "typing Louvain finds its value");
        });
        await userEvent.keyboard("{Escape}");

        // The Which picker's add menu.
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }));
        await userEvent.click(await screen.findByRole("button", { name: "Add a condition" }));
        const listbox = await screen.findByRole("listbox");
        const ruled = optionNames(listbox);
        for (const name of picked.filter((n) => !/^\d+ attributes?$|^Fixed /.test(n))) {
            assert.include(ruled, name, `the add menu names ${name} as the picker does`);
        }
        // Rules still offer the rank, named the same way everywhere.
        assert.include(ruled, "Degree rank (1 = highest)");
        await userEvent.keyboard("Louvain");
        await waitFor(() => {
            assert.include(optionNames(listbox), "Louvain", "typing Louvain finds it in the add menu too");
        });
    });
});
