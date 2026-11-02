/**
 * The selection editor's second repolish (design/ui/studio/tier5/decided.md, "Repolish 2 fixes")
 * on the REAL graphty-element, driven by real clicks and keys: selecting a row moves no row, the
 * pane's first row holds "Condition..." and "Or...", the title pane's "..." holds Select N, Start
 * with lives in a group's Advanced, a condition is said once, groups read "or", a relative
 * condition is never cut, an exact id is listed first, a filter card's name keeps its verb, and a
 * collapsed filter card opens to its title row.
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
import { findNodes } from "../references";

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

/**
 * A reader's layer, selected in the style tree: its Which outline is drawn.
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
 * A row of the outline by its id.
 * @param id - The row's id.
 * @returns The row.
 */
function row(id: string): HTMLElement {
    // The workspace's row while it is open, else the sidebar's.
    const found =
        document.querySelector<HTMLElement>(`.sel-ws [data-row="${id}"]`) ??
        document.querySelector<HTMLElement>(`[data-row="${id}"]`);
    if (found === null) {
        throw new Error(`no row ${id}`);
    }
    return found;
}

/**
 * Where every row of the outline sits.
 * @returns "id@top" per row.
 */
function rowTops(): string[] {
    return [...document.querySelectorAll<HTMLElement>(".sel-ws .sel-outline [data-row]")].map(
        (each) => `${each.dataset.row ?? ""}@${String(Math.round(each.getBoundingClientRect().top))}`,
    );
}

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };

/** Two groups: A, degree 6 to 10 from All; B, Valjean alone. */
const TWO_GROUPS: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        { id: "a", start: "all", steps: [{ id: "deg", op: "keep", rule: DEGREE_6_TO_10 }] },
        { id: "b", start: "none", steps: [{ id: "iso", op: "add", rule: { kind: "isolated" } }] },
    ],
};

describe("the outline holds only recipe rows", () => {
    it("selecting the title, a group or a step moves no row; Condition... and Or... are in the pane", async () => {
        const session = await lesMis();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        await userEvent.click(row("title").querySelector(".sel-title") ?? row("title"));
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-pane-box"));
        });
        const before = rowTops();
        for (const id of ["a", "deg", "b", "iso", "title"]) {
            await userEvent.click(row(id).querySelector(".sel-value, .sel-title") ?? row(id));
            await waitFor(() => {
                assert.equal(row(id).getAttribute("aria-selected"), "true");
            });
            assert.deepEqual(rowTops(), before, `selecting ${id}`);
            const pane = document.querySelector<HTMLElement>(".sel-pane-box") ?? document.body;
            assert.isNotNull(within(pane).queryByRole("button", { name: "Or..." }), `Or... in ${id}'s pane`);
        }
        assert.isNull(screen.queryByRole("treeitem", { name: "Condition..." }));
    });

    it("the title pane has no bare Select: Select N is in its '...', with Group colors", async () => {
        const session = await lesMis();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        await userEvent.click(row("title").querySelector(".sel-title") ?? row("title"));
        const pane = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-pane-box");
            assert.isNotNull(found);
            return found;
        });
        if (pane === null) {
            return;
        }
        assert.isNull(within(pane).queryByRole("button", { name: /^Select/ }), "no Select button");
        assert.isNull(within(pane).queryByRole("button", { name: "Group colors" }), "no unlabeled palette");
        await userEvent.click(within(pane).getByRole("button", { name: /^More for / }));
        await screen.findByRole("menuitem", { name: /^Select \d+/ });
        assert.isNotNull(screen.queryByRole("menuitem", { name: /group colors/ }));
    });

    it("a group whose start empties it says Passes none on its row", async () => {
        const session = await lesMis();
        const emptied: UnionLeaf = {
            ...TWO_GROUPS,
            branches: [
                TWO_GROUPS.branches[0],
                { id: "b", start: "none", steps: [{ id: "deg2", op: "keep", rule: DEGREE_6_TO_10 }] },
            ],
        };
        await openLayer(session, "Emptied", { match: "rule", where: emptied });
        await waitFor(() => {
            assert.match(row("b").getAttribute("aria-label") ?? "", /passes none/);
        });
        assert.include(row("b").textContent ?? "", "Passes none");
    });
});

