/**
 * Every picker of the selection editor on a generated graph of 50,000 nodes (graph-samples' LFR
 * benchmark, about 5,000 communities), on the REAL graphty-element, driven by real clicks and keys
 * (design/ui/selection-groups/spec.md, section 4.3): no list grows with the graph. The reference
 * picker lists no node before typing and at most 8 after; "While ... has nodes" takes one
 * reference shown as one token; the category checklist draws at most 8 rows, "Check N" ticks a
 * search's matches and the row summarizes them; the value picker lists columns and algorithms,
 * never values.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The generated graph's size. */
const NODES = 50_000;

/**
 * The workspace on a generated graph of 50,000 nodes whose `community` column is a category.
 * @returns The session.
 */
async function openGenerated(): Promise<GraphSession> {
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
    await session.data.generate("lfr", {
        n: NODES,
        minDegree: 2,
        maxDegree: 8,
        degreeExponent: 2.5,
        minCommunity: 5,
        maxCommunity: 15,
        communityExponent: 1.5,
        mixing: 0.1,
        seed: 1,
    });
    await session.data.setType({ kind: "node", name: "community" }, "category");
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * A layer on a selection, selected in the style tree: its outline is drawn.
 * @param session - The session.
 * @param name - Its name.
 * @param rule - Its selection.
 * @returns The layer.
 */
async function openLayer(session: GraphSession, name: string, rule: UnionLeaf): Promise<Layer> {
    const layer = await session.styles.add({
        name,
        target: "node",
        selector: { match: "rule", where: rule },
        set: { "node.color": "#d55e00" },
    });
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-editor"));
    });
    return layer;
}

/**
 * One step from All nodes.
 * @param id - the step's id.
 * @param stepRule - its rule.
 * @returns the selection.
 */
const oneStep = (id: string, stepRule: UnionLeaf["branches"][number]["steps"][number]["rule"]): UnionLeaf => ({
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [{ start: "all", steps: [{ id, op: "keep", rule: stepRule }] }],
});

/**
 * Selects a step's row by a click, so its pane is drawn.
 * @param id - the step's id.
 */
