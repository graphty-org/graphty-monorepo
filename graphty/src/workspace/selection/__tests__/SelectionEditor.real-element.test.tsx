/**
 * The selection editor (design/ui/selection-groups/spec.md) on the REAL graphty-element and Les
 * Miserables, driven by real clicks, keys and drags: in a style layer's Which nodes, "+" adds a
 * step and opens the value picker at once, a value with no test is kept and inert, Escape on a
 * step with no value takes it back, a number test written in its box narrows the layer, a flat
 * tier 4 rule opens as one group starting All, Mod+] and a drag reorder steps without changing
 * Start with, a Relative to step takes its reference from the picker, and opening a step card
 * draws the element's picking view until Escape; in a filter card the same editor writes the
 * condition, Hovered or selected is not offered, and the verb menu changes a step's verb. The
 * header's Table opens the table on Matches only with a Group column and keeps focus; a style
 * group's count chip selects its members, a filter's opens the table on them; the style tree's
 * Hover highlight makes the start page's four hover layers from selections.
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
 * A reader's layer, selected in the style tree, its Which nodes editor opened by a click.
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
    await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }));
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
 * The checked choice of the group's Start with segment.
 * @returns "none" or "all".
 */
function startWith(): string | undefined {
    const group = screen.getByRole("radiogroup", { name: /starts with$/ });
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

describe("the selection editor in a style layer", () => {
    it("a fresh layer: + adds Keep, its value picker finds Degree, a value with no test is kept and inert", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Busy", { match: "everything" });
        // A layer of every node reads as what it paints: one group of All, so its row, the
        // folded row and the editor read one count.
        assert.equal(startWith(), "all", "a layer of every node starts with all nodes");
        assert.isNotNull(screen.queryByRole("button", { name: "Select 77 of 77 nodes" }));
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
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
            assert.match(stepRows()[0] ?? "", /^Keep, Degree No test, 77 of 77 nodes so far$/);
        });
        // A number written in its box is the test; Enter commits it, and the layer narrows.
        const from = await screen.findByRole("textbox", { name: "Degree from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "6{Enter}");
        const expected = await counted(session, { kind: "range", attribute: "graphty.degree", min: 6 });
        await waitFor(() => {
            assert.equal(session.styles.counts(layer.id).matched, expected);
        });
        assert.isAbove(expected, 0);
    });

    it("+ then Escape leaves no step, and focus goes back to +", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Nothing", { match: "everything" });
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }));
            assert.isNotNull(document.activeElement?.closest("[data-plus]"), "focus is on +");
        });
        assert.deepEqual(stepRows(), []);
        assert.deepEqual(session.styles.get(layer.id)?.selector, { match: "everything" });
    });

    it("a tier 4 rule opens as one group starting All, with the same count", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Degree card", { match: "rule", where: DEGREE_6_TO_10 });
        assert.equal(startWith(), "all");
        const expected = await counted(session, DEGREE_6_TO_10);
        await waitFor(() => {
            assert.match(
                stepRows()[0] ?? "",
                new RegExp(`^Keep, Degree 6 to 10, ${String(expected)} of 77 nodes so far$`),
            );
        });
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
        assert.equal(startWith(), "all");
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
        const first = document.querySelector<HTMLElement>('[data-row="deg"]');
        assert.isNotNull(first);
        first?.focus();
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
        const deg = document.querySelector<HTMLElement>('[data-row="deg"]');
        const val = document.querySelector<HTMLElement>('[data-row="val"]');
        if (deg === null || val === null) {
            throw new Error("the step rows are drawn");
        }
        await userEvent.dragAndDrop(deg, val);
        await waitFor(() => {
            assert.deepEqual(
                unionOf(session, layer.id)?.branches[0]?.steps.map((step) => step.id),
                ["deg", "val"],
            );
        });
        assert.equal(unionOf(session, layer.id)?.branches[0]?.start, "all");
    });

    it("a Relative to step takes its reference from the picker", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Near Valjean", { match: "everything" });
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Within hops");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.match(stepRows()[0] ?? "", /^Keep, Within 1 hop of No reference/);
        });
        // The new step's card takes focus on its first box: the reference, ready to type into.
        const reference = await screen.findByPlaceholderText("Choose a reference");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, reference);
        });
        await userEvent.keyboard("Valjean");
        await userEvent.click(await screen.findByRole("option", { name: "Valjean" }));
        const id = session.data.nodes().find((each) => session.data.name(each.id) === "Valjean")?.id;
        const expected = await counted(session, {
            kind: "neighborhood",
            seeds: id === undefined ? [] : [id],
            depth: 1,
        });
        await waitFor(() => {
            assert.equal(session.styles.counts(layer.id).matched, expected);
        });
        assert.isAbove(expected, 1);
    });

    it("opening a step card draws the picking view; Escape closes the card, then the editor and the view", async () => {
        const session = await openSample();
        await openLayer(session, "Picked", { match: "rule", where: DEGREE_6_TO_10 });
        assert.isFalse(session.styles.showingBranches);
        const row = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-step-row[data-row]");
            assert.isNotNull(found);
            return found;
        });
        if (row === null) {
            return;
        }
        await userEvent.click(row.querySelector(".sel-value") ?? row);
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches);
        });
        // The key says the styles are suspended, with the group and what matches none.
        const preview = await screen.findByRole("region", { name: "Preview: Which nodes" });
        assert.isNotNull(within(preview).queryByText("No match"));
        // The view is not a layer: the key never lists it.
        const keyed = session.styles.legend().map((block) => block.layerId);
        assert.isFalse(
            keyed.some((id) => id.startsWith("graphty-branches")),
            keyed.join(", "),
        );
        const layers = session.styles.list().length;
        row.focus();
        // Escape closes the card; the preview stays while the editor is open (spec 9). Escape
        // again, with nothing smaller open, closes the editor and ends it.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-step-card]"));
        });
        assert.isTrue(session.styles.showingBranches, "the preview stays while the editor is open");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(session.styles.showingBranches);
            assert.isNull(screen.queryByRole("region", { name: "Preview: Which nodes" }));
        });
        assert.equal(session.styles.list().length, layers, "the layer list is unchanged");
    });
});