describe("a condition is said once", () => {
    it("All nodes and Keep are not drawn for a group's first Keep; groups after the first read 'or'", async () => {
        const session = await lesMis();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        assert.isNull(screen.queryByRole("treeitem", { name: "All nodes" }), "no All nodes row");
        assert.equal(row("deg").querySelector(".sel-verb")?.textContent, "", "no Keep on the first step");
        assert.equal(row("iso").querySelector(".sel-verb")?.textContent, "", "no Add on a None group's first");
        assert.equal(row("a").querySelector(".sel-verb")?.textContent, "");
        assert.equal(row("b").querySelector(".sel-verb")?.textContent, "or");
    });

    it("a first Except keeps All nodes and its verb", async () => {
        const session = await lesMis();
        await openLayer(session, "Except", {
            match: "rule",
            where: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [{ id: "a", start: "all", steps: [{ id: "deg", op: "except", rule: DEGREE_6_TO_10 }] }],
            },
        });
        assert.isNotNull(screen.queryByRole("treeitem", { name: "All nodes" }));
        assert.equal(row("deg").querySelector(".sel-verb")?.textContent, "Except");
    });

    it("a lone verb is no segment, and the step pane draws its count so far", async () => {
        const session = await lesMis();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        await userEvent.click(row("iso").querySelector(".sel-value") ?? row("iso"));
        const pane = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-step-pane="iso"]');
            assert.isNotNull(found);
            return found;
        });
        assert.isNull(screen.queryByRole("radiogroup", { name: "Verb" }), "Add alone is said, not a segment");
        await waitFor(() => {
            assert.match(pane?.textContent ?? "", /\d+ so far/);
        });
    });

    it("a selected row drops its state word, which its pane already shows", async () => {
        const session = await lesMis();
        await openLayer(session, "Untested", {
            match: "rule",
            where: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [
                    {
                        id: "a",
                        start: "all",
                        steps: [{ id: "deg", op: "keep", rule: { kind: "range", attribute: "graphty.degree" } }],
                    },
                ],
            },
        });
        await waitFor(() => {
            assert.equal(row("deg").querySelector(".sel-state")?.textContent, "No test");
        });
        await userEvent.click(row("deg").querySelector(".sel-value") ?? row("deg"));
        await waitFor(() => {
            assert.isNull(row("deg").querySelector(".sel-state"));
        });
    });
});

describe("a relative condition is never cut", () => {
    it("While with no reference reads its whole value with no test column; Within 2 hops of is whole", async () => {
        const session = await lesMis();
        await openLayer(session, "Relative", {
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
                            { id: "while", op: "keep", rule: { kind: "nonempty" } },
                            { id: "near", op: "keep", rule: { kind: "hops", max: 2 } },
                        ],
                    },
                ],
            },
        });
        const whileValue = row("while").querySelector<HTMLElement>(".sel-value");
        assert.equal(whileValue?.textContent, "While ... has nodes");
        assert.isNull(row("while").querySelector(".sel-test"), "no test column");
        for (const id of ["while", "near"]) {
            const value = row(id).querySelector<HTMLElement>(".sel-value");
            assert.isAtMost(value?.scrollWidth ?? 0, value?.clientWidth ?? 0, `${id}'s value is whole`);
        }
    });
});

