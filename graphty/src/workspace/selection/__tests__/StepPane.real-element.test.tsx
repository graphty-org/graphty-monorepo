/**
 * A step's controls on a selection workspace card, on the REAL graphty-element, driven by real
 * clicks and keys: a Relative to step's Hops box, a touching step's Edge ends, Include not measured
 * on a value some nodes lack or on an algorithm's test, an algorithm step's output select and setting
 * chips, a touching step's One end, By position's tie words, ends and percent, Computed on, a failed
 * run's Run again, All edges and a category list's more words. Each edit
 * lands in the layer's selection as graphty-element holds it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, RuleTree, UnionLeaf, UnionStep } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { tooltipOf } from "../../style/__tests__/tooltip";
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
 * @param prepare - readies the graph before the layer is added, when given.
 * @returns the session, the layer and the workspace.
 */
async function openStep(
    where: UnionLeaf,
    graph = lesMiserables,
    prepare?: (session: GraphSession) => Promise<void>,
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
    await prepare?.(session);
    const layer = await session.styles.add({
        name: "Calm",
        target: where.side === "edges" ? "edge" : "node",
        selector: { match: "rule", where },
        set: where.side === "edges" ? { "edge.color": "#d55e00" } : { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(page.elementLocator(tree).getByRole("treeitem", { name: /^Calm, / }));
    await userEvent.click(page.getByRole("button", { name: /^Style (Nodes|Edges)\.\.\./ }));
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
    await userEvent.click(page.elementLocator(pane(modal)).getByRole("button", { name: /^Settings for / }));
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
        await userEvent.click(page.elementLocator(pane(modal)).getByRole("button", { name: /^Value: / }));
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
        const hops = (): Locator =>
            page.elementLocator(pane(modal)).getByRole("textbox", { name: "Hops", exact: true });
        await userEvent.tripleClick(hops());
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
        await userEvent.click(page.elementLocator(ends).getByText("Both", { exact: true }));
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
        const include = page
            .elementLocator(settings)
            .getByRole("checkbox", { name: "Include not measured", exact: true });
        await userEvent.click(include);
        await waitFor(() => {
            assert.strictEqual((stepOf(session, layer)?.rule as { missing?: string }).missing, "include");
        });
        await userEvent.click(page.getByRole("checkbox", { name: "Include not measured", exact: true }));
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
        await userEvent.click(
            page.elementLocator(pane(modal)).getByRole("button", { name: "Max Iterations 1, settings", exact: true }),
        );
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".ws-options-rows"), "the settings are open");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector(".ws-options-rows"), "Escape shut them");
        });
        await userEvent.click(
            page.elementLocator(pane(modal)).getByRole("button", { name: "Reset Max Iterations", exact: true }),
        );
        await waitFor(() => {
            assert.notProperty(measure().params ?? {}, "maxIterations", "back to its default");
        });

        const output = (): Locator =>
            page.elementLocator(pane(modal)).getByRole("combobox", { name: "Louvain output", exact: true });
        await userEvent.click(output());
        const options = await screen.findAllByRole("option");
        const other = options.find((option) => option.getAttribute("aria-selected") !== "true");
        assert.isDefined(other, "another output to pick");
        await userEvent.click(other);
        await waitFor(() => {
            assert.notStrictEqual(measure().field, "community", "the step tests the picked output");
        });
    });
});

