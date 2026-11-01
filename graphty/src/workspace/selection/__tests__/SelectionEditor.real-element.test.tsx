/**
 * The selection editor (design/ui/selection-groups/spec.md, section 3) on the REAL graphty-element
 * and Les Miserables, driven by real clicks and keys. In a style layer's Which nodes: the outline
 * is drawn at rest, one line per row, with no control in it; "Condition..." adds a step and opens the
 * value picker at once; a value with no test is kept and reads "No test"; Escape on a step with no
 * value takes it back; a number written in the pane's box narrows the layer; a flat tier 4 rule
 * opens as All nodes and a Keep step; Mod+[ and a drag reorder steps; a Relative to step takes its
 * reference from the picker; selecting a row draws the picking view until Escape. In a filter
 * card: the verb segment writes the verb and Hovered or selected is not offered. The title pane's
 * Table opens the table on Matches only; a group pane's count selects its members (a style layer)
 * or opens the table (a filter); the style tree's Hover highlight makes four hover layers.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, RuleTree, Selector, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * The "Condition..." control: an empty selection's row, else the selected row's pane button.
 * @param scope - where to look.
 * @returns the control.
 */
function conditionControl(scope: HTMLElement = document.body): HTMLElement {
    return (
        within(scope).queryByRole("treeitem", { name: "Condition..." }) ??
        within(scope).getByRole("button", { name: "Condition..." })
    );
}

/**
 * Les Miserables in the workspace.
 * @param place - the place to open on.
 * @returns The session.
 */
async function openSample(place?: "data"): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({
        project: { name: "Untitled", id: 1 },
        ...(place === undefined ? {} : { place }),
    });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * A reader's layer, selected in the style tree: its Which nodes outline is drawn.
 * @param session - The session.
 * @param name - Its name.
 * @param selector - What it picks.
 * @returns The layer.
 */
async function openLayer(session: GraphSession, name: string, selector: Selector): Promise<Layer> {
    const layer = await session.styles.add({ name, target: "node", selector, set: { "node.color": "#d55e00" } });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-editor"));
    });
    return layer;
}

/**
 * A layer's selection as the element holds it.
 * @param session - The session.
 * @param id - The layer.
 * @returns The union rule, or undefined.
 */
function unionOf(session: GraphSession, id: string): UnionLeaf | undefined {
    const selector = session.styles.get(id)?.selector;
    return selector?.match === "rule" && selector.where.kind === "union" ? selector.where : undefined;
}

/**
 * The step rows drawn, top first.
 * @returns their accessible names.
 */
function stepRows(): string[] {
    return [...document.querySelectorAll<HTMLElement>(".sel-step-row[data-row]")].map(
        (row) => row.getAttribute("aria-label") ?? "",
    );
}

/**
 * A row of the outline, by its id.
 * @param id - the row's id.
 * @returns the row.
 */
function row(id: string): HTMLElement {
    const found = document.querySelector<HTMLElement>(`[data-row="${id}"]`);
    if (found === null) {
        throw new Error(`no row ${id}`);
    }
    return found;
}

/**
 * The checked choice of the Start with segment in the pane.
 * @returns "none" or "all".
 */
function startWith(): string | undefined {
    const group = screen.getByRole("radiogroup", { name: "Start with" });
    return (
        within(group)
            .getAllByRole("radio")
            .find((each) => (each as HTMLInputElement).checked)
            ?.getAttribute("value") ?? undefined
    );
}

/**
 * How many nodes a rule holds, as the element counts it.
 * @param session - The session.
 * @param where - The rule.
 * @returns The count.
 */
async function counted(session: GraphSession, where: RuleTree): Promise<number> {
    return (await session.scope.count({ define: { kind: "rule", where, reading: "clipped" } })).nodes;
}

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };

/**
 * A filter card in the Filters list, by its name.
 * @param name - its name.
 * @returns the card.
 */
async function filterCard(name: RegExp): Promise<HTMLElement> {
    const list = await screen.findByRole("list", { name: "Filters" });
    return within(list).findByRole("group", { name });
}

