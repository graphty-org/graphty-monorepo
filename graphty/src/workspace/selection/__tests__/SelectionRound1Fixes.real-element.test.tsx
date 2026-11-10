/**
 * Tier 5 round 1's fix pass (design/ui/studio/tier5/rounds/round-1/insights.md) on the REAL
 * graphty-element and Les Miserables, driven by real clicks and keys: a filter step picked from a
 * run over what was showing stays bound to that run and says so; By position says which end and
 * in what it counts, and claims no limit it does not apply; "Is exactly" takes on an empty text
 * step; Clear then Escape (or Done) on a reopened filter card keeps the card; the empty Fill box
 * says what it takes and its picker stays open over the first pick; a new Or group shows no "0";
 * the add buttons say And... and Or...; Tab past the workspace's last control reaches its header,
 * which is an F6 stop, and Done shows Escape as its key.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { tooltipOf } from "../../../test/tooltip";
import { tabStops } from "../../frame/focus";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace.
 * @param place - the place it opens on.
 * @returns The session.
 */
async function openSample(place: "graph" | "data" = "graph"): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place });
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
 * The open workspace, waited for.
 * @returns it.
 */
async function opened(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        assert.notStrictEqual(found?.style.visibility, "hidden", "and placed");
        return found;
    });
}

/**
 * A filter card's rule as a selection.
 * @param session - The session.
 * @param at - which card.
 * @returns The union rule, or undefined.
 */
function unionOf(session: GraphSession, at = 0): UnionLeaf | undefined {
    const rule = session.visibility.conditions[at]?.rule;
    return rule?.kind === "union" ? rule : undefined;
}

/**
 * A reader's layer on everything, selected in the style tree.
 * @param session - The session.
 * @param name - Its name.
 * @param set - What it sets.
 * @param where - Its selection, or everything.
 * @returns The layer's id.
 */
async function openLayer(
    session: GraphSession,
    name: string,
    set: Record<string, unknown>,
    where?: UnionLeaf,
): Promise<string> {
    const { id } = await session.styles.add({
        name,
        target: "node",
        selector: where === undefined ? { match: "everything" } : { match: "rule", where },
        set,
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return id;
}

/** Opens the selected layer's workspace with the sidebar's Edit. */
async function edit(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: /^Edit Which nodes/ }));
    return opened();
}

/** A filter card with one step, degree at least `min`. */
const degreeCard = (min: number): UnionLeaf => ({
    kind: "union",
    side: "nodes",
    within: "graph",
    branches: [{ start: "all", steps: [{ op: "keep", rule: { kind: "range", attribute: "graphty.degree", min } }] }],
});

/** Reopens the Filters card `Degree min N` in its workspace. */
async function reopenDegree(min: number): Promise<HTMLElement> {
    const edit = new RegExp(`^Edit Degree min ${String(min)}`);
    // A card left open after Done shows its Edit; a collapsed one opens first.
    if (screen.queryByRole("button", { name: edit }) === null) {
        await userEvent.click(await screen.findByRole("button", { name: new RegExp(`Degree min ${String(min)}`) }));
    }
    await userEvent.click(await screen.findByRole("button", { name: edit }));
    return opened();
}

describe("a filter step picked from a run's results", () => {
    // Insight 2: after a run over the 112 nodes showing, the step read a new whole-graph run.
    it("never reads a run over the visible graph: a filter would move the run it reads", async () => {
        const session = await openSample("data");
        await session.visibility.addCondition({ effect: "keep", rule: degreeCard(10) });
        const showing = session.visibility.nodes.size;
        assert.isBelow(showing, 77);
        // What Analyze's Run does on a filtered graph: a run over what is showing.
        const run = session.runs.start("components", {}, { scope: "visible", style: false });
        await run;
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Connected");
        const options = await screen.findAllByRole("option");
        assert.isFalse(
            options.some((each) => (each.textContent ?? "").includes(`${String(showing)} showing`)),
            "the run over what is showing is not offered to a filter",
        );
        // graphty-element refuses such a condition outright, so no other door writes one either.
        let refused = "";
        try {
            await session.visibility.addCondition({
                effect: "keep",
                rule: {
                    kind: "union",
                    side: "nodes",
                    within: "graph",
                    branches: [
                        {
                            start: "none",
                            steps: [
                                {
                                    op: "add",
                                    rule: {
                                        kind: "measure",
                                        algorithm: "components",
                                        field: "component",
                                        scope: "visible",
                                    },
                                },
                            ],
                        },
                    ],
                },
            });
        } catch (error) {
            refused = (error as { code?: string }).code ?? "";
        }
        assert.strictEqual(refused, "E_BAD_COMMAND");
        assert.lengthOf(session.visibility.conditions, 1, "only the degree card");
    });
});

