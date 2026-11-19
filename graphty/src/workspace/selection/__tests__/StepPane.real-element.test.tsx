/**
 * A step's controls on a selection workspace card, on the REAL graphty-element, driven by real
 * clicks and keys: a Relative to step's Hops box, a touching step's Edge ends, Include not measured
 * on a value some nodes lack, and an algorithm step's output select and setting chips. Each edit
 * lands in the layer's selection as graphty-element holds it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, RuleTree, UnionLeaf, UnionStep } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/** Four people, two of them with an age. */
const PEOPLE_GML = `graph [
  node [ id 1 label "Ana" age 30 ]
  node [ id 2 label "Bo" age 40 ]
  node [ id 3 label "Cy" ]
  node [ id 4 label "Dee" ]
  edge [ source 1 target 2 ]
  edge [ source 2 target 3 ]
  edge [ source 3 target 4 ]
]`;

/**
 * One card holding one step.
 * @param side - what the card selects.
 * @param rule - the step's rule.
 * @returns the selection.
 */
function oneStep(side: UnionLeaf["side"], rule: RuleTree): UnionLeaf {
    return {
        kind: "union",
        side,
        within: "visible",
        branches: [{ id: "a", start: "none", steps: [{ id: "s", op: "add", rule }] }],
    };
}

/**
 * A graph in the workspace with a reader's layer on this selection, the selection open in the
 * full-screen workspace.
 * @param where - the layer's selection.
 * @param graph - the graph, as GML.
 * @returns the session, the layer and the workspace.
 */
async function openStep(
    where: UnionLeaf,
    graph = lesMiserables,
): Promise<{ session: GraphSession; layer: Layer; modal: HTMLElement }> {
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
    await session.data.import({ type: "gml", name: "graph.gml", config: { data: graph } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const layer = await session.styles.add({
        name: "Calm",
        target: where.side === "edges" ? "edge" : "node",
        selector: { match: "rule", where },
        set: where.side === "edges" ? { "edge.color": "#d55e00" } : { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Calm, / }));
    await userEvent.click(await screen.findByRole("button", { name: /^Style (Nodes|Edges)\.\.\./ }));
    const modal = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
    return { session, layer, modal };
}

/**
 * The layer's one step, as graphty-element holds it.
 * @param session - the session.
 * @param layer - the layer.
 * @returns the step.
 */
function stepOf(session: GraphSession, layer: Layer): UnionStep | undefined {
    const selector = session.styles.get(layer.id)?.selector;
    return selector?.match === "rule" && selector.where.kind === "union"
        ? selector.where.branches[0]?.steps[0]
        : undefined;
}

/**
 * The step's pane on its card.
 * @param modal - the workspace.
 * @returns the pane.
 */
function pane(modal: HTMLElement): HTMLElement {
    const found = modal.querySelector<HTMLElement>("[data-step-pane]");
    assert.isNotNull(found, "the step's pane is drawn");
    return found;
}

/**
 * Opens the step's settings from its card.
 * @param modal - the workspace.
 * @returns the settings.
 */
async function openSettings(modal: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(within(pane(modal)).getByRole("button", { name: /^Settings for / }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".ws-options-rows");
        assert.isNotNull(found, "the settings are open");
        return found;
    });
}

describe("a selection step's controls", () => {
    it("the value field opens its picker on a click or a typed letter, and a picked attribute replaces the value", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "range", attribute: "graphty.degree", min: 1 }),
            PEOPLE_GML,
        );
        const field = within(pane(modal)).getByRole("button", { name: /^Value: / });
        await userEvent.click(field);
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }), "Escape shut it");
            assert.strictEqual(document.activeElement, field, "focus is back on the field");
        });

        await userEvent.keyboard("a");
        const search = await screen.findByRole<HTMLInputElement>("combobox", { name: "Find attributes, results" });
        assert.strictEqual(search.value, "a", "the letter typed on the field starts the search");
        await userEvent.keyboard("ge{Enter}");
        await waitFor(() => {
            assert.strictEqual((stepOf(session, layer)?.rule as { attribute?: string }).attribute, "data.age");
        });
    });

    it("Hops widens a Relative to step to more hops", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "hops", of: { nodes: ["Valjean"] }, max: 1 }),
        );
        const hops = within(pane(modal)).getByRole("textbox", { name: "Hops" });
        await userEvent.tripleClick(hops);
        await userEvent.keyboard("2");
        await waitFor(() => {
            assert.strictEqual((stepOf(session, layer)?.rule as { max?: number }).max, 2);
        });
    });

    it("Edge ends picks which ends of an edge must touch", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("edges", { kind: "touching", ends: "either", of: { nodes: ["Valjean"] } }),
        );
        const settings = await openSettings(modal);
        const ends = within(settings).getByRole("radiogroup", { name: "Edge ends" });
        await userEvent.click(within(ends).getByText("Both"));
        await waitFor(() => {
            assert.strictEqual((stepOf(session, layer)?.rule as { ends?: string }).ends, "both");
        });
    });

    it("Include not measured lets the nodes with no value pass, and off again leaves them out", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "range", attribute: "data.age", min: 0 }),
            PEOPLE_GML,
        );
        const settings = await openSettings(modal);
        const include = within(settings).getByRole("checkbox", { name: "Include not measured" });
        await userEvent.click(include);
        await waitFor(() => {
            assert.strictEqual((stepOf(session, layer)?.rule as { missing?: string }).missing, "include");
        });
        await userEvent.click(within(document.body).getByRole("checkbox", { name: "Include not measured" }));
        await waitFor(() => {
            assert.isUndefined((stepOf(session, layer)?.rule as { missing?: string }).missing);
        });
    });

    it("an algorithm step's setting chip opens the settings and resets the setting, and its output select tests another field", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", {
                kind: "measure",
                algorithm: "louvain",
                field: "community",
                params: { maxIterations: 1 },
            }),
        );
        const measure = (): Extract<RuleTree, { kind: "measure" }> =>
            stepOf(session, layer)?.rule as Extract<RuleTree, { kind: "measure" }>;
        // The chip says the changed setting and opens the settings that hold it.
        await userEvent.click(await within(pane(modal)).findByRole("button", { name: "Max Iterations 1, settings" }));
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".ws-options-rows"), "the settings are open");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector(".ws-options-rows"), "Escape shut them");
        });
        await userEvent.click(within(pane(modal)).getByRole("button", { name: "Reset Max Iterations" }));
        await waitFor(() => {
            assert.notProperty(measure().params ?? {}, "maxIterations", "back to its default");
        });

        const output = within(pane(modal)).getByRole("combobox", { name: "Louvain output" });
        await userEvent.click(output);
        const options = await screen.findAllByRole("option");
        const other = options.find((option) => option.getAttribute("aria-selected") !== "true");
        assert.isDefined(other, "another output to pick");
        await userEvent.click(other);
        await waitFor(() => {
            assert.notStrictEqual(measure().field, "community", "the step tests the picked output");
        });
    });
});
