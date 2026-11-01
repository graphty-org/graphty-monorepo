/**
 * The selection editor as the Data place's import filter (design/ui/selection-groups/spec.md,
 * sections 2 and 9) on the REAL graphty-element and Les Miserables, driven by real clicks and keys:
 * "Add filter" opens a new card with the value picker at once, its first step writes the card,
 * which removes and selects nothing until the step has a test, and outlives a switch of place; Escape twice takes a new card back; the card's
 * Nodes | Edges switch starts it again on edges, its "+" then picking an edge value; a tier 4 condition opens as one group starting
 * All; and while a Filter out card's step is open, what it removes stays drawn faint and still
 * hidden, until Escape.
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

describe("the import filter's cards as selections", () => {
    it("Add filter opens the value picker at once; the first step writes the card, inert until its test", async () => {
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
        assert.notInclude(
            document.querySelector(".sel-editor")?.textContent ?? "",
            "no value",
            "every node has a degree",
        );
        await userEvent.clear(from);
        await userEvent.type(from, "6{Enter}");
        await waitFor(() => {
            const rule = unionOf(session);
            assert.equal(rule?.side, "nodes");
            assert.equal(rule?.within, "graph");
            assert.equal(rule?.branches[0]?.start, "none", "a new card's group starts with no nodes");
            assert.equal(rule?.branches[0]?.steps[0]?.op, "add");
        });
        assert.equal(session.visibility.conditions[0]?.effect, "select", "a card from + starts on Select");
        // The step card stays open on the written card: its box keeps focus.
        await waitFor(() => {
            assert.strictEqual(document.activeElement, screen.getByRole("textbox", { name: "Degree from, number" }));
        });
    });

    it("Escape closes the picker, Escape again takes the new card back", async () => {
        const session = await openData();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector("[role=combobox][aria-label='Find attributes, results']"));
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "New filter" }));
        });
        assert.lengthOf(session.visibility.conditions, 0);
    });

    it("Done on a new card whose step has no test yet keeps the card, folded, across a switch of place", async () => {
        const session = await openData();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree");
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("textbox", { name: "Degree from, number" });
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-editor"), "the card folded");
        });
        assert.lengthOf(session.visibility.conditions, 1, "the element holds it");
        assert.strictEqual(session.visibility.nodes.size, 77, "and it removes nothing");
        await userEvent.click(page.getByRole("button", { name: "Graph", exact: true }));
        await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
        const card = await screen.findByRole("group", { name: /^Degree/ });
        await userEvent.click(within(card).getByRole("button", { name: "Degree" }));
        await waitFor(() => {
            assert.lengthOf(document.querySelectorAll(".sel-step-row[data-row]"), 1, "its step came back");
        });
    });

    it("a new card's Edges switch starts it again on edges", async () => {
        const session = await openData();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        const card = await screen.findByRole("group", { name: "New filter" });
        // The segment's radio is visually hidden: a reader clicks its label.
        await userEvent.click(within(card).getByText("Edges"));
        await userEvent.click(await within(card).findByRole("button", { name: "Add a step: Add" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Self-loops");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const rule = unionOf(session);
            assert.equal(rule?.side, "edges");
            assert.equal(rule?.branches[0]?.steps[0]?.rule.kind, "self-loop");
        });
    });

    it("a tier 4 Filter out opens as one group starting All; while its step is open what it removes is drawn faint", async () => {
        const session = await openData();
        await session.visibility.addCondition({
            id: "busy",
            effect: "exclude",
            rule: { kind: "range", attribute: "graphty.degree", min: 30 },
        });
        await session.styles.settled();
        const visible = session.visibility.summary.visibleNodes;
        const before = valjeanOpacity(session);
        const card = await screen.findByRole("group", { name: /, Filter out$/ });
        await userEvent.click(within(card).getByRole("button", { name: "Degree" }));
        const all = await within(card).findByRole("radio", { name: "All nodes" });
        assert.isTrue((all as HTMLInputElement).checked, "a tier 4 card starts with all nodes");
        const row = await waitFor(() => {
            const found = card.querySelector<HTMLElement>(".sel-step-row[data-row]");
            assert.isNotNull(found);
            return found;
        });
        if (row === null) {
            return;
        }
        await userEvent.click(row.querySelector(".sel-value") ?? row);
        await waitFor(async () => {
            assert.isTrue(session.styles.showingBranches);
            await session.styles.settled();
            assert.strictEqual(valjeanOpacity(session), 0.2, "what the card removes is drawn faint");
        });
        assert.strictEqual(session.visibility.summary.visibleNodes, visible, "and is still filtered out");
        assert.equal(session.visibility.conditions[0]?.rule.kind, "range", "opening it writes nothing");
        row.focus();
        // Escape closes the card, the preview staying while the editor is open (spec 9); Escape
        // again closes the editor and ends it.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(card.querySelector("[data-step-card]"));
        });
        assert.isTrue(session.styles.showingBranches, "the preview stays while the editor is open");
        await userEvent.keyboard("{Escape}");
        await waitFor(async () => {
            assert.isFalse(session.styles.showingBranches);
            await session.styles.settled();
            assert.strictEqual(valjeanOpacity(session), before);
        });
    });
});