describe("By position", () => {
    // Insight 4: one box with "of all nodes", and an error built from a default of 10.
    it("says which end and in what it counts, and an untouched one claims no limit", async () => {
        const session = await openSample("data");
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree{Enter}");
        const ws = await opened();
        await userEvent.click(await within(ws).findByRole("combobox", { name: "Degree test" }));
        await userEvent.click(await screen.findByRole("option", { name: "By position" }));
        const count = await within(ws).findByRole("textbox", { name: "Degree: how many" });
        await userEvent.type(count, "top 5{Enter}");
        const alert = await within(ws).findByRole("alert");
        assert.notInclude(alert.textContent ?? "", "highest 10", "no limit the step does not apply");
        assert.include(alert.textContent ?? "", "The step keeps everything until a count is typed.");
        await userEvent.click(within(ws).getByRole("combobox", { name: "Degree: which end" }));
        await userEvent.click(await screen.findByRole("option", { name: "Bottom" }));
        await userEvent.click(within(ws).getByRole("combobox", { name: "Degree: count or percent" }));
        await userEvent.click(await screen.findByRole("option", { name: "% of nodes" }));
        const percent = await within(ws).findByRole("textbox", { name: "Degree: what percent" });
        await userEvent.clear(percent);
        await userEvent.type(percent, "10{Enter}");
        await waitFor(() => {
            const step = unionOf(session)?.branches[0]?.steps[0]?.rule;
            assert.deepInclude(step as object, { kind: "threshold", percentile: 10, from: "low" });
        });
    });
});

describe("a text step", () => {
    // Insight 6: choosing "Is exactly" before typing left the step on Contains.
    it("takes Is exactly before any text, and keeps it for the text typed after", async () => {
        const session = await openSample("data");
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Node id{Enter}");
        const ws = await opened();
        const how = await within(ws).findByRole("combobox", { name: "Node id: how to match" });
        await userEvent.click(how);
        await userEvent.click(await screen.findByRole("option", { name: "Is exactly" }));
        await waitFor(() => {
            assert.strictEqual(
                within(ws).getByRole<HTMLInputElement>("combobox", { name: "Node id: how to match" }).value,
                "Is exactly",
            );
        });
        await userEvent.type(within(ws).getByRole("combobox", { name: "Node id: text to match" }), "Valjean{Enter}");
        await waitFor(() => {
            const step = unionOf(session)?.branches[0]?.steps[0]?.rule;
            assert.deepInclude(step as object, { kind: "text", mode: "exact", text: "Valjean" });
        });
    });
});

describe("Clear on a reopened filter card", () => {
    /**
     * A card made with Add filter, Degree from `min`, closed with Done and opened again.
     * @param session - the session.
     * @param min - its bound.
     * @returns the reopened workspace.
     */
    async function madeAndReopened(session: GraphSession, min: number): Promise<HTMLElement> {
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree{Enter}");
        const from = await within(await opened()).findByRole("textbox", { name: "Degree from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, `${String(min)}{Enter}`);
        await userEvent.click(within(await opened()).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "the workspace closed");
            assert.isTrue(session.visibility.conditions.length > 0);
        });
        return reopenDegree(min);
    }

    // Insight 7: Clear then Escape said "Filter not added" and took a saved card away.
    it("then Escape keeps the card, and so does Clear then Done", async () => {
        const session = await openSample("data");
        let ws = await madeAndReopened(session, 6);
        await userEvent.click(within(ws).getByRole("button", { name: "Clear" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        // Escape closes the innermost thing per press, and last the workspace, as Done: the
        // saved card stays, at All nodes.
        for (let press = 0; press < 5 && document.querySelector(".sel-ws") !== null; press++) {
            await userEvent.keyboard("{Escape}");
        }
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "the workspace closed");
        });
        assert.lengthOf(session.visibility.conditions, 1, "Escape kept the card");
        ws = await madeAndReopened(session, 3);
        await userEvent.click(within(ws).getByRole("button", { name: "Clear" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "the workspace closed");
        });
        assert.lengthOf(session.visibility.conditions, 2, "Done kept the card");
    });
});

