/**
 * The binding popover's rows and readings, and the two value lists, on the REAL graphty-element,
 * driven by real input: on College football the conference column offers "One color per value"
 * and paints one palette color per conference; at 900 x 700 the ramp popover is 240 px wide and
 * fits; on Les Miserables Louvain's category rows line up column for column, a recolored row
 * included, and every Clear is a minus; the vary picker and the rule editor name Degree's and
 * Louvain's values the same.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { findValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and loading a sample, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Opens a sample from the start screen and waits for its nodes.
 * @param sample - the sample's name on its button.
 * @param nodes - how many nodes it has.
 * @returns the session and the store.
 */
async function openSample(sample: string, nodes: number): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    await userEvent.click(await screen.findByRole("button", { name: `Open the ${sample} sample` }));
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.equal(found?.data.statistics().nodeCount, nodes);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.styles.settled();
    return { session, store };
}

/**
 * Opens a layer's Style tab and its color binding popover by clicking the color's value pill.
 * @param store - the workspace store.
 * @param layer - the layer.
 * @returns the popover.
 */
async function openBinding(store: WorkspaceStore, layer: Layer): Promise<HTMLElement> {
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
    const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
    const pill = await waitFor(
        () => {
            const found = tab.querySelector<HTMLElement>(".cm-var-fill-button");
            assert.isNotNull(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
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
        .map((o) => o.getAttribute("aria-label") ?? o.textContent ?? "");
}

describe("the binding popover's rows and readings", () => {
    it("College football: conference offers one color per value and paints 12; the popover is 240 wide and fits at 900 x 700", async () => {
        await page.viewport(900, 700);
        const { session, store } = await openSample("College football", 115);
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
        await waitFor(
            () => {
                const binding = session.styles.get(layer.id)?.encode?.["node.color"];
                assert.equal(binding !== undefined && "by" in binding ? binding.scale : undefined, "ordinal");
                assert.equal(nodeColors(session).size, 12, "12 conferences, 12 colors");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.isDefined(
            await within(popover).findByRole("combobox", { name: /^Palette/ }),
            "the categorical palettes are offered",
        );
    });

    it("Les Miserables: Louvain's rows line up, a recolored row included, and every Clear is a minus", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        await session.runs.start("louvain");
        await session.styles.settled();
        const layer = runColorLayer(session);
        const popover = await openBinding(store, layer);
        const list = within(popover).getByRole("list", { name: /values$/ });

        // Recolor the first row through its chip.
        const [first] = within(list).getAllByRole("listitem");
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

        const rows = await waitFor(() => {
            const found = within(list).getAllByRole("listitem");
            assert.isNotNull(within(found[0]).queryByRole("button", { name: /^Back to the palette: / }));
            return found;
        });
        const lefts = (selector: (row: HTMLElement) => Element | null): number[] =>
            rows.map((row) => Math.round((selector(row)?.getBoundingClientRect().left ?? -1) * 2) / 2);
        const same = (values: number[], what: string): void => {
            assert.isAtLeast(values[0], 0, `${what} is drawn`);
            assert.deepEqual(
                values,
                values.map(() => values[0]),
                `${what} lines up on every row`,
            );
        };
        same(
            lefts((row) => row.querySelector("[data-testid=compact-color-input-chip]")),
            "the chip",
        );
        same(
            lefts((row) => row.children[1]),
            "the name",
        );
        same(
            rows.map((row) => Math.round((row.children[2]?.getBoundingClientRect().right ?? -1) * 2) / 2),
            "the count's end",
        );
        same(
            lefts((row) => within(row).queryByRole("button", { name: /^Hide / })),
            "the eye",
        );
        same(
            lefts((row) => row.querySelector("[data-clear-column]")),
            "the Clear column",
        );
        for (const row of rows) {
            assert.match(row.children[2]?.textContent ?? "", /^\d+ nodes?$/, "the count says its unit");
        }

        // Clear on the recolored row and on a set select are both a minus, never an "x".
        const clear = within(rows[0]).getByRole("button", { name: /^Back to the palette: / });
        assert.isNotNull(clear.querySelector("svg.lucide-minus"), "the row's Clear is the panel's minus");
        await userEvent.click(within(popover).getByRole("combobox", { name: /^More values than colors/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Extend the palette" }));
        const reset = await within(popover).findByTestId("style-select-reset");
        const marks = reset.querySelectorAll("svg line, svg path");
        assert.lengthOf(marks, 1, "one stroke");
        const line = marks[0];
        assert.equal(line.getAttribute("y1"), line.getAttribute("y2"), "a level stroke: a minus");
    });

    it("the vary picker and the rule editor name Degree's and Louvain's values the same", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
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
        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });

        // The vary picker on Node size, every value unfolded.
        const control = tab.querySelector<HTMLElement>('[aria-label^="Node size, "]');
        const field = control?.closest<HTMLElement>(".ws-field");
        if (field === null || field === undefined) {
            throw new Error("no Node size field");
        }
        await userEvent.hover(field);
        await userEvent.click(await within(field).findByRole("button", { name: "Node size by attribute" }));
        const picker = await findValuePicker();
        const fold = within(picker).queryByRole("option", { name: /that do not fit/ });
        if (fold !== null) {
            await userEvent.click(fold);
        }
        const picked = optionNames(picker);
        for (const name of ["Degree", "Rank of Degree", "Community"]) {
            assert.include(picked, name, `the picker lists ${name}`);
        }
        const degree = within(picker).getByRole("group", { name: "Degree" });
        assert.include(optionNames(degree), "Rank of Degree", "grouped under the run's name");
        const numberGlyph = within(picker).getByRole("option", { name: "Degree" }).querySelector("svg")?.outerHTML;
        const categoryGlyph = within(picker).getByRole("option", { name: "Community" }).querySelector("svg")?.outerHTML;
        assert.notEqual(numberGlyph, categoryGlyph, "numbers and categories have different glyphs");
        const row = within(picker).getByRole("option", { name: "Degree" }).getBoundingClientRect();
        assert.isAtMost(row.height, 32, "a picker row takes one line");
        await userEvent.click(within(picker).getByRole("combobox"));
        await userEvent.keyboard("Community");
        await waitFor(() => {
            assert.include(optionNames(picker), "Community", "typing Community finds Louvain's value");
        });
        await userEvent.keyboard("{Escape}");

        // The rule editor's Attribute list.
        await userEvent.click(await screen.findByRole("button", { name: /^Which elements: / }));
        await userEvent.click(await screen.findByRole("combobox", { name: "Rule" }));
        await userEvent.click(await screen.findByRole("option", { name: "Where a value" }));
        await userEvent.click(screen.getByRole("button", { name: "Add condition" }));
        const attribute = within(screen.getByRole("group", { name: "Condition 1" })).getByRole("combobox", {
            name: "Attribute",
        });
        await userEvent.click(attribute);
        const listbox = await screen.findByRole("listbox");
        const ruled = optionNames(listbox);
        for (const name of picked.filter((n) => !/that do not fit|^Fixed /.test(n))) {
            assert.include(ruled, name, `the rule editor names ${name} as the picker does`);
        }
        await userEvent.keyboard("Community");
        await waitFor(() => {
            assert.include(optionNames(listbox), "Community", "typing Community finds it in the rule editor too");
        });
    });
});