describe("the selection editor in a style layer", () => {
    it("a fresh layer: Condition... adds a Keep step and opens its picker; a value with no test is kept and reads No test", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Busy", { match: "everything" });
        // A layer of every node reads as what it paints: All nodes, and only the verbs that narrow.
        assert.isNotNull(screen.queryByRole("treeitem", { name: "Which nodes, 77 of 77 nodes" }));
        assert.isNotNull(screen.queryByRole("treeitem", { name: "All nodes" }));
        await userEvent.click(conditionControl());
        const search = await screen.findByRole("combobox", { name: "Find attributes, results" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search, "the value picker opens with its search focused");
        });
        await userEvent.keyboard("Degree");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const rule = unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule;
            assert.equal(rule?.kind, "range");
            assert.equal((rule as { attribute?: string }).attribute, "graphty.degree");
            assert.notProperty(rule, "min", "a value with no test yet");
        });
        await waitFor(() => {
            assert.match(stepRows()[0] ?? "", /^Keep, Degree, No test, 77 of 77 nodes so far$/);
        });
        // The new step is selected: its pane holds the test; a number written there narrows the layer.
        const from = await screen.findByRole("textbox", { name: "Degree from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "6{Enter}");
        const expected = await counted(session, { kind: "range", attribute: "graphty.degree", min: 6 });
        await waitFor(() => {
            assert.equal(session.styles.counts(layer.id).matched, expected);
        });
        await waitFor(() => {
            assert.match(stepRows()[0] ?? "", /^Keep, Degree min 6, /, "the row says the test in the boxes' words");
        });
        assert.isAbove(expected, 0);
    });

    it("Condition... then Escape leaves no step, and focus goes back to the Condition row", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Nothing", { match: "everything" });
        await userEvent.click(conditionControl());
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }));
            assert.isNotNull(document.activeElement?.closest(".sel-add-row"), "focus is on the Add row");
        });
        assert.deepEqual(stepRows(), []);
        assert.deepEqual(session.styles.get(layer.id)?.selector, { match: "everything" });
    });

    it("an empty None group's Condition... adds an Add step; a lone verb is said, not a segment of one", async () => {
        const session = await openSample();
        const empty: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [{ start: "none", steps: [] }],
        };
        await openLayer(session, "Empty", { match: "rule", where: empty });
        const verbs = (): (string | null)[] =>
            within(screen.getByRole("radiogroup", { name: "Verb" }))
                .getAllByRole("radio")
                .map((each) => each.getAttribute("value"));
        await userEvent.click(conditionControl());
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Isolated{Enter}");
        await waitFor(() => {
            assert.match(stepRows()[0] ?? "", /^Add, Isolated/);
        });
        // Keep or Except on nothing changes nothing: the first step of a group of none can only add,
        // so its pane says Add and draws no segment of one.
        await waitFor(() => {
            assert.isNull(screen.queryByRole("radiogroup", { name: "Verb" }));
            assert.isNotNull(document.querySelector("[data-step-pane]"));
        });
        await userEvent.click(conditionControl());
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree{Enter}");
        await waitFor(() => {
            assert.match(stepRows()[1] ?? "", /^Add, Degree/);
        });
        await waitFor(() => {
            assert.deepEqual(verbs(), ["add", "keep", "except"]);
        });
    });

    it("a tier 4 rule opens as All nodes and a Keep step, with the same count", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Degree card", { match: "rule", where: DEGREE_6_TO_10 });
        const expected = await counted(session, DEGREE_6_TO_10);
        await waitFor(() => {
            assert.match(
                stepRows()[0] ?? "",
                new RegExp(`^Keep, Degree 6 to 10, ${String(expected)} of 77 nodes so far$`),
            );
        });
        assert.equal(unionOf(session, layer.id)?.branches[0]?.start ?? "all", "all");
        assert.equal(session.styles.counts(layer.id).matched, expected);
    });

    it("a saved tier 4 rule of several cards opens as Keep and Except steps with the same count", async () => {
        const session = await openSample();
        const saved: RuleTree = {
            kind: "all",
            of: [DEGREE_6_TO_10, { kind: "not", of: { kind: "text", reads: "id", mode: "substring", text: "Val" } }],
        };
        const expected = await counted(session, saved);
        const layer = await openLayer(session, "Saved", { match: "rule", where: saved });
        await waitFor(() => {
            const rows = stepRows();
            assert.lengthOf(rows, 2);
            assert.match(rows[0] ?? "", /^Keep, Degree 6 to 10/);
            assert.match(rows[1] ?? "", new RegExp(`^Except, .*${String(expected)} of 77 nodes so far$`));
        });
        assert.equal(session.styles.counts(layer.id).matched, expected);
        assert.deepEqual(
            session.styles.get(layer.id)?.selector,
            { match: "rule", where: saved },
            "opening writes nothing",
        );
    });

    it("Mod+[ and a drag reorder steps; Start with never changes", async () => {
        const session = await openSample();
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    start: "all",
                    steps: [
                        { id: "deg", op: "keep", rule: DEGREE_6_TO_10 },
                        { id: "val", op: "except", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } },
                    ],
                },
            ],
        };
        const layer = await openLayer(session, "Ordered", { match: "rule", where: rule });
        row("deg").focus();
        // Figma's Send backward: Ctrl+[ moves the first step down the list.
        await userEvent.keyboard("{Control>}[[{/Control}");
        await waitFor(() => {
            assert.deepEqual(
                unionOf(session, layer.id)?.branches[0]?.steps.map((step) => step.id),
                ["val", "deg"],
            );
        });
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("data-row"), "deg", "focus follows the moved step");
        });
        await userEvent.dragAndDrop(row("deg"), row("val"));
        await waitFor(() => {
            assert.deepEqual(
                unionOf(session, layer.id)?.branches[0]?.steps.map((step) => step.id),
                ["deg", "val"],
            );
        });
        assert.equal(unionOf(session, layer.id)?.branches[0]?.start, "all");
    });

    it("a Relative to step takes its reference from the picker, as one token", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Near Valjean", { match: "everything" });
        await userEvent.click(conditionControl());
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Within hops");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.match(stepRows()[0] ?? "", /^Keep, Within 2 hops of, No reference/);
        });
        await userEvent.click(await screen.findByRole("button", { name: "Reference" }));
        // With nothing typed the list holds no node: the Nodes heading counts them.
        await screen.findByText("Nodes 77");
        assert.isNull(screen.queryByRole("option", { name: "Valjean" }));
        await userEvent.keyboard("Valjean");
        await userEvent.click(await screen.findByRole("option", { name: "Valjean" }));
        const id = session.data.nodes().find((each) => session.data.name(each.id) === "Valjean")?.id;
        const expected = await counted(session, {
            kind: "neighborhood",
            seeds: id === undefined ? [] : [id],
            depth: 2,
        });
        await waitFor(() => {
            assert.equal(session.styles.counts(layer.id).matched, expected);
        });
        assert.isNotNull(screen.queryByRole("button", { name: "Reference: Valjean" }));
        assert.match(stepRows()[0] ?? "", /^Keep, Within 2 hops of Valjean, /);
        assert.isAbove(expected, 1);
    });

    it("selecting a step row draws the picking view; Escape ends it, the layer list unchanged", async () => {
        const session = await openSample();
        await openLayer(session, "Picked", { match: "rule", where: DEGREE_6_TO_10 });
        assert.isFalse(session.styles.showingBranches);
        const step = document.querySelector<HTMLElement>(".sel-step-row[data-row]");
        if (step === null) {
            throw new Error("a step row is drawn");
        }
        const layers = session.styles.list().length;
        await userEvent.click(step.querySelector(".sel-value") ?? step);
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches);
        });
        // The key says the styles are suspended, with the group and what matches none.
        const preview = await screen.findByRole("region", { name: "Preview: Which nodes" });
        assert.isNotNull(within(preview).queryByText("No match"));
        const keyed = session.styles.legend().map((block) => block.layerId);
        assert.isFalse(
            keyed.some((id) => id.startsWith("graphty-branches")),
            keyed.join(", "),
        );
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(session.styles.showingBranches);
            assert.isNull(document.querySelector("[data-step-pane]"), "the pane closed");
        });
        assert.equal(session.styles.list().length, layers, "the layer list is unchanged");
    });
});

