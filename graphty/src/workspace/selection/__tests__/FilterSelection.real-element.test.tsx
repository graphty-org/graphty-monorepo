/**
 * The selection editor as the Data place's import filter (design/ui/selection-groups/spec.md,
 * sections 2 and 9) on the REAL graphty-element and Les Miserables, driven by real clicks and keys:
 * "Add filter" opens a new card, All nodes, with the value picker at once; its first step (Keep)
 * writes the card, which removes nothing until the step has a test, and outlives a switch of
 * place; Escape takes a new card back; the card's Nodes | Edges switch starts it again on edges;
 * no card shows Select, Filter to or Filter out, and "Select N" in its "..." selects exactly its
 * matches; a tier 4 Filter out card opens as All nodes / Except and, while its step is selected,
 * what it removes stays drawn faint and still hidden, until Escape.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Les Miserables in the workspace, on the Data place.
 * @returns The session.
 */
async function openData(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
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
    return session;
}

/**
 * The first condition's rule as a selection.
 * @param session - The session.
 * @returns The union rule, or undefined.
 */
function unionOf(session: GraphSession): UnionLeaf | undefined {
    const rule = session.visibility.conditions[0]?.rule;
    return rule?.kind === "union" ? rule : undefined;
}

/**
 * The opacity Valjean is drawn with.
 * @param session - The session.
 * @returns The opacity.
 */
function valjeanOpacity(session: GraphSession): unknown {
    return (session.styles.explain({ node: "Valjean" }).merged as Record<string, unknown>)["node.opacity"];
}

/**
 * A filter card in the Filters list, by its name.
 * @param name - its name.
 * @returns the card.
 */
async function filterCard(name: RegExp): Promise<HTMLElement> {
    const list = await screen.findByRole("list", { name: "Filters" });
    return within(list).findByRole("group", { name });
}

