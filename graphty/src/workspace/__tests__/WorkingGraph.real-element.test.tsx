/**
 * The app on the REAL graphty-element reads the working graph (design/working-graph/design.md,
 * step S11): every reader that names no scope reads what the filter shows, and a place named for
 * the whole graph asks for it by name. Run with the `selection-workspace` experiment off and on,
 * since it changes the Data place the filter lives in.
 *
 * A filter lays out only the nodes it shows and leaves the hidden ones where they were; the
 * Overview's "Full graph" keeps the whole graph's counts while its Degree section reads what is
 * showing; the Export dialog's All counts the whole graph.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../test/features";
import { act, render, screen, waitFor, within } from "../../test/test-utils";
import { stepCard } from "../selection/values";
import { createWorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";

/** A ring of twelve nodes. */
const IDS = Array.from({ length: 12 }, (_, i) => `n${String(i)}`);
const RING = IDS.map((src, i) => ({ src, dst: IDS[(i + 1) % IDS.length] }));

/** What the filter shows: the first half of the ring, a path of six. */
const SHOWN = IDS.slice(0, 6);

/** What it hides. */
const HIDDEN = IDS.slice(6);

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * The workspace on the ring, its element up, laid out and the Layout tool enabled.
 * @returns the element and its session.
 */
async function openRing(): Promise<{ element: Element; session: GraphSession }> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Ring", id: 1 } })} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element;
    await session.data.addNodes(IDS.map((id) => ({ id })));
    await session.data.addEdges(RING);
    const tool = screen.getByRole("button", { name: "Layout" });
    await waitFor(() => {
        assert.isFalse(tool.hasAttribute("aria-disabled"));
    });
    await element.waitForSettled();
    return { element, session };
}

/**
 * Where some nodes are, in the graph's own coordinates.
 * @param session - the element's session.
 * @param ids - the nodes.
 * @returns each node's x, y and z, in order.
 */
function placesOf(session: GraphSession, ids: readonly string[]): number[][] {
    const { ids: rows } = session.data.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    return ids.map((id) => {
        session.positions.read(rows.indexOf(id), at);
        return [at.x, at.y, at.z];
    });
}

/**
 * Show only the first half of the ring.
 * @param element - the element.
 * @param session - its session.
 */
async function showHalf(element: Element, session: GraphSession): Promise<void> {
    await act(async () => {
        await session.visibility.set({ kind: "member", of: { nodes: SHOWN } });
        await element.waitForSettled();
    });
}

const inspector = (): ReturnType<typeof within> => within(screen.getByRole("complementary", { name: "Inspector" }));

