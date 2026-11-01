/**
 * The selection editor's second polish round (design/ui/studio/tier5/decided.md, "Polish round 2
 * fixes") on the REAL graphty-element, driven by real clicks, keys and hovers: a yes-or-no value
 * picked writes nothing, a data column named rank is listed, a text card takes the reader's typing,
 * "+" refines with Keep after a group's first step, a value with no test opens no card, an edge
 * step reading a node value can take either end, a So far step's card draws its test, a filter
 * card is named as its rows say it, "Or" then Escape leaves no group, the key names a single group
 * by the selection's title, hovering a group row marks it, and the style tree's rows move with
 * Mod+[ and Mod+].
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

/** Five people: a yes-or-no column, and a data column named rank. */
const PEOPLE_GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="trained" for="node" attr.name="trained" attr.type="boolean"/>
  <key id="rank" for="node" attr.name="rank" attr.type="int"/>
  <graph id="G" edgedefault="undirected">
    <node id="a"><data key="trained">true</data><data key="rank">1</data></node>
    <node id="b"><data key="trained">true</data><data key="rank">2</data></node>
    <node id="c"><data key="trained">false</data><data key="rank">3</data></node>
    <node id="d"><data key="trained">true</data><data key="rank">4</data></node>
    <node id="e"><data key="trained">false</data><data key="rank">5</data></node>
    <edge source="a" target="b"/>
    <edge source="b" target="c"/>
    <edge source="c" target="d"/>
    <edge source="d" target="e"/>
  </graph>