describe("the import filter's cards as selections", () => {
    it("Add filter opens the value picker at once; the first step writes the card as All + Keep, inert until its test", async () => {
        const session = await openData();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        const search = await screen.findByRole("combobox", { name: "Find attributes, results" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search, "the picker opens with its search focused");
        });
        await userEvent.keyboard("Degree");
        await userEvent.keyboard("{Enter}");
        const from = await screen.findByRole("textbox", { name: "Degree from, number" });
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1, "the first step writes the card");
        });
        assert.strictEqual(session.visibility.nodes.size, 77, "a step with no test removes nothing");
        assert.deepEqual(session.selection.nodes, [], "and selects nothing");
        await userEvent.clear(from);
        await userEvent.type(from, "6{Enter}");
        const kept = (
            await session.scope.count({
                define: {
                    kind: "rule",
                    where: { kind: "range", attribute: "graphty.degree", min: 6 },
                    reading: "clipped",
                },
            })
        ).nodes;
        await waitFor(() => {
            const rule = unionOf(session);
            assert.equal(rule?.side, "nodes");
            assert.equal(rule?.within, "graph");
            assert.equal(rule?.branches[0]?.start, "all", "a new card says what stays: All nodes, then Keep");
            assert.equal(rule?.branches[0]?.steps[0]?.op, "keep");
            assert.strictEqual(session.visibility.nodes.size, kept);
        });
        assert.equal(session.visibility.conditions[0]?.effect, "keep");
    });

    it("Add filter then Escape leaves no card", async () => {
        const session = await openData();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.lengthOf(screen.queryAllByRole("group", { name: /^New filter/ }), 0);
        });
        assert.lengthOf(session.visibility.conditions, 0);
    });

    it("a new card whose step has no test is kept, folded, across a switch of place", async () => {
        const session = await openData();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree");
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("textbox", { name: "Degree from, number" });
        // Escape ends picking, Escape again folds the card.
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-editor"), "the card folded");
        });
        assert.lengthOf(session.visibility.conditions, 1, "the element holds it");
        assert.strictEqual(session.visibility.nodes.size, 77, "and it removes nothing");
        await userEvent.click(page.getByRole("button", { name: "Graph", exact: true }));
        await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
        const card = await filterCard(/degree/i);
        await userEvent.click(within(card).getByRole("button", { name: /^Degree/ }));
        await waitFor(() => {
            assert.lengthOf(document.querySelectorAll(".sel-step-row[data-row]"), 1, "its step came back");
        });
    });

    it("a new card's Edges switch starts it again on edges", async () => {
        const session = await openData();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        const card = await screen.findByRole("group", { name: /^New filter, / });
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        // A click on the card's title closes the value picker and keeps the card, its title pane open.
        await userEvent.click(within(card).getByRole("treeitem", { name: /^New filter, / }));
        // The segment's radio is visually hidden: a reader clicks its label.
        await userEvent.click(await within(card).findByText("Edges"));
        await userEvent.click(await within(card).findByRole("treeitem", { name: "Step..." }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Self-loops");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const rule = unionOf(session);
            assert.equal(rule?.side, "edges");
            assert.equal(rule?.branches[0]?.steps[0]?.rule.kind, "self-loop");
        });
    });

    it("no card shows Select, Filter to or Filter out; Select N in its menu selects exactly its matches", async () => {
        const session = await openData();
        const degree = { kind: "range", attribute: "graphty.degree", min: 10 } as const;
        await session.visibility.addCondition({ id: "busy", effect: "keep", rule: degree });
        const expected = (await session.scope.count({ define: { kind: "rule", where: degree, reading: "clipped" } }))
            .nodes;
        const card = await filterCard(/degree/i);
        await userEvent.click(within(card).getByRole("button", { name: /^Degree/ }));
        const filters = screen.getByRole("list", { name: "Filters" });
        for (const word of ["Select", "Filter to", "Filter out"]) {
            assert.isNull(within(filters).queryByText(word), word);
        }
        await userEvent.click(within(card).getByRole("treeitem", { name: /^Degree min 10, / }));
        await userEvent.click(await within(card).findByRole("button", { name: /^More for / }));
        const items = await screen.findAllByRole("menuitem");
        assert.equal(items[0]?.textContent?.trim().startsWith(`Select ${String(expected)}`), true);
        await userEvent.click(items[0]);
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, expected);
        });
    });

    it("a tier 4 Filter out opens as All nodes / Except; while its step is selected what it removes is drawn faint", async () => {
        const session = await openData();
        await session.visibility.addCondition({
            id: "busy",
            effect: "exclude",
            rule: { kind: "range", attribute: "graphty.degree", min: 30 },
        });
        await session.styles.settled();
        const visible = session.visibility.summary.visibleNodes;
        const before = valjeanOpacity(session);
        const card = await filterCard(/degree/i);
        await userEvent.click(within(card).getByRole("button", { name: /^Degree/ }));
        assert.isNotNull(await within(card).findByRole("treeitem", { name: "All nodes" }));
        const row = await waitFor(() => {
            const found = card.querySelector<HTMLElement>(".sel-step-row[data-row]");
            assert.isNotNull(found);
            return found;
        });
        if (row === null) {
            return;
        }
        assert.match(row.getAttribute("aria-label") ?? "", /^Except, Degree min 30/);
        await userEvent.click(row.querySelector(".sel-value") ?? row);
        await waitFor(async () => {
            assert.isTrue(session.styles.showingBranches);
            await session.styles.settled();
            assert.strictEqual(valjeanOpacity(session), 0.2, "what the card removes is drawn faint");
        });
        assert.strictEqual(session.visibility.summary.visibleNodes, visible, "and is still filtered out");
        assert.equal(session.visibility.conditions[0]?.rule.kind, "range", "selecting it writes nothing");
        row.focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(async () => {
            assert.isFalse(session.styles.showingBranches);
            await session.styles.settled();
            assert.strictEqual(valjeanOpacity(session), before);
        });
    });
});