describe("the selection editor in a filter card", () => {
    it("the verb segment writes the verb, and Hovered or selected is not offered", async () => {
        const session = await openSample("data");
        await session.visibility.addCondition({ id: "deg", effect: "keep", rule: DEGREE_6_TO_10 });
        const card = await filterCard(/degree/i);
        await userEvent.click(within(card).getByRole("button", { name: /^Degree/ }));
        // A card named after its only step is its title row: the title pane holds the step's controls.
        const title = await within(card).findByRole("treeitem", { name: /^Degree 6 to 10, / });
        assert.isNull(card.querySelector(".sel-step-row[data-row]"), "no outline under a card that is its recipe");
        await userEvent.click(title.querySelector(".sel-title") ?? title);
        const verbs = await within(card).findByRole("radiogroup", { name: "Verb" });
        // The segment's radio is visually hidden: the pointer clicks its label.
        await userEvent.click(within(verbs).getByText("Except"));
        await waitFor(() => {
            const rule = session.visibility.conditions[0]?.rule;
            assert.equal(rule?.kind, "union");
            assert.equal((rule as UnionLeaf).within, "graph");
            assert.equal((rule as UnionLeaf).branches[0]?.steps[0]?.op, "except");
        });

        await userEvent.click(conditionControl(card));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Within hops");
        await userEvent.keyboard("{Enter}");
        await userEvent.click(await within(card).findByRole("button", { name: "Reference" }));
        const options = (await screen.findAllByRole("option")).map((each) => each.textContent ?? "");
        assert.notInclude(options, "Hovered or selected");
        assert.include(options, "So far");
    });
});