describe("the reference search on a large graph", () => {
    it("lists a node whose id is exactly the text first, however little it is connected", async () => {
        const nodes = Array.from({ length: 200 }, (_, at) => `node [ id ${String(at + 1)} ]`).join("\n");
        // Node 1 has no edge; 10 to 19 are joined to every node from 100 on.
        const edges = Array.from({ length: 10 }, (_, at) =>
            Array.from(
                { length: 100 },
                (__, to) => `edge [ source ${String(at + 10)} target ${String(to + 100)} ]`,
            ).join("\n"),
        ).join("\n");
        const session = await open(undefined, (s) =>
            s.data.import({ type: "gml", name: "many.gml", config: { data: `graph [\n${nodes}\n${edges}\n]` } }),
        );
        const found = findNodes(session, "1");
        assert.equal(String(found.nodes[0]?.id), "1");
    });
});

describe("filter cards", () => {
    it("a card that removes is named with its verb", async () => {
        const session = await lesMis("data");
        await session.visibility.addCondition({ id: "deg", effect: "exclude", rule: DEGREE_6_TO_10 });
        const list = await screen.findByRole("list", { name: "Filters" });
        const card = await within(list).findByRole("group", { name: /^Except / });
        assert.match(card.getAttribute("aria-label") ?? "", /^Except Degree 6 to 10/);
    });

    it("a saved Select card reads in its own words and counts what stays: all of it", async () => {
        const session = await lesMis("data");
        await session.visibility.addCondition({ id: "sel", effect: "select", rule: DEGREE_6_TO_10 });
        const list = await screen.findByRole("list", { name: "Filters" });
        const card = await within(list).findByRole("group", { name: /^Select / });
        await waitFor(() => {
            assert.include(card.textContent ?? "", "77 of 77");
        });
    });

    it("a collapsed card is the open card's type size, opens from anywhere on its row, and focuses its title", async () => {
        const session = await lesMis("data");
        await session.visibility.addCondition({ id: "a", effect: "keep", rule: DEGREE_6_TO_10 });
        await session.visibility.addCondition({ id: "b", effect: "keep", rule: { kind: "isolated" } });
        const list = await screen.findByRole("list", { name: "Filters" });
        const card = await within(list).findByRole("group", { name: /^Degree 6 to 10/ });
        const name = card.querySelector<HTMLElement>(".dp-filter-title");
        const size = name === null ? "" : getComputedStyle(name).fontSize;
        const count = card.querySelector<HTMLElement>(".dp-filter-name .sel-count");
        if (count === null) {
            throw new Error("the collapsed card draws its count");
        }
        await userEvent.click(count);
        const title = await within(card).findByRole("treeitem", { name: /^Degree 6 to 10, / });
        assert.equal(getComputedStyle(title.querySelector(".sel-title") ?? title).fontSize, size, "same type size");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, title, "focus is on the card's title row");
        });
        const conditions = session.visibility.conditions.length;
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.isFalse(
                session.visibility.conditions.find((each) => each.id === "a")?.on ?? true,
                "Space turned it off",
            );
        });
        assert.lengthOf(session.visibility.conditions, conditions, "no card was added");
    });
});

describe("a narrowing step's checklist", () => {
    it("counts each value over what comes into the step, not the whole base", async () => {
        const session = await open(undefined, async (s) => {
            await s.data.generate("lfr", {
                n: 300,
                minDegree: 2,
                maxDegree: 8,
                degreeExponent: 2.5,
                minCommunity: 10,
                maxCommunity: 20,
                communityExponent: 1.5,
                mixing: 0.1,
                seed: 1,
            });
            await s.data.setType({ kind: "node", name: "community" }, "category");
        });
        const busy: RuleTree = { kind: "range", attribute: "graphty.degree", min: 7 };
        await openLayer(session, "Narrow", {
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
                            { id: "busy", op: "keep", rule: busy },
                            {
                                id: "com",
                                op: "keep",
                                rule: { kind: "categories", attribute: "data.community", values: [] },
                            },
                        ],
                    },
                ],
            },
        });
        const input = (await session.scope.count({ define: { kind: "rule", where: busy, reading: "clipped" } })).nodes;
        assert.isBelow(input, 40, "the first step keeps few nodes");
        await userEvent.click(row("com").querySelector(".sel-value") ?? row("com"));
        const values = await screen.findByRole("group", { name: "community values" });
        await waitFor(() => {
            const counts = within(values)
                .getAllByRole("checkbox")
                .map((each) =>
                    Number(
                        /, ([\d,]+) nodes?$/.exec(each.getAttribute("aria-label") ?? "")?.[1]?.replace(/,/g, "") ?? 0,
                    ),
                );
            const sum = counts.reduce((a, b) => a + b, 0);
            assert.isAtMost(sum, input, "the listed values count only what the first step kept");
        });
    });
});