describe("a selection step's text, edge-end, run and reference controls", () => {
    it("Match case makes a text step count case", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "text", reads: "data.label", mode: "substring", text: "a" }),
            PEOPLE_GML,
        );
        const settings = await openSettings(modal);
        await userEvent.click(page.elementLocator(settings).getByRole("checkbox", { name: "Match case", exact: true }));
        await waitFor(() => {
            assert.isTrue((stepOf(session, layer)?.rule as { caseSensitive?: boolean }).caseSensitive);
        });
    });

    it("an edge step on a node value picks whether both ends or either end must pass", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("edges", { kind: "range", attribute: "data.age", min: 0 }),
            PEOPLE_GML,
        );
        const settings = await openSettings(modal);
        const ends = within(settings).getByRole("radiogroup", { name: "Edge ends" });
        await userEvent.click(page.elementLocator(ends).getByText("Either", { exact: true }));
        await waitFor(() => {
            assert.strictEqual(stepOf(session, layer)?.ends, "either");
        });
        await userEvent.click(page.elementLocator(ends).getByText("Both", { exact: true }));
        await waitFor(() => {
            assert.strictEqual(stepOf(session, layer)?.ends, "both");
        });
    });

    it("a run estimated above the limit waits for Run, and Run computes it", async () => {
        const { modal } = await openStep(
            oneStep("nodes", { kind: "measure", algorithm: "louvain", field: "community" }),
            lesMiserables,
            // Every run waits for Run.
            async (graph) => {
                graph.scope.setOptions({ ...graph.scope.options, askAboveMs: 0 });
                await Promise.resolve();
            },
        );
        // Waiting, the step says no count: the number would be what comes into it.
        await within(pane(modal)).findByRole("button", { name: /^Run/ });
        assert.notInclude(pane(modal).getAttribute("aria-label") ?? "", "so far");
        await userEvent.click(page.elementLocator(pane(modal)).getByRole("button", { name: /^Run/ }));
        await waitFor(() => {
            assert.isNull(within(pane(modal)).queryByRole("button", { name: /^(Run|Cancel)/ }), "the run is done");
            assert.include(pane(modal).getAttribute("aria-label") ?? "", "of 77 nodes so far", "its count is said");
        });
    });

    it("a path step's From and To are chosen on the card by name", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "measure", algorithm: "shortest-path", field: "onPath" }),
        );
        const bind = (): Readonly<Record<string, unknown>> =>
            (stepOf(session, layer)?.rule as Extract<RuleTree, { kind: "measure" }>).bind ?? {};
        for (const [row, name, node] of [
            ["From", "source", "Valjean"],
            ["To", "target", "Myriel"],
        ] as const) {
            await userEvent.click(page.elementLocator(pane(modal)).getByRole("button", { name: row, exact: true }));
            await screen.findByRole("listbox", { name: "References" });
            await userEvent.keyboard(node.slice(0, 4));
            await userEvent.click(page.getByRole("option", { name: node, exact: true }));
            await waitFor(() => {
                assert.property(bind(), name, `${row} is bound`);
            });
            await within(pane(modal)).findByRole("button", { name: `${row}: ${node}` });
        }
    });
});

/** Five people, three with a joining date and four with a team. */
const TEAMS_GML = `graph [
  node [ id 1 label "Ana" joined "1999-03-01" team "red" ]
  node [ id 2 label "Bo" joined "2003-07-01" team "red" ]
  node [ id 3 label "Cy" joined "2010-01-15" team "blue" ]
  node [ id 4 label "Dee" team "green" ]
  node [ id 5 label "Eve" ]
  edge [ source 1 target 2 ]
  edge [ source 2 target 3 ]
  edge [ source 3 target 4 ]
  edge [ source 4 target 5 ]
]`;

/**
 * Types the joining column as dates.
 * @param session - the session.
 */
async function joinedAsDates(session: GraphSession): Promise<void> {
    await session.data.setType({ kind: "node", name: "joined" }, "date");
}

/** Ten nodes, each of its own kind, k1 to k10, in a ring. */
const KINDS_GML = `graph [
${Array.from({ length: 10 }, (_, at) => `  node [ id ${String(at)} kind "k${String(at + 1)}" ]`).join("\n")}
${Array.from({ length: 10 }, (_, at) => `  edge [ source ${String(at)} target ${String((at + 1) % 10)} ]`).join("\n")}
]`;