/** Two groups: A, degree 6 to 10 from All; B, Valjean alone. */
const TWO_GROUPS: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        { id: "a", start: "all", steps: [{ id: "deg", op: "keep", rule: DEGREE_6_TO_10 }] },
        {
            id: "b",
            start: "none",
            steps: [{ id: "val", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
        },
    ],
};

/**
 * How many rows the open table's Nodes grid lists, its header row left out. Read afresh each time:
 * a new scope draws a new grid.
 * @returns the count, or -1 while no grid is drawn.
 */
function nodeRows(): number {
    const grid = screen.queryByRole("grid", { name: "Nodes" });
    return grid === null ? -1 : Number(grid.getAttribute("aria-rowcount")) - 1;
}

describe("the selection editor and the table", () => {
    it("the title pane's Table item opens the table on Matches only with the Group column, focus kept in the editor", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        const total = session.scope.watchSteps(TWO_GROUPS, () => undefined);
        const expected = total.current.total.count;
        total.end();
        const editor = document.querySelector<HTMLElement>(".sel-editor");
        if (editor === null) {
            throw new Error("the editor is drawn");
        }
        await userEvent.click(within(editor).getByRole("treeitem", { name: /^Which nodes, / }));
        await userEvent.click(within(editor).getByRole("button", { name: /^More for / }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Table/ }));
        await waitFor(() => {
            assert.equal(nodeRows(), expected, "only the rows the selection matches");
        });
        assert.isNotNull(screen.queryByRole("columnheader", { name: /^Group/ }));
        const matches = screen.getByRole("radio", { name: "Matches only" });
        assert.isTrue((matches as HTMLInputElement).checked);
        assert.isTrue(editor.contains(document.activeElement), "focus stays in the editor");
        await userEvent.click(within(screen.getByRole("radiogroup", { name: "Rows" })).getByText("All"));
        await waitFor(() => {
            assert.equal(nodeRows(), 77);
        });
        assert.isNotNull(screen.queryByRole("columnheader", { name: /^Group/ }));
    });

    it("a style group's count selects exactly its members", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        const expected = await counted(session, DEGREE_6_TO_10);
        await userEvent.click(row("a"));
        const chip = await screen.findByRole("button", { name: `Select ${String(expected)} of 77 nodes` });
        await userEvent.click(chip);
        await waitFor(() => {
            assert.equal(session.selection.nodes.length, expected);
        });
    });

    it("a filter group's count opens the table on its rows and never selects", async () => {
        const session = await openSample("data");
        await session.visibility.addCondition({ id: "deg", effect: "keep", rule: { ...TWO_GROUPS, within: "graph" } });
        const expected = await counted(session, DEGREE_6_TO_10);
        const card = await filterCard(/degree/i);
        await userEvent.click(within(card).getByRole("button", { name: /^Degree/ }));
        await userEvent.click(await waitFor(() => row("a")));
        await userEvent.click(
            await within(card).findByRole("button", { name: `Show ${String(expected)} of 77 nodes in the table` }),
        );
        await waitFor(() => {
            assert.equal(nodeRows(), expected, "only the rows it counts");
        });
        assert.deepEqual(session.selection.nodes, []);
    });
});