</graphml>`;

/**
 * The workspace on a place, with a graph read in.
 * @param place - the place to open on.
 * @param load - reads the graph.
 * @returns The session.
 */
async function open(
    place: "data" | undefined,
    load: (session: GraphSession) => Promise<unknown>,
): Promise<GraphSession> {
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
    await load(session);
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

const lesMis = (place?: "data"): Promise<GraphSession> =>
    open(place, (session) =>
        session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } }),
    );

const people = (): Promise<GraphSession> =>
    open("data", (session) =>
        session.data.import({ type: "graphml", name: "people.graphml", config: { data: PEOPLE_GRAPHML } }),
    );

/**
 * A reader's layer, selected in the style tree, its Which editor opened by a click.
 * @param session - The session.
 * @param name - Its name.
 * @param selector - What it picks.
 * @param target - Nodes or edges.
 * @returns The layer.
 */
async function openLayer(
    session: GraphSession,
    name: string,
    selector: Selector,
    target: "node" | "edge" = "node",
): Promise<Layer> {
    const layer = await session.styles.add({
        name,
        target,
        selector,
        set: target === "node" ? { "node.color": "#d55e00" } : { "edge.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await userEvent.click(
        await screen.findByRole("button", { name: target === "node" ? /^Which nodes, / : /^Which edges, / }),
    );
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
 * Picks a value in the open value picker by typing its name and pressing Enter.
 * @param name - What to type.
 */
async function pickValue(name: string): Promise<void> {
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard(name);
    await userEvent.keyboard("{Enter}");
}

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };

describe("the value picker and the cards a value opens", () => {
    it("a yes-or-no value picked writes nothing and selects nothing until Yes or No is picked", async () => {
        const session = await people();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await pickValue("trained");
        const is = await screen.findByRole<HTMLInputElement>("combobox", { name: "trained is" });
        assert.equal(is.value, "", "no choice is shown");
        assert.lengthOf(session.visibility.conditions, 0, "nothing is written");
        assert.deepEqual(session.selection.nodes, [], "nothing is selected");
    });

    it("a data column named rank is listed under Data", async () => {
        await people();
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("rank");
        const data = await screen.findByRole("group", { name: "Data" });
        assert.isNotNull(within(data).queryByRole("option", { name: /^rank/ }));
    });

    it("a text card puts focus in its text box, so typing fills it", async () => {
        const session = await lesMis();
        await openLayer(session, "Named", { match: "everything" });
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
        await pickValue("name");
        await waitFor(() => {
            const active = document.activeElement;
            assert.isTrue(active instanceof HTMLInputElement && !active.readOnly, "a box to type in has focus");
        });
        await userEvent.keyboard("Val");
        assert.equal((document.activeElement as HTMLInputElement).value, "Val");
    });

    it("Largest component applies as picked: no card opens to repeat its row", async () => {
        const session = await lesMis();
        const layer = await openLayer(session, "Largest", { match: "everything" });
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
        await pickValue("Largest component");
        await waitFor(() => {
            assert.equal(unionOf(session, layer.id)?.branches[0]?.steps[0]?.rule.kind, "member");
        });
        assert.isNull(document.querySelector("[data-step-card]"), "no card");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest(".sel-step-row"), "focus is on its row");
        });
    });

    it("an edge step reading a node value can be set to either end", async () => {
        const session = await lesMis();
        const layer = await openLayer(session, "Ends", { match: "everything" }, "edge");
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
        await pickValue("name");
        const ends = await screen.findByRole("radiogroup", { name: "Ends" });
        await userEvent.click(within(ends).getByText("Either end"));
        await waitFor(() => {
            assert.equal(unionOf(session, layer.id)?.branches[0]?.steps[0]?.ends, "either");
        });
    });

    it("a step computed on So far draws its test from its own values, never Computing", async () => {
        const session = await lesMis();
        await openLayer(session, "Top so far", {
            match: "rule",
            where: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [
                    {
                        id: "a",
                        start: "all",
                        steps: [
                            { id: "deg", op: "keep", rule: DEGREE_6_TO_10 },
                            {
                                id: "top",
                                op: "keep",
                                rule: { kind: "measure", algorithm: "degree", field: "value" },
                                computedOn: "so-far",
                            },
                        ],
                    },
                ],
            },
        });
        const row = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-row="top"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
        const card = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-step-card="top"]');
            assert.isNotNull(found);
            return found;
        });
        if (card === null) {
            return;
        }
        await within(card).findByRole("textbox", { name: /from, number$/ });
        assert.notInclude(card.textContent ?? "", "Computing");
    });
});

describe("the editor's verbs, groups and words", () => {
    it("opening Which nodes from its folded row moves focus into the editor", async () => {
        const session = await lesMis();
        await openLayer(session, "Folded", { match: "rule", where: DEGREE_6_TO_10 });
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest(".sel-editor"), "focus is in the editor, never the page");
        });
    });

    it("after a group's first step, + refines with Keep", async () => {
        const session = await lesMis();
        const layer = await openLayer(session, "Refine", {
            match: "rule",
            where: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [{ id: "a", start: "none", steps: [{ id: "deg", op: "add", rule: DEGREE_6_TO_10 }] }],
            },
        });
        await userEvent.click(await screen.findByRole("button", { name: "Add a step: Keep" }));
        await pickValue("Isolated");
        await waitFor(() => {
            assert.equal(unionOf(session, layer.id)?.branches[0]?.steps[1]?.op, "keep");
        });
    });

    it("Or then Escape takes the new group back", async () => {
        const session = await lesMis();
        const layer = await openLayer(session, "One", { match: "rule", where: DEGREE_6_TO_10 });
        await userEvent.click(screen.getByRole("button", { name: "Or" }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: "Find attributes, results" }));
            assert.lengthOf(unionOf(session, layer.id)?.branches ?? [], 1, "no empty group is left");
        });
    });

    it("a filter card is named as its rows say its steps", async () => {
        const session = await lesMis("data");
        const valjean = session.data.nodes().find((each) => session.data.name(each.id) === "Valjean")?.id;
        await session.visibility.addCondition({
            id: "near",
            effect: "keep",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [
                    {
                        start: "none",
                        steps: [{ op: "add", rule: { kind: "hops", of: { nodes: [valjean ?? ""] }, max: 1 } }],
                    },
                ],
            },
        });
        const card = await screen.findByRole("group", { name: /, Filter to$/ });
        assert.match(card.getAttribute("aria-label") ?? "", /^Within 1 hop of /);
        assert.notInclude(card.getAttribute("aria-label") ?? "", "a rule");
    });

    it("the key names a single group by the selection's title; hovering a group's row marks it", async () => {
        const session = await lesMis();
        await openLayer(session, "Two", {
            match: "rule",
            where: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [
                    { id: "a", start: "none", steps: [{ id: "deg", op: "add", rule: DEGREE_6_TO_10 }] },
                    { id: "b", start: "none", steps: [{ id: "iso", op: "add", rule: { kind: "isolated" } }] },
                ],
            },
        });
        const row = document.querySelector<HTMLElement>('[data-row="deg"]');
        await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches);
        });
        await userEvent.hover(document.querySelector<HTMLElement>('[data-row="b"]') ?? document.body);
        await waitFor(() => {
            assert.equal(session.styles.shownBranches?.mark, "b", "the hovered group is marked");
        });
        await userEvent.unhover(document.querySelector<HTMLElement>('[data-row="b"]') ?? document.body);
        await waitFor(() => {
            assert.isUndefined(session.styles.shownBranches?.mark);
        });
    });

    it("a single group in the key goes by the selection's title, never a letter", async () => {
        const session = await lesMis();
        await openLayer(session, "One", { match: "rule", where: DEGREE_6_TO_10 });
        const row = document.querySelector<HTMLElement>(".sel-step-row[data-row]");
        await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
        const preview = await screen.findByRole("region", { name: "Preview: Which nodes" });
        await waitFor(() => {
            assert.isNotNull(within(preview).queryByText("Which nodes"));
        });
        assert.isNull(within(preview).queryByText("A"));
    });
});

describe("the style tree's reorder keys", () => {
    it("Mod+[ moves a row up its list and Mod+] down, as a selection's rows", async () => {
        const session = await lesMis();
        const paint = { "node.color": "#0072b2" };
        const low = await session.styles.add({
            name: "Low",
            target: "node",
            selector: { match: "everything" },
            set: paint,
        });
        const high = await session.styles.add({
            name: "High",
            target: "node",
            selector: { match: "everything" },
            set: paint,
        });
        await session.styles.settled();
        const order = (): string[] =>
            session.styles
                .list()
                .filter((each) => each.id === low.id || each.id === high.id)
                .map((each) => each.name);
        assert.deepEqual(order(), ["Low", "High"], "bottom first");
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Low, / }));
        // Figma: Ctrl+] brings forward (up the drawn list), Ctrl+[ sends backward.
        await userEvent.keyboard("{Control>}]{/Control}");
        await waitFor(() => {
            assert.deepEqual(order(), ["High", "Low"], "Low moved up the drawn list");
        });
        await userEvent.keyboard("{Control>}[[{/Control}");
        await waitFor(() => {
            assert.deepEqual(order(), ["Low", "High"], "and back down");
        });
    });
});

/** Three people with a fractional score, as a centrality reads. */
const SCORED_GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="score" for="node" attr.name="score" attr.type="double"/>
  <graph id="G" edgedefault="undirected">
    <node id="a"><data key="score">0.0033783784601837397</data></node>
    <node id="b"><data key="score">0.5</data></node>
    <node id="c"><data key="score">0.9123456789</data></node>
    <node id="d"/>
    <edge source="a" target="b"/>
    <edge source="b" target="c"/>
  </graph>
</graphml>`;