describe("a selection step's date and category cards", () => {
    it("a date step clears its bound when the box is emptied, says Not a date on Escape, and turns to Has a value", async () => {
        const where: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "a",
                    start: "none",
                    steps: [
                        {
                            id: "s",
                            op: "add",
                            mode: "before",
                            rule: {
                                kind: "range",
                                attribute: "data.joined",
                                as: "time",
                                max: Date.UTC(2005, 0, 1) - 1,
                            },
                        },
                    ],
                },
            ],
        };
        const { session, layer, modal } = await openStep(where, TEAMS_GML, joinedAsDates);
        // Two people have no date: the step says they are left out.
        await within(pane(modal)).findByText("Not measured: 2");
        const box = within(pane(modal)).getByRole<HTMLInputElement>("combobox", {
            name: "joined before, a date or a year",
        });
        assert.strictEqual(box.value, "2005");
        await userEvent.tripleClick(
            page
                .elementLocator(pane(modal))
                .getByRole("combobox", { name: "joined before, a date or a year", exact: true }),
        );
        await userEvent.keyboard("{Backspace}");
        await waitFor(() => {
            assert.isUndefined((stepOf(session, layer)?.rule as { max?: number }).max, "the bound is gone");
        });

        await userEvent.keyboard("zzz{Escape}");
        await within(pane(modal)).findByText("Not a date");
        assert.strictEqual(box.getAttribute("aria-invalid"), "true");
        assert.isNotNull(document.querySelector(".sel-ws"), "Escape in the box leaves the workspace open");

        await userEvent.click(
            page.elementLocator(pane(modal)).getByRole("combobox", { name: "joined: how to match", exact: true }),
        );
        await userEvent.click(page.getByRole("option", { name: "Has a value", exact: true }));
        await waitFor(() => {
            assert.notStrictEqual(stepOf(session, layer)?.rule.kind, "range", "no longer a date range");
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).matched, 3, "the three with a date");
        assert.isNull(within(pane(modal)).queryByRole("combobox", { name: /^joined before/ }), "no date box");
        assert.isNull(within(pane(modal)).queryByText("Not a date"), "the refusal goes with the box");
    });

    it("a category step lists its values largest first, and ticks a value and the nodes with no value", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "categories", attribute: "data.team", values: [] }),
            TEAMS_GML,
        );
        const values = await within(pane(modal)).findByRole("group", { name: "team values" });
        // Largest first, each with its count, and the node with none last.
        assert.deepEqual(
            within(values)
                .getAllByRole("checkbox")
                .map((each) => each.getAttribute("aria-label")),
            ["red, 2 nodes", "blue, 1 node", "green, 1 node", "(no value), 1 node"],
        );
        const matched = async (): Promise<number> => {
            await session.styles.settled();
            return session.styles.counts(layer.id).matched;
        };
        await userEvent.click(page.elementLocator(values).getByRole("checkbox", { name: "blue, 1 node", exact: true }));
        await waitFor(() => {
            assert.deepEqual((stepOf(session, layer)?.rule as { values?: readonly unknown[] }).values, ["blue"]);
        });
        assert.strictEqual(await matched(), 1, "Cy");
        await userEvent.click(
            page.elementLocator(values).getByRole("checkbox", { name: "(no value), 1 node", exact: true }),
        );
        await waitFor(() => {
            assert.isTrue(
                within(values).getByRole<HTMLInputElement>("checkbox", { name: "(no value), 1 node" }).checked,
            );
        });
        await waitFor(async () => {
            assert.strictEqual(await matched(), 2, "Cy and Eve");
        });
    });

    it("a category step over more than eight values searches them and checks every match at once", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "categories", attribute: "data.kind", values: [] }),
            KINDS_GML,
        );
        const search = await within(pane(modal)).findByRole("textbox", { name: "Search kind" });
        assert.strictEqual(search.getAttribute("placeholder"), "Search 10");
        // Eight rows drawn, and the rest said.
        await within(pane(modal)).findByText("2 more");
        await userEvent.click(
            page.elementLocator(pane(modal)).getByRole("textbox", { name: "Search kind", exact: true }),
        );
        await userEvent.keyboard("1");
        // k1 and k10.
        const matched = 2;
        await userEvent.click(page.elementLocator(pane(modal)).getByRole("button", { name: "Check 2", exact: true }));
        await waitFor(() => {
            const picked = (stepOf(session, layer)?.rule as { values?: readonly unknown[] }).values ?? [];
            assert.lengthOf(picked, matched, "every match is checked");
        });
        const uncheck = page
            .elementLocator(pane(modal))
            .getByRole("button", { name: `Uncheck ${String(matched)}`, exact: true });
        await userEvent.click(uncheck);
        await waitFor(() => {
            assert.lengthOf((stepOf(session, layer)?.rule as { values?: readonly unknown[] }).values ?? [], 0);
        });
    });
});