describe("the hover highlight template", () => {
    it("adds four layers built from selections that match nothing until a node is in focus", async () => {
        const session = await openSample();
        const before = session.styles.list().length;
        await userEvent.click(await screen.findByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Hover highlight" }));
        await waitFor(() => {
            assert.equal(session.styles.list().length, before + 4);
        });
        const names = ["Fade nodes", "Fade edges", "Its edges", "Halo"];
        const made = session.styles.list().filter((layer) => names.includes(layer.name));
        assert.deepEqual(
            made.map((layer) => layer.name),
            names,
        );
        for (const layer of made) {
            assert.equal(layer.selector.match === "rule" ? layer.selector.where.kind : "", "union", layer.name);
        }
        await session.styles.settled();
        assert.deepEqual(
            made.map((layer) => session.styles.counts(layer.id).matched),
            [0, 0, 0, 0],
            "nothing hovered or selected",
        );
        const valjean = session.data.nodes().find((each) => session.data.name(each.id) === "Valjean")?.id;
        if (valjean === undefined) {
            throw new Error("Valjean is in the sample");
        }
        await session.selection.apply({ nodes: [valjean] });
        const near = await counted(session, { kind: "neighborhood", seeds: [valjean], depth: 1 });
        await waitFor(() => {
            assert.equal(session.styles.counts(made[3].id).matched, 1, "the halo rings Valjean");
            assert.equal(session.styles.counts(made[0].id).matched, 77 - near, "the rest fade");
        });
    });
});

/** Six groups: the default branch palette's size. */
const SIX_GROUPS: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: ["a", "b", "c", "d", "e", "f"].map((id) => ({
        id,
        start: "none" as const,
        steps: [{ id: `s${id}`, op: "add" as const, rule: DEGREE_6_TO_10 }],
    })),
};

describe("the selection editor's keys, names and limits", () => {
    it("a group's rename starts with its name selected and keeps what was typed on a click away", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        row("b").focus();
        await userEvent.keyboard("{F2}");
        const field = await screen.findByRole("textbox", { name: "Rename B" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        await userEvent.keyboard("Staff");
        await userEvent.click(screen.getByRole("treeitem", { name: /^Which nodes, / }));
        await waitFor(() => {
            assert.equal(unionOf(session, layer.id)?.branches[1]?.name, "Staff");
        });
    });

    it("Space on a step's row switches it off and the row says Off; Enter moves into the pane", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        row("deg").focus();
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.isFalse(unionOf(session, layer.id)?.branches[0]?.steps[0]?.on);
        });
        await waitFor(() => {
            assert.match(row("deg").getAttribute("aria-label") ?? "", /, Off, /);
        });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest("[data-step-pane]"), "focus is in the step's pane");
        });
    });

    it("Escape in a pane's box ends picking and keeps the box's text", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Picked", { match: "rule", where: DEGREE_6_TO_10 });
        await userEvent.click(document.querySelector(".sel-step-row .sel-value") ?? document.body);
        const from = await screen.findByRole("textbox", { name: "Degree from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "7");
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches);
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-step-pane]"), "the pane closed");
            assert.isFalse(session.styles.showingBranches, "the preview ended");
        });
        const steps = unionOf(session, layer.id)?.branches[0]?.steps;
        assert.equal((steps?.[0]?.rule as { min?: number } | undefined)?.min, 7);
    });

    it("Or... is off once the groups use every color, and pressing it changes nothing", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Six", { match: "rule", where: SIX_GROUPS });
        await userEvent.click(screen.getByRole("treeitem", { name: /^Which nodes, / }));
        const or = await screen.findByRole("button", { name: "Or..." });
        assert.equal(or.getAttribute("aria-disabled"), "true");
        await userEvent.click(or);
        assert.lengthOf(unionOf(session, layer.id)?.branches ?? [], 6);
    });
});