describe("moving between filter cards", () => {
    it("with one card's workspace open, a click on another card's row switches it to that card", async () => {
        const session = await lesMis("data");
        await session.visibility.addCondition({ id: "a", effect: "keep", rule: DEGREE_6_TO_10 });
        await session.visibility.addCondition({ id: "b", effect: "keep", rule: { kind: "isolated" } });
        const list = await screen.findByRole("list", { name: "Filters" });
        const upper = await within(list).findByRole("group", { name: /^Degree 6 to 10/ });
        await userEvent.click(upper.querySelector(".dp-filter-title") ?? upper);
        const title = await within(upper).findByRole("treeitem", { name: /^Degree 6 to 10, / });
        await userEvent.click(title.querySelector(".sel-title") ?? title);
        await screen.findByRole("region", { name: "Degree 6 to 10 -- Filters" });
        const lower = await within(list).findByRole("group", { name: /^Isolated/ });
        const count = lower.querySelector<HTMLElement>(".dp-filter-name .sel-count");
        if (count === null) {
            throw new Error("the lower card draws its count");
        }
        await userEvent.click(count);
        await within(lower).findByRole("treeitem", { name: /^Isolated, / });
        await screen.findByRole("region", { name: "Isolated -- Filters" });
    });
});

describe("keys and boxes in the panes", () => {
    it("F2 on a step row never opens the project's rename", async () => {
        const session = await lesMis();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        row("deg").focus();
        await userEvent.keyboard("{F2}");
        assert.notEqual(document.activeElement?.getAttribute("aria-label"), "Project name");
        assert.strictEqual(document.activeElement, row("deg"));
    });

    it("leaving the text box by Tab commits its text", async () => {
        const session = await lesMis();
        const layer = await openLayer(session, "Named", { match: "everything" });
        await userEvent.click(screen.getByRole("treeitem", { name: "Condition..." }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("name{Enter}");
        await waitFor(() => {
            const active = document.activeElement;
            assert.isTrue(active instanceof HTMLInputElement && !active.readOnly);
        });
        await userEvent.keyboard("Val");
        await userEvent.tab();
        await waitFor(() => {
            const step = unionOf(session, layer.id)?.branches[0]?.steps[0];
            assert.include(JSON.stringify(step?.rule ?? {}), "Val");
        });
    });

    it("every pane control is the default size: the verb segment's labels and the rows read alike", async () => {
        const session = await lesMis();
        await openLayer(session, "Busy", {
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
                            { id: "iso", op: "keep", rule: { kind: "isolated" } },
                        ],
                    },
                ],
            },
        });
        await userEvent.click(row("iso").querySelector(".sel-value") ?? row("iso"));
        const verbs = await screen.findByRole("radiogroup", { name: "Verb" });
        const label = within(verbs).getByText("Keep");
        const rowText = row("deg").querySelector<HTMLElement>(".sel-value");
        assert.equal(getComputedStyle(label).fontSize, rowText === null ? "" : getComputedStyle(rowText).fontSize);
        const value = screen.getByRole("button", { name: /^Value: / });
        assert.isAtLeast(value.getBoundingClientRect().height, 24);
    });
});
