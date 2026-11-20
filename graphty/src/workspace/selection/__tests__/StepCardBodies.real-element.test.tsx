/**
 * The step cards' bodies in the selection workspace that only some data reaches, on the REAL
 * graphty-element, driven by real clicks and keys: a category step's values show the color the
 * graph draws them in once the preview is Styled; a Node id step takes the selected nodes; a Data
 * source step ticks a load; and an edge value under "Edges where ..." switches to By position,
 * keeping its card while no count is typed, and back to By value with its range.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/** Six nodes of two kinds in a ring, each edge with a weight. */
const RING = {
    nodes: Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}`, kind: i < 3 ? "a" : "b" })),
    edges: Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(i)}`,
        target: `n${String((i + 1) % 6)}`,
        weight: i + 1,
    })),
};

/** The color a layer paints the "a" nodes. */
const PAINT = "#0072b2";

/**
 * The ring in the workspace, a layer painting its "a" nodes, and a reader's layer selected in the
 * style tree that draws no color of its own.
 * @param extra - a second load, when the test needs two.
 * @param selected - nodes selected before the layer is picked in the style tree.
 * @returns the session and the reader's layer.
 */
async function openLayer(
    extra = false,
    selected: readonly string[] = [],
): Promise<{ session: GraphSession; layer: Layer }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "json", name: "ring.json", config: { data: JSON.stringify(RING) } });
    if (extra) {
        const more = { nodes: [{ id: "m0" }, { id: "m1" }], edges: [{ source: "m0", target: "m1" }] };
        await session.data.import(
            { type: "json", name: "more.json", config: { data: JSON.stringify(more) } },
            { mode: "merge" },
        );
    }
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await session.styles.add({
        name: "Paint",
        target: "node",
        selector: { match: "rule", where: { kind: "categories", attribute: "data.kind", values: ["a"] } },
        set: { "node.color": PAINT },
    });
    const layer = await session.styles.add({
        name: "Calm",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 2 },
    });
    await session.styles.settled();
    if (selected.length > 0) {
        await session.selection.apply({ nodes: [...selected] });
    }
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Calm, / }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return { session, layer };
}

/**
 * The first step of the layer's selection, as the element holds it.
 * @param session - the session.
 * @param id - the layer.
 * @returns the step, or undefined.
 */
function firstStep(session: GraphSession, id: string): UnionLeaf["branches"][number]["steps"][number] | undefined {
    const selector = session.styles.get(id)?.selector;
    const where: UnionLeaf | undefined =
        selector?.match === "rule" && selector.where.kind === "union" ? selector.where : undefined;
    return where?.branches[0]?.steps[0];
}

/**
 * Opens the workspace on the layer and picks a value in its empty card by typing its name.
 * @param name - what to type.
 */
async function openOn(name: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-ws"), "the workspace is open");
    });
    const empty = [...document.querySelectorAll<HTMLElement>(".sel-ws [data-new-step] [data-first-focus]")].at(-1);
    assert.isDefined(empty, "an empty card's Value");
    await userEvent.click(empty);
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard(`${name}{Enter}`);
}

describe("a category step's values in the Styled preview", () => {
    it("show the color the graph draws each value in", async () => {
        await openLayer();
        await openOn("kind");
        const row = await screen.findByRole("checkbox", { name: /^a, 3 nodes/ });
        assert.isNull(document.querySelector(".sel-ws [data-swatch]"), "Card colors draws no swatch");
        await userEvent.click(within(await screen.findByRole("radiogroup", { name: "Preview" })).getByText("Styled"));
        await waitFor(() => {
            const swatch = row.closest(".mantine-Checkbox-root")?.querySelector<HTMLElement>("[data-swatch]");
            assert.strictEqual(swatch?.dataset.swatch?.toLowerCase(), PAINT, "a's swatch is the paint");
        });
    });
});

describe("a Node id step", () => {
    it("takes the selected nodes", async () => {
        const { session, layer } = await openLayer(false, ["n1", "n4"]);
        await openOn("Node id");
        await userEvent.click(await screen.findByRole("button", { name: "Use the selected nodes" }));
        await waitFor(() => {
            const rule = firstStep(session, layer.id)?.rule as { ids?: readonly string[] } | undefined;
            assert.include(JSON.stringify(rule), "n4", "the step holds the nodes");
        });
        await waitFor(() => {
            assert.include(document.querySelector(".sel-ws-cards")?.textContent ?? "", "2 of 6", "the card holds them");
        });
    });
});

describe("a Data source step", () => {
    it("ticks a load and the step keeps its elements", async () => {
        const { session, layer } = await openLayer(true);
        await openOn("Data source");
        await userEvent.click(await screen.findByRole("checkbox", { name: /, 2 nodes$/ }));
        await waitFor(() => {
            const rule = firstStep(session, layer.id)?.rule as { kind?: string; sources?: readonly string[] };
            assert.strictEqual(rule.kind, "source");
            assert.lengthOf(rule.sources ?? [], 1, "one load is ticked");
        });
    });
});

describe("an edge value under Edges where ...", () => {
    it("switches to By position, keeping its card for the count, and back to By value with its range kept", async () => {
        const { session, layer } = await openLayer();
        await openOn("Degree");
        await userEvent.click(await screen.findByRole("button", { name: "Settings for Degree" }));
        await userEvent.click(
            within(await screen.findByRole("dialog", { name: "Degree" })).getByText("Edges where ..."),
        );
        await userEvent.click(await screen.findByRole("button", { name: "Edge value: none" }));
        await screen.findByRole("combobox", { name: /^Find edge attributes/ });
        await userEvent.keyboard("weight{Enter}");
        const links = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-card-links]");
            assert.isNotNull(found);
            return found;
        });
        const min = await within(links).findByRole("textbox", { name: /from, number$/ });
        await userEvent.click(min);
        await userEvent.keyboard("{Control>}a{/Control}3{Enter}");
        const held = (): { min?: number } | undefined =>
            firstStep(session, layer.id)?.links as { min?: number } | undefined;
        await waitFor(() => {
            assert.strictEqual(held()?.min, 3, "the edge test holds its Min");
        });

        await userEvent.click(screen.getByRole("combobox", { name: "weight test" }));
        await userEvent.click(await screen.findByRole("option", { name: "By position" }));
        await waitFor(() => {
            assert.isUndefined(held(), "By position with no count yet tests no edge");
        });
        await screen.findByRole("textbox", { name: "weight: how many" });
        await userEvent.click(screen.getByRole("combobox", { name: "weight test" }));
        await userEvent.click(await screen.findByRole("option", { name: "By value" }));
        await waitFor(() => {
            assert.strictEqual(held()?.min, 3, "By value brings the range back");
        });
    });
});