describe("a card's count chip", () => {
    it("selects what the card holds", async () => {
        const { session, modal } = await openStep(
            oneStep("nodes", { kind: "range", attribute: "data.age", min: 0 }),
            PEOPLE_GML,
        );
        await userEvent.click(page.elementLocator(modal).getByRole("button", { name: /^Select 2 of 4 nodes/ }));
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, 2, "Ana and Bo");
        });
    });
});

/** Four people scored 5, 5, 3 and 1, in a line. */
const SCORES_GML = `graph [
  node [ id 1 label "Ana" score 5 ]
  node [ id 2 label "Bo" score 5 ]
  node [ id 3 label "Cy" score 3 ]
  node [ id 4 label "Dee" score 1 ]
  edge [ source 1 target 2 ]
  edge [ source 2 target 3 ]
  edge [ source 3 target 4 ]
]`;

describe("a selection step's ties, touching ends and an algorithm's not measured", () => {
    it("a By position step says when a tie keeps more than it asked for", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "range", attribute: "data.score", min: 0 }),
            SCORES_GML,
        );
        const settings = await openSettings(modal);
        await userEvent.click(
            page
                .elementLocator(settings)
                .getByRole("radiogroup", { name: "Test", exact: true })
                .getByText("By position", { exact: true }),
        );
        const count = (): Locator =>
            page.elementLocator(pane(modal)).getByRole("textbox", { name: "score: how many", exact: true });
        await userEvent.click(count());
        await userEvent.keyboard("{Control>}a{/Control}1{Enter}");
        // Ana and Bo tie for the top score: both are kept, and the pane says so.
        await within(pane(modal)).findByText("1 asked, 2 kept: tied");
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).matched, 2);
    });

    it("a touching step's Edge ends picks One", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("edges", { kind: "touching", ends: "either", of: { nodes: ["Valjean"] } }),
        );
        const settings = await openSettings(modal);
        const ends = within(settings).getByRole("radiogroup", { name: "Edge ends" });
        await userEvent.click(page.elementLocator(ends).getByText("One", { exact: true }));
        await waitFor(() => {
            assert.strictEqual((stepOf(session, layer)?.rule as { ends?: string }).ends, "one");
        });
    });

    it("Include not measured on an algorithm's test is said on Settings, and off leaves the test without it", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", {
                kind: "measure",
                algorithm: "pagerank",
                field: "value",
                test: { kind: "range", min: 0, missing: "include" },
            }),
        );
        const measure = (): Extract<RuleTree, { kind: "measure" }> =>
            stepOf(session, layer)?.rule as Extract<RuleTree, { kind: "measure" }>;
        await within(pane(modal)).findByRole("button", { name: /^Settings for / });
        const settings = await openSettings(modal);
        const include = within(settings).getByRole<HTMLInputElement>("checkbox", { name: "Include not measured" });
        assert.isTrue(include.checked);
        await userEvent.click(
            page.elementLocator(settings).getByRole("checkbox", { name: "Include not measured", exact: true }),
        );
        await waitFor(() => {
            assert.deepEqual(measure().test, { kind: "range", min: 0 }, "the test keeps its bound, not measured gone");
        });
        assert.strictEqual(measure().algorithm, "pagerank", "still the same algorithm");
    });
});