describe("the selection editor in a filter card", () => {
    it("edits the condition: a verb picked from the row's menu is written, and Hovered or selected is not offered", async () => {
        const session = await openSample("data");
        await session.visibility.addCondition({ id: "deg", effect: "keep", rule: DEGREE_6_TO_10 });
        const card = await screen.findByRole("group", { name: /, Filter to$/ });
        await userEvent.click(within(card).getByRole("button", { name: "Degree" }));
        const verb = await within(card).findByRole("button", { name: "Verb: Keep" });
        await userEvent.click(verb);
        // The step's own verb is marked, as Figma's boolean menu marks it.
        const current = await screen.findByRole("menuitemradio", { name: "Keep (Intersect)" });
        assert.equal(current.getAttribute("aria-checked"), "true");
        await userEvent.click(await screen.findByRole("menuitemradio", { name: "Except (Subtract)" }));
        await waitFor(() => {
            const rule = session.visibility.conditions[0]?.rule;
            assert.equal(rule?.kind, "union");
            assert.equal((rule as UnionLeaf).within, "graph");
            assert.equal((rule as UnionLeaf).branches[0]?.steps[0]?.op, "except");
        });

        await userEvent.click(within(card).getByRole("button", { name: /^Add a step: / }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Within hops");
        await userEvent.keyboard("{Enter}");
        const reference = await within(card).findByPlaceholderText("Choose a reference");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, reference, "the new step's card focuses its reference");
        });
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
    it("the header's Table opens the table on Matches only with the Group column, focus kept in the editor", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        const total = session.scope.watchSteps(TWO_GROUPS, () => undefined);
        const expected = total.current.total.count;
        total.end();
        const editor = document.querySelector<HTMLElement>(".sel-editor");
        if (editor === null) {
            throw new Error("the editor is open");
        }
        await userEvent.click(within(editor).getByRole("button", { name: "Table" }));
        await waitFor(() => {
            assert.equal(nodeRows(), expected, "only the rows the selection matches");
        });
        assert.isNotNull(screen.queryByRole("columnheader", { name: /^Group/ }));
        const matches = screen.getByRole("radio", { name: "Matches only" });
        assert.isTrue((matches as HTMLInputElement).checked);
        assert.isTrue(editor.contains(document.activeElement), "focus stays in the editor");
        // Every node again, with the reader's one click.
        // The segment's radio is visually hidden: the pointer clicks its label.
        await userEvent.click(within(screen.getByRole("radiogroup", { name: "Rows" })).getByText("All"));
        await waitFor(() => {
            assert.equal(nodeRows(), 77);
        });
        assert.isTrue(editor.isConnected, "the table is part of picking: the editor stays open");
        assert.isNotNull(screen.queryByRole("columnheader", { name: /^Group/ }));
    });

    it("a style group's count chip selects exactly its members", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        const expected = await counted(session, DEGREE_6_TO_10);
        const chip = await screen.findByRole("button", { name: `Select ${String(expected)} of 77 nodes` });
        await userEvent.click(chip);
        await waitFor(() => {
            assert.equal(session.selection.nodes.length, expected);
        });
        // The inspector turns to the selection and the editor goes: focus follows to its heading.
        await waitFor(() => {
            assert.equal(document.activeElement?.id, "ws-inspector-title");
        });
    });

    it("a filter's count chip opens the table on its rows and never selects", async () => {
        const session = await openSample("data");
        // A filter card's header counts the whole card; each group's row has its own chip.
        await session.visibility.addCondition({ id: "deg", effect: "keep", rule: { ...TWO_GROUPS, within: "graph" } });
        const expected = await counted(session, DEGREE_6_TO_10);
        const card = await screen.findByRole("group", { name: /, Filter to$/ });
        await userEvent.click(within(card).getByRole("button", { name: /^Degree/ }));
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
        // Bottom first, in the recipe's order.
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
        document.querySelector<HTMLElement>('[data-row="b"]')?.focus();
        await userEvent.keyboard("{F2}");
        const field = await screen.findByRole("textbox", { name: "Rename B" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        await userEvent.keyboard("Staff");
        await userEvent.click(screen.getByRole("heading", { name: "Which nodes" }));
        await waitFor(() => {
            assert.equal(unionOf(session, layer.id)?.branches[1]?.name, "Staff");
        });
    });

    it("Space on a step's row switches it off; Enter on a group's row selects its members", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        document.querySelector<HTMLElement>('[data-row="deg"]')?.focus();
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.isFalse(unionOf(session, layer.id)?.branches[0]?.steps[0]?.on);
        });
        assert.isFalse(
            screen.getByRole<HTMLInputElement>("checkbox", { name: "Use Degree" }).checked,
            "the on box says it",
        );
        assert.match(
            document.querySelector('[data-row="deg"]')?.getAttribute("aria-label") ?? "",
            /, off$/,
            "and so does the row's name",
        );
        document.querySelector<HTMLElement>('[data-row="b"]')?.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual(
                session.selection.nodes.map((id) => session.data.name(id) ?? String(id)),
                ["Valjean"],
            );
        });
    });

    it("Escape in a step card's box closes the card; the preview stays while the editor is open", async () => {
        const session = await openSample();
        await openLayer(session, "Picked", { match: "rule", where: DEGREE_6_TO_10 });
        const row = document.querySelector<HTMLElement>(".sel-step-row[data-row]");
        await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
        const from = await screen.findByRole("textbox", { name: "Degree from, number" });
        await userEvent.click(from);
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches);
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-step-card]"), "the card closed");
        });
        // Spec 9: the preview ends on Done, Escape with nothing smaller open, or leaving.
        assert.isTrue(session.styles.showingBranches, "the preview stays");
        assert.isNotNull(document.querySelector(".sel-editor"), "the editor stays open");
    });

    it("Or is off once the groups use every color, and pressing it changes nothing", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Six", { match: "rule", where: SIX_GROUPS });
        const or = await screen.findByRole("button", { name: "Or" });
        assert.equal(or.getAttribute("aria-disabled"), "true");
        // Pressed from the keyboard: a pointer cannot press it at all.
        or.focus();
        await userEvent.keyboard("{Enter}");
        assert.lengthOf(unionOf(session, layer.id)?.branches ?? [], 6);
        assert.isNotNull(document.querySelector(".sel-editor"), "the panel is still drawn");
    });
});
