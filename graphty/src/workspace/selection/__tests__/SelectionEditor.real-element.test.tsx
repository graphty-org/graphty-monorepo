/**
 * The selection editor (design/ui/selection-groups/spec.md) on the REAL graphty-element and Les
 * Miserables, driven by real clicks, keys and drags: in a style layer's Which nodes, "+" adds a
 * step and opens the value picker at once, a value with no test is kept and inert, Escape on a
 * step with no value takes it back, a number test written in its box narrows the layer, a flat
 * tier 4 rule opens as one group starting All, Mod+] and a drag reorder steps without changing
 * Start with, a Relative to step takes its reference from the picker, and opening a step card
 * draws the element's picking view until Escape; in a filter card the same editor writes the
 * condition, Hovered or selected is not offered, and the verb menu changes a step's verb.
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
    it("a fresh layer: + adds Add, its value picker finds Degree, a value with no test is kept and inert", async () => {
        const session = await openSample();
        const layer = await openLayer(session, "Busy", { match: "everything" });
        assert.equal(startWith(), "none", "a new selection's first group starts with no nodes");
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Add" }));
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
            assert.match(stepRows()[0] ?? "", /^Add, Degree No test, 0 of 77 nodes so far$/);
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
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Add" }));
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

    it("Mod+] and a drag reorder steps; Start with never changes", async () => {
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
        await userEvent.keyboard("{Control>}]{/Control}");
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
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Add" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Within hops");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.match(stepRows()[0] ?? "", /^Add, Within 1 hop of No reference/);
        });
        const reference = await screen.findByPlaceholderText("Choose a reference");
        await userEvent.click(reference);
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

    it("opening a step card draws the picking view; Escape ends it", async () => {
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
        // The view is not a layer: the key never lists it.
        const keyed = session.styles.legend().map((block) => String(block.layerId));
        assert.isFalse(
            keyed.some((id) => id.startsWith("graphty-branches")),
            keyed.join(", "),
        );
        const layers = session.styles.list().length;
        row.focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(session.styles.showingBranches);
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
        await userEvent.click(await screen.findByRole("menuitem", { name: "Except (Subtract)" }));
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
        await userEvent.click(await within(card).findByPlaceholderText("Choose a reference"));
        const options = (await screen.findAllByRole("option")).map((each) => each.textContent ?? "");
        assert.notInclude(options, "Hovered or selected");
        assert.include(options, "So far");
    });
});