describe("the empty Fill color box", () => {
    // Insight 5: an empty box with no cue, whose picker closed on its first click.
    it("says what it takes, and its picker stays open over the first pick", async () => {
        const session = await openSample();
        const id = await openLayer(session, "Unpainted", { "node.size": 2 });
        await userEvent.click(await screen.findByRole("button", { name: "Add to node fill" }));
        const box = await waitFor(() => {
            const found = document.querySelector<HTMLInputElement>('[data-line="node.color"] input');
            assert.isNotNull(found);
            return found;
        });
        assert.strictEqual(box?.placeholder, "Pick or type");
        await userEvent.click(await screen.findByRole("button", { name: /^Pick node color/ }));
        const field = await screen.findByTestId("color-picker-saturation");
        const at = field.getBoundingClientRect();
        await userEvent.click(field, { position: { x: at.width * 0.8, y: at.height * 0.3 } });
        await waitFor(() => {
            assert.isString(session.styles.get(id)?.set?.["node.color"], "the pick is written");
        });
        assert.isNotNull(screen.queryByTestId("color-picker-saturation"), "the picker is still open");
    });
});

/** Two groups: A, degree 10 or more; B, Valjean alone. */
const TWO: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            name: "A",
            start: "none",
            steps: [{ id: "a1", op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 10 } }],
        },
        {
            id: "b",
            name: "B",
            start: "none",
            steps: [{ id: "b1", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
        },
    ],
};

describe("the workspace's calm first states and its header", () => {
    // Bar 9: a just-added Or group read "C 0" with its untouched range drawn full; the root cause
    // was graphty-element reading an unbounded range as inert, and now both say every node.
    it("a new Or group's Degree step counts at once and lights every bar, as its untouched slider shows", async () => {
        const session = await openSample();
        await openLayer(session, "Calm", { "node.color": "#d55e00" }, TWO);
        const ws = await edit();
        await userEvent.click(within(ws).getByRole("button", { name: "Or..." }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree{Enter}");
        await within(ws).findByRole("textbox", { name: "Degree from, number" });
        const row = await within(ws).findByRole("treeitem", { name: /^C, / });
        // An unbounded range passes every node with a degree (graphty-element's reading), so the
        // group counts all 77 at once, and the brush lights the whole range it shows.
        await waitFor(() => {
            assert.strictEqual(row.querySelector(".sel-count")?.textContent, "77", "every node counts");
        });
        const bars = ws.querySelectorAll('.sel-ws-props [data-testid="histogram-chart"] [data-highlighted]');
        assert.isAbove(bars.length, 0);
        assert.isTrue(
            [...bars].every((bar) => bar.getAttribute("data-highlighted") === "true"),
            "every bar is lit",
        );
    });

    it("says And... and Or...; Tab past the last control reaches the header, an F6 stop; Done shows Escape", async () => {
        const session = await openSample();
        await openLayer(session, "Keys", { "node.color": "#d55e00" }, TWO);
        const ws = await edit();
        await userEvent.click(await within(ws).findByRole("treeitem", { name: /^A, / }));
        assert.isNotNull(within(ws).queryByRole("button", { name: "Add..." }), "a group from nothing adds");
        assert.isNotNull(within(ws).queryByRole("button", { name: "Or..." }));
        const done = within(ws).getByRole("button", { name: "Done" });
        assert.strictEqual(await tooltipOf(done), "Done (Escape)");
        tabStops(ws).at(-1)?.focus();
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest(".sel-ws-head"), "Tab went to the header");
        });
        await userEvent.click(within(ws).getByRole("treeitem", { name: /^A, / }));
        assert.isNull(document.activeElement?.closest(".sel-ws-head"));
        await userEvent.keyboard("{Shift>}{F6}{/Shift}");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest(".sel-ws-head"), "Shift+F6 lands on the header");
        });
    });
});