async function selectStep(id: string): Promise<void> {
    const row = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-row="${id}"]`);
        assert.isNotNull(found);
        return found;
    });
    await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
    await waitFor(() => {
        assert.isNotNull(document.querySelector(`[data-step-pane="${id}"]`));
    });
}

/**
 * The open reference list's options, and its group headings.
 * @returns their words.
 */
function listed(): { options: string[]; headings: string[] } {
    const list = document.querySelector<HTMLElement>('[role=listbox][aria-label="References"]');
    return {
        options: [...(list?.querySelectorAll<HTMLElement>("[role=option]") ?? [])].map(
            (each) => each.textContent ?? "",
        ),
        headings: [...(list?.querySelectorAll<HTMLElement>(".cm-listbox-group-label") ?? [])].map(
            (each) => each.textContent ?? "",
        ),
    };
}

describe("the selection editor on 50,000 nodes", () => {
    it("the reference picker lists no node before typing, and at most 8 after", async () => {
        const session = await openGenerated();
        await openLayer(session, "Near", oneStep("near", { kind: "hops", max: 2 }));
        await selectStep("near");
        await userEvent.click(await screen.findByRole("button", { name: "Reference" }));
        await waitFor(() => {
            assert.include(listed().headings, "Nodes 50,000");
        });
        assert.isTrue(
            listed().options.every(
                (each) =>
                    ["Pick on canvas", "Hovered or selected", "So far"].includes(each) || each.startsWith("Selected"),
            ),
            listed().options.join(", "),
        );
        await userEvent.keyboard("12");
        await waitFor(() => {
            const nodes = listed().headings.find((each) => each.startsWith("Nodes"));
            assert.match(nodes ?? "", /^Nodes 8 of [\d,]+$/);
        });
        assert.isAtMost(listed().options.length, 4 + 8);
        // A graph with no label column is searched in every column (spec 4.3), so the node whose id
        // is exactly what was typed comes first.
        const live = ["Pick on canvas", "Hovered or selected", "So far"];
        const nodes = listed().options.filter((each) => !live.includes(each) && !each.startsWith("Selected"));
        assert.strictEqual(nodes[0], "12", nodes.join(", "));
        await userEvent.keyboard("{Escape}");
    });

    it("While has nodes takes one reference, shown as one token", async () => {
        const session = await openGenerated();
        await openLayer(session, "While", oneStep("while", { kind: "nonempty" }));
        await selectStep("while");
        await userEvent.click(await screen.findByRole("button", { name: "Reference" }));
        await userEvent.click(await screen.findByRole("option", { name: "Selected (0)" }));
        await waitFor(() => {
            assert.match(
                document.querySelector('[data-row="while"]')?.getAttribute("aria-label") ?? "",
                /^Keep, While Selected \(0\) has nodes, /,
            );
        });
        assert.isNotNull(screen.queryByRole("button", { name: "Reference: Selected (0)" }));
    });

    it("the category checklist draws at most 8 rows; Check N ticks a search's matches and the row summarizes them", async () => {
        const session = await openGenerated();
        const layer = await openLayer(
            session,
            "Communities",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        await selectStep("com");
        const values = await screen.findByRole("group", { name: "community values" });
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 9, "8 values and (no value) at most");
        const search = screen.getByRole("textbox", { name: "Search community" });
        assert.match(search.getAttribute("placeholder") ?? "", /^Search [\d,]+$/);
        await userEvent.type(search, "1");
        const check = await screen.findByRole("button", { name: /^Check [\d,]+$/ });
        const matches = Number((check.textContent ?? "").replace(/\D/g, ""));
        assert.isAbove(matches, 8);
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 8);
        await userEvent.click(check);
        await waitFor(() => {
            const steps = session.styles.get(layer.id)?.selector;
            const rule = steps?.match === "rule" && steps.where.kind === "union" ? steps.where : undefined;
            const step = rule?.branches[0]?.steps[0]?.rule as { values?: unknown[] } | undefined;
            assert.lengthOf(step?.values ?? [], matches);
        });
        await userEvent.clear(search);
        await waitFor(() => {
            assert.isNotNull(screen.queryByText(`${(matches - 6).toLocaleString("en-US")} more checked`));
        });
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 9);
        assert.match(
            document.querySelector('[data-row="com"]')?.getAttribute("aria-label") ?? "",
            new RegExp(`and ${(matches - 2).toLocaleString("en-US")} more`),
        );
    });

    it("a 5,000-value checklist never re-sorts under the pointer; the order changes only on a search (check 43)", async () => {
        const session = await openGenerated();
        await openLayer(
            session,
            "Still",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        await selectStep("com");
        const values = await screen.findByRole("group", { name: "community values" });
        const boxes = (): HTMLElement[] => within(values).getAllByRole("checkbox");
        const order = (): string[] =>
            boxes().map((box) => box.getAttribute("aria-label") ?? box.closest("label")?.textContent ?? "");
        const tops = (): number[] => boxes().map((box) => Math.round(box.getBoundingClientRect().top));
        const before = order();
        const beforeTops = tops();
        await userEvent.hover(boxes()[2]);
        for (const at of [2, 3, 4]) {
            await userEvent.click(boxes()[at]);
        }
        await waitFor(() => {
            assert.lengthOf(
                boxes().filter((box) => (box as HTMLInputElement).checked),
                3,
            );
        });
        assert.deepEqual(order(), before, "every row stayed where it was");
        assert.deepEqual(tops(), beforeTops);
        const search = screen.getByRole("textbox", { name: "Search community" });
        await userEvent.type(search, "1");
        await userEvent.clear(search);
        await waitFor(() => {
            assert.notDeepEqual(order(), before, "a search sets the order again: the checked first");
        });
        assert.isTrue(
            boxes()
                .slice(0, 3)
                .every((box) => (box as HTMLInputElement).checked),
        );
    });

    it("the Links picker lists the edge columns, never values (fix 1 on 50,000 nodes)", async () => {
        const session = await openGenerated();
        await openLayer(session, "Linked", oneStep("deg", { kind: "range", attribute: "graphty.degree", min: 3 }));
        await selectStep("deg");
        const pane = document.querySelector<HTMLElement>('[data-step-pane="deg"]');
        if (pane === null) {
            throw new Error("the pane is drawn");
        }
        await userEvent.click(within(pane).getByRole("button", { name: /^Advanced/ }));
        const links = await within(pane).findByRole("radiogroup", { name: "Links" });
        await userEvent.click(within(links).getByText("Links where ..."));
        await userEvent.click(await within(pane).findByRole("button", { name: "Link value: none" }));
        await screen.findByRole("combobox", { name: "Find edge attributes" });
        // The generated graph's edges carry no column: the list is the edge columns, here none,
        // and never a value of the 99,000 edges.
        assert.isBelow(screen.queryAllByRole("option").length, 50);
        await userEvent.keyboard("{Escape}");
        assert.isUndefined(
            (session.styles.list().find((layer) => layer.name === "Linked")?.selector as { where?: UnionLeaf }).where
                ?.branches[0]?.steps[0]?.links,
            "nothing picked, no links written",
        );
    });

    it("the value picker lists columns and algorithms, never values", async () => {
        const session = await openGenerated();
        await openLayer(session, "Values", oneStep("deg", { kind: "range", attribute: "graphty.degree", min: 3 }));
        await selectStep("deg");
        await userEvent.click(await screen.findByRole("button", { name: /^Value: / }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        const options = await screen.findAllByRole("option");
        assert.isBelow(options.length, 200);
        await userEvent.keyboard("{Escape}");
    });
});