for (const experiment of [false, true]) {
    describe(`the app reads the working graph (selection-workspace ${experiment ? "on" : "off"})`, () => {
        withFeatures(experiment ? ["selection-workspace"] : []);

        beforeAll(async () => {
            await page.viewport(1366, 768);
        });

        it("lays out only what the filter shows, and leaves the hidden nodes where they were", async () => {
            const { element, session } = await openRing();
            assert.strictEqual(element.workingGraph, "visible");

            await userEvent.click(screen.getByRole("button", { name: "Layout" }));
            const popover = await screen.findByRole("dialog", { name: "Layout" });
            await userEvent.click(within(popover).getByRole("option", { name: /^Circle(?!s)/ }));
            await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
            await waitFor(() => {
                assert.strictEqual(session.layout.id, "circular");
            });
            await element.waitForSettled();

            const hiddenBefore = placesOf(session, HIDDEN);
            const shownBefore = placesOf(session, SHOWN);
            await showHalf(element, session);
            assert.notDeepEqual(placesOf(session, SHOWN), shownBefore, "the shown nodes are laid out again");
            assert.deepEqual(placesOf(session, HIDDEN), hiddenBefore, "the hidden nodes stay where they were");
        });

        it("keeps the Overview's Full graph on the whole graph, its Degree on what is showing", async () => {
            const { element, session } = await openRing();
            await showHalf(element, session);

            const showing = await waitFor(() => inspector().getByRole("group", { name: "Nodes showing" }));
            assert.include(showing.textContent, "6 of 12");
            const full = inspector().getByRole("group", { name: "Full graph" });
            assert.include(within(full).getByRole("group", { name: "Nodes" }).textContent, "12");
            assert.include(within(full).getByRole("group", { name: "Edges" }).textContent, "12");
            // The path of six: its ends have degree 1, where every node of the ring has 2.
            const degree = inspector().getByRole("group", { name: "Degree showing" });
            assert.match(within(degree).getByRole("group", { name: "Lowest" }).textContent, /1$/);
        });

        it("counts the whole graph under All in the Export dialog, and what is shown under Shown", async () => {
            const { element, session } = await openRing();
            await showHalf(element, session);

            await userEvent.keyboard("{Control>}e{/Control}");
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            await userEvent.click(
                within(within(dialog).getByRole("grid", { name: "What to export" })).getByText("Data"),
            );
            await userEvent.click(within(dialog).getByRole("combobox", { name: "Scope" }));
            assert.isNotNull(await screen.findByRole("option", { name: "All 12" }));
            assert.isNotNull(screen.getByRole("option", { name: "Shown 6 of 12" }));
        });

        it("reads a number card's range over its base: what is shown for a layer, everything for a filter", async () => {
            const { element, session } = await openRing();
            await act(async () => {
                await session.data.updateNodes(IDS.map((id, at) => ({ id, values: { x: at + 1 } })));
            });
            await showHalf(element, session);
            const range = (within: "visible" | "graph"): unknown =>
                stepCard(
                    session,
                    { op: "keep", rule: { kind: "range", attribute: "data.x" } },
                    undefined,
                    "node",
                    within,
                ).field?.range;
            assert.deepEqual(range("visible"), { min: 1, max: 6 });
            assert.deepEqual(range("graph"), { min: 1, max: 12 });
        });

        it("narrows a group's members chip to what is shown, with Shown / All beside it", async () => {
            const { element, session } = await openRing();
            const run = session.runs.start("louvain", undefined, { scope: "graph", style: false });
            await act(async () => {
                await run;
            });
            await showHalf(element, session);
            const groups = run.result?.summary().groups ?? [];
            const membersOf = (group: unknown): string[] => IDS.filter((id) => run.result?.node(id)?.group === group);
            // A group with members on both sides of the filter.
            const mixed = groups.find((each) => {
                const members = membersOf(each.group);
                return members.some((id) => SHOWN.includes(id)) && members.some((id) => HIDDEN.includes(id));
            });
            assert.isDefined(mixed, "a group the filter cuts");
            const group = mixed ?? groups[0];
            const name = group.name ?? String(group.group);
            const shown = membersOf(group.group).filter((id) => SHOWN.includes(id)).length;

            await userEvent.click(
                within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Table" }),
            );
            const dock = await screen.findByRole("region", { name: "Table" });
            await userEvent.click(within(dock).getByRole("tab", { name: "Louvain" }));
            await userEvent.click(await within(dock).findByRole("button", { name: `${name} options` }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Show members in table" }));
            await within(dock).findByText(`${String(shown)} node${shown === 1 ? "" : "s"}`);
            assert.isNotNull(within(dock).getByRole("radiogroup", { name: "Records" }));
        });

        it("keeps the Graph place's graph when a filter hides every node: no Add data to start", async () => {
            const { element, session } = await openRing();
            await act(async () => {
                await session.visibility.set({ kind: "member", of: { nodes: [] } });
                await element.waitForSettled();
            });
            await waitFor(() => {
                assert.strictEqual(session.visibility.summary.visibleNodes, 0);
            });
            assert.isNull(screen.queryByText("Add data to start"));
        });

        it("adds no showing counts to the Overview for a filter that hides nothing, as the table does", async () => {
            const { element, session } = await openRing();
            await act(async () => {
                await session.visibility.set({ kind: "member", of: { nodes: IDS } });
                await element.waitForSettled();
            });
            await waitFor(() => {
                assert.isNotNull(inspector().getByRole("group", { name: "Nodes" }));
            });
            assert.isNull(inspector().queryByRole("group", { name: "Nodes showing" }));
        });

        it.runIf(experiment)("offers Run, not Add PageRank layer, beside a card's whole-graph run", async () => {
            const { element, session } = await openRing();
            // A filter card's run: over the whole graph, painting nothing.
            await act(async () => {
                await session.runs.start("pagerank", undefined, { scope: "graph", style: false });
            });
            await showHalf(element, session);
            await userEvent.click(
                within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Analyze" }),
            );
            await userEvent.type(await screen.findByPlaceholderText("Filter analyses"), "PageRank");
            await userEvent.click((await screen.findAllByText("PageRank", { exact: true }))[0]);
            assert.isNotNull(await screen.findByRole("button", { name: "Run PageRank" }));
            assert.isNull(screen.queryByRole("button", { name: "Add PageRank layer" }));
        });

        it("opens the table's Export... on Shown while the table lists what is shown", async () => {
            const { element, session } = await openRing();
            await showHalf(element, session);
            await userEvent.click(
                within(screen.getByRole("toolbar", { name: "Canvas tools" })).getByRole("button", { name: "Table" }),
            );
            const dock = await screen.findByRole("region", { name: "Table" });
            await userEvent.click(within(dock).getByRole("button", { name: "Table options" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Export..." }));
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            await waitFor(() => {
                assert.strictEqual(
                    within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Scope" }).value,
                    "Shown 6 of 12",
                );
            });
        });
    });
}