/** Four people, three of them with an age. */
const AGES_GML = `graph [
  node [ id 1 label "Ana" age 30 ]
  node [ id 2 label "Bo" age 40 ]
  node [ id 3 label "Cy" age 50 ]
  node [ id 4 label "Dee" ]
  edge [ source 1 target 2 ]
  edge [ source 2 target 3 ]
  edge [ source 3 target 4 ]
]`;

describe("a selection step's less traveled controls", () => {
    it("a step whose run fails offers Run again", async () => {
        const { modal } = await openStep(
            // graphty-element refuses Louvain with its optimized implementation switched off.
            oneStep("nodes", {
                kind: "measure",
                algorithm: "louvain",
                field: "community",
                params: { useOptimized: false },
            }),
        );
        await within(pane(modal)).findByRole("button", { name: "Run again" });
    });

    it("a changed setting that is not a number is said on its chip, and its x resets it", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", {
                kind: "measure",
                algorithm: "hierarchical-clustering",
                field: "community",
                params: { linkage: "complete" },
            }),
        );
        await within(pane(modal)).findByRole("button", { name: "Linkage complete, settings" });
        await userEvent.click(
            page.elementLocator(pane(modal)).getByRole("button", { name: "Reset Linkage", exact: true }),
        );
        await waitFor(() => {
            const rule = stepOf(session, layer)?.rule as Extract<RuleTree, { kind: "measure" }>;
            assert.notProperty(rule.params ?? {}, "linkage", "back to its default");
        });
        assert.isNull(within(pane(modal)).queryByRole("button", { name: "Linkage complete, settings" }));
    });

    it("By position counts from the bottom and in percent, and goes back to the top, to a count and to By value", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "range", attribute: "data.score", min: 0 }),
            SCORES_GML,
        );
        const rule = (): Record<string, unknown> => (stepOf(session, layer)?.rule ?? {}) as Record<string, unknown>;
        let settings = await openSettings(modal);
        await userEvent.click(
            page
                .elementLocator(settings)
                .getByRole("radiogroup", { name: "Test", exact: true })
                .getByText("By position", { exact: true }),
        );
        const count = (): Locator =>
            page.elementLocator(pane(modal)).getByRole("textbox", { name: "score: how many", exact: true });
        await userEvent.click(count());
        await userEvent.keyboard("{Control>}a{/Control}1{Enter}");
        await within(pane(modal)).findByText("1 asked, 2 kept: tied");

        const pick = async (box: string, option: string): Promise<void> => {
            await userEvent.click(page.elementLocator(pane(modal)).getByRole("combobox", { name: box, exact: true }));
            await userEvent.click(page.getByRole("option", { name: option, exact: true }));
        };
        await pick("score: which end", "Bottom");
        await session.styles.settled();
        await waitFor(() => {
            assert.strictEqual(session.styles.counts(layer.id).matched, 1, "Dee, the lowest");
        });
        await pick("score: which end", "Top");
        await waitFor(() => {
            assert.strictEqual(session.styles.counts(layer.id).matched, 2, "Ana and Bo again");
        });
        await pick("score: count or percent", "% of nodes");
        await within(pane(modal)).findByRole("textbox", { name: "score: what percent" });
        await pick("score: count or percent", "nodes");
        await within(pane(modal)).findByRole("textbox", { name: "score: how many" });

        settings = await openSettings(modal);
        await userEvent.click(
            page
                .elementLocator(settings)
                .getByRole("radiogroup", { name: "Test", exact: true })
                .getByText("By value", { exact: true }),
        );
        await waitFor(() => {
            assert.isNull(within(pane(modal)).queryByRole("textbox", { name: "score: how many" }), "no count box");
            assert.notInclude(JSON.stringify(rule()), '"top"', "the step tests values again");
        });
    });

    it("Computed on switches a keep step's algorithm to what is selected so far and back", async () => {
        const where: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "a",
                    start: "all",
                    steps: [
                        {
                            id: "s",
                            op: "keep",
                            rule: {
                                kind: "measure",
                                algorithm: "degree",
                                field: "degree",
                                test: { kind: "range", min: 1 },
                            },
                        },
                    ],
                },
            ],
        };
        const { session, layer, modal } = await openStep(where);
        const settings = await openSettings(modal);
        const on = within(settings).getByRole("radiogroup", { name: "Computed on" });
        await userEvent.click(page.elementLocator(on).getByText("So far", { exact: true }));
        await waitFor(() => {
            assert.strictEqual(stepOf(session, layer)?.computedOn, "so-far");
        });
        await userEvent.click(page.elementLocator(on).getByText("Filtered graph", { exact: true }));
        await waitFor(() => {
            assert.notStrictEqual(stepOf(session, layer)?.computedOn, "so-far");
        });
    });

    it("Hops refuses 0 and keeps its count", async () => {
        const { session, layer, modal } = await openStep(
            oneStep("nodes", { kind: "hops", of: { nodes: ["Valjean"] }, max: 2 }),
        );
        const hops = (): Locator =>
            page.elementLocator(pane(modal)).getByRole("textbox", { name: "Hops", exact: true });
        await userEvent.tripleClick(hops());
        await userEvent.keyboard("0");
        await userEvent.tab();
        await session.styles.settled();
        assert.strictEqual((stepOf(session, layer)?.rule as { max?: number }).max, 2);
    });

    it("All edges takes a step's edge condition off", async () => {
        const where: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    id: "a",
                    start: "none",
                    steps: [
                        {
                            id: "s",
                            op: "add",
                            rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 1 },
                            links: { kind: "range", attribute: "data.value", min: 2 },
                        },
                    ],
                },
            ],
        };
        const { session, layer, modal } = await openStep(where);
        const settings = await openSettings(modal);
        await userEvent.click(
            page
                .elementLocator(settings)
                .getByRole("radiogroup", { name: "Edges", exact: true })
                .getByText("All edges", { exact: true }),
        );
        await waitFor(() => {
            assert.isUndefined(stepOf(session, layer)?.links, "every link counts again");
        });
    });

    it("one node with no value is said in the singular", async () => {
        const { modal } = await openStep(oneStep("nodes", { kind: "range", attribute: "data.age", min: 0 }), AGES_GML);
        const chip = await within(pane(modal)).findByText("Not measured: 1");
        assert.strictEqual(await tooltipOf(chip), "1 node has no value and is left out");
    });

    it("a category list says the checked values it cannot draw, and a search with more matches than rows how many more", async () => {
        const { modal } = await openStep(
            oneStep("nodes", {
                kind: "categories",
                attribute: "data.kind",
                values: ["k1", "k2", "k3", "k4", "k5", "k6", "k7"],
            }),
            KINDS_GML,
        );
        // Six checked rows are drawn, so the two largest unchecked stay in reach: the seventh is said.
        await within(pane(modal)).findByText("1 more checked");
        // A locator resolved at the click, not an element: the matches strip mounts its own search after
        // the workspace's first paint, and an element's selector is generated before that, short
        // enough ("Search") to match both once it does.
        await userEvent.click(page.getByRole("textbox", { name: "Search kind", exact: true }));
        await userEvent.keyboard("k");
        // All ten match; eight are drawn.
        await within(pane(modal)).findByText("2 more");
        assert.isNull(within(pane(modal)).queryByText("1 more checked"), "a search draws no checked count");
    });
});