describe("the outline at rest (the owner's review of 2026-11-01)", () => {
    it("draws no button, box or input at rest, one 32 px line per row, every value at one x", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        // The pointer leaves the editor: nothing is hovered, nothing selected.
        await userEvent.hover(screen.getByRole("tree", { name: "Style layers" }));
        const editor = document.querySelector<HTMLElement>(".sel-editor");
        if (editor === null) {
            throw new Error("the editor is drawn");
        }
        await waitFor(() => {
            const shown = [...editor.querySelectorAll<HTMLElement>("button, input, [role=checkbox]")].filter(
                (each) => each.getClientRects().length > 0,
            );
            assert.deepEqual(
                shown.map((each) => each.getAttribute("aria-label") ?? each.textContent),
                [],
            );
        });
        for (const each of editor.querySelectorAll<HTMLElement>(".sel-row")) {
            assert.isAtMost(each.getBoundingClientRect().height, 32, each.textContent ?? "");
        }
        const x = [...editor.querySelectorAll<HTMLElement>(".sel-step-row .sel-value")].map(
            (each) => each.getBoundingClientRect().left,
        );
        assert.lengthOf(new Set(x), 1, "every value name starts at the same x");
        // No "+" inside a selection: "+" adds only in a section header.
        assert.notInclude(editor.textContent ?? "", "+");
    });
});

describe("the outline under the pointer (the owner's review, repolish 1)", () => {
    it("pointing at a group or a step adds no row and moves nothing; the editor keeps its height", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        await userEvent.hover(screen.getByRole("tree", { name: "Style layers" }));
        const editor = document.querySelector<HTMLElement>(".sel-editor");
        if (editor === null) {
            throw new Error("the editor is drawn");
        }
        const boxes = (): string[] =>
            [...editor.querySelectorAll<HTMLElement>("[data-row]")].map((each) => {
                const box = each.getBoundingClientRect();
                return `${each.dataset.row ?? ""}@${String(Math.round(box.top))}`;
            });
        const before = boxes();
        const { height } = editor.getBoundingClientRect();
        for (const id of ["a", "deg", "b"]) {
            await userEvent.hover(row(id));
            assert.deepEqual(boxes(), before, `pointing at ${id}`);
            assert.equal(editor.getBoundingClientRect().height, height, `pointing at ${id}`);
        }
        assert.isNull(screen.queryByRole("treeitem", { name: "Condition..." }), "no Condition row on hover");
        assert.isNull(screen.queryByRole("button", { name: "Or..." }), "no Or... on hover");
    });

    it("Enter on a selected step puts focus in its pane; the outline's arrows then stay in the outline", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        row("a").focus();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("data-row"), "deg");
            assert.isNotNull(document.querySelector('[data-step-pane="deg"]'), "arrowing onto it selects it");
        });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest(".sel-pane-box"), "focus is in the pane");
        });
        row("deg").focus();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest(".sel-outline"), "focus stays in the outline");
        });
    });

    it("every control in the outline is inside a tree item, and Done ends picking in one click", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        await userEvent.click(row("deg").querySelector(".sel-value") ?? row("deg"));
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches);
        });
        const tree = document.querySelector<HTMLElement>(".sel-outline");
        const loose = [...(tree?.querySelectorAll<HTMLElement>("button, input") ?? [])].filter(
            (each) => each.closest("[role=treeitem]") === null,
        );
        assert.deepEqual(
            loose.map((each) => each.textContent),
            [],
        );
        assert.isNull(screen.queryByRole("treeitem", { name: "Condition..." }), "the outline holds only recipe rows");
        assert.isNotNull(
            within(document.querySelector<HTMLElement>(".sel-pane-box") ?? document.body).queryByRole("button", {
                name: "Condition...",
            }),
            "the pane's first row adds a condition to the step's group",
        );
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isFalse(session.styles.showingBranches, "the preview ended");
            assert.isNull(document.querySelector("[data-step-pane]"), "the pane closed");
        });
    });

    it("Start with is in a group's Advanced, drawn with its caption, and never in the title pane", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        await userEvent.click(screen.getByRole("treeitem", { name: /^Which nodes, / }));
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-pane-box"));
        });
        assert.isNull(screen.queryByRole("radiogroup", { name: "Start with" }), "not in the title pane");
        await userEvent.click(row("a").querySelector(".sel-value") ?? row("a"));
        assert.isNull(screen.queryByText("Start with"), "collapsed at first");
        await userEvent.click(await screen.findByRole("button", { name: /^Advanced/ }));
        assert.equal(startWith(), "all");
        const pane = document.querySelector<HTMLElement>(".sel-pane-box");
        assert.isNotNull(pane === null ? null : within(pane).queryByText("Start with"));
    });
});