describe("polish round 3", () => {
    it("a So far step with no test yet shows its two boxes once its own values land", async () => {
        const session = await lesMis();
        const layer = await openLayer(session, "Between", { match: "everything" });
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
        await pickValue("Degree");
        const card = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-step-card]");
            assert.isNotNull(found);
            return found;
        });
        if (card === null) {
            return;
        }
        // A second step, so So far is offered: it reads the first step's members.
        await userEvent.keyboard("{Escape}");
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
        await pickValue("Betweenness");
        const second = await waitFor(() => {
            const steps = unionOf(session, layer.id)?.branches[0]?.steps ?? [];
            assert.lengthOf(steps, 2);
            const found = document.querySelector<HTMLElement>(`[data-step-card="${steps[1]?.id ?? ""}"]`);
            assert.isNotNull(found);
            return found;
        });
        if (second === null) {
            return;
        }
        await userEvent.click(within(second).getByRole("button", { name: /^More for / }));
        await userEvent.click(await screen.findByRole("menuitemradio", { name: "So far" }));
        await waitFor(() => {
            assert.equal(unionOf(session, layer.id)?.branches[0]?.steps[1]?.computedOn, "so-far");
        });
        const opened = await waitFor(() => {
            const id = unionOf(session, layer.id)?.branches[0]?.steps[1]?.id ?? "";
            const found = document.querySelector<HTMLElement>(`[data-step-card="${id}"]`);
            assert.isNotNull(found);
            return found;
        });
        if (opened !== null) {
            await within(opened).findByRole("textbox", { name: /from, number$/ });
        }
    });

    it("picking a value with no test keeps the preview on in the style host", async () => {
        const session = await lesMis();
        await openLayer(session, "Lone", { match: "everything" });
        await userEvent.click(screen.getByRole("button", { name: "Add a step: Keep" }));
        await pickValue("Isolated");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest(".sel-step-row"), "focus is on its row");
        });
        assert.isNotNull(session.styles.shownBranches, "the group colors stay drawn while the editor is open");
    });

    it("picking a value with no test keeps the preview on in the import filter", async () => {
        const session = await lesMis("data");
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await pickValue("Isolated");
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-editor"), "the editor stays open");
            assert.isNotNull(session.styles.shownBranches, "and its preview stays drawn");
        });
    });

    it("a range card's thumbs speak the value its boxes show, never a raw float", async () => {
        await open("data", (session) =>
            session.data.import({ type: "graphml", name: "scored.graphml", config: { data: SCORED_GRAPHML } }),
        );
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await pickValue("score");
        const start = await screen.findByRole("slider", { name: "score range start" });
        const text = start.getAttribute("aria-valuetext");
        assert.isNotNull(text, "the thumb has a value text");
        assert.notInclude(text ?? "", "0.0033783784601837397");
    });

    it("a number card says how many have no value as a chip, never a sentence", async () => {
        await open("data", (session) =>
            session.data.import({ type: "graphml", name: "scored.graphml", config: { data: SCORED_GRAPHML } }),
        );
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        await pickValue("score");
        const card = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-step-card]");
            assert.isNotNull(found);
            return found;
        });
        await within(card ?? document.body).findByText("Not measured: 1");
        assert.notInclude(card?.textContent ?? "", "left out");
    });

    it("an off step says so on the folded row", async () => {
        const session = await lesMis();
        await session.styles.add({
            name: "Offstep",
            target: "node",
            selector: {
                match: "rule",
                where: {
                    kind: "union",
                    side: "nodes",
                    within: "visible",
                    branches: [
                        { id: "a", start: "all", steps: [{ id: "deg", op: "keep", rule: DEGREE_6_TO_10, on: false }] },
                    ],
                },
            },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Offstep, / }));
        const folded = await screen.findByRole("button", { name: /^Which nodes, / });
        assert.match(folded.getAttribute("aria-label") ?? "", /, off$/);
    });

    it("moving a group keeps its name", async () => {
        const session = await lesMis();
        const layer = await openLayer(session, "Two", {
            match: "rule",
            where: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [
                    { id: "a", start: "none", steps: [{ id: "deg", op: "add", rule: DEGREE_6_TO_10 }] },
                    {
                        id: "b",
                        start: "none",
                        steps: [{ id: "val", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
                    },
                ],
            },
        });
        const second = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-row="b"]');
            assert.isNotNull(found);
            return found;
        });
        second?.focus();
        // Figma's Bring forward: Ctrl+] moves the group up.
        await userEvent.keyboard("{Control>}]{/Control}");
        await waitFor(() => {
            const branches = unionOf(session, layer.id)?.branches ?? [];
            assert.deepEqual(
                branches.map((branch) => [branch.id, branch.name]),
                [
                    ["b", "B"],
                    ["a", "A"],
                ],
            );
        });
    });
});
