/**
 * The selection editor's second repolish (design/ui/studio/tier5/decided.md, "Repolish 2 fixes")
 * on the REAL graphty-element, driven by real clicks and keys: selecting a row moves no row, the
 * pane's first row holds "And..." and "Or...", the title pane's "..." holds Select N, Start
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
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { findNodes } from "../references";

// Every experiment stays off here.
withFeatures([]);

/**
 * Opens the selection's workspace from the Style tab's Style Nodes... line (issue #6810): a style
 * layer's selection is read and edited there, never in the sidebar.
 * @returns the workspace.
 */
async function openWs(): Promise<HTMLElement> {
    if (document.querySelector(".sel-ws") === null) {
        await userEvent.click(await screen.findByRole("button", { name: /^Style (Nodes|Edges)\.\.\./ }));
    }
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}
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

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };

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
    it("a saved Select card reads in its own words and counts what stays: all of it", async () => {
        const session = await lesMis("data");
        await session.visibility.addCondition({ id: "sel", effect: "select", rule: DEGREE_6_TO_10 });
        const list = await screen.findByRole("list", { name: "Filters" });
        const card = await within(list).findByRole("group", { name: /^Select / });
        await waitFor(() => {
            assert.include(card.textContent ?? "", "77 of 77");
        });
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
        await openWs();
        // The workspace's pane also names the column: the row is clicked by itself, not its value.
        await userEvent.click(row("com"));
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

describe("keys and boxes in the panes", () => {
    it("leaving the text box by Tab commits its text", async () => {
        const session = await lesMis();
        const layer = await openLayer(session, "Named", { match: "everything" });
        // A layer of every node opens on its new step's pane: its value field opens the picker.
        await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
        await userEvent.click(await screen.findByRole("button", { name: "Value" }));
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
});
