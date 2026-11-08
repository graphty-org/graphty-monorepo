/**
 * A filter and the layout, on the REAL graphty-element and Les Miserables, driven by real clicks
 * and keys in the selection workspace (the owner's report, 2026-11-07: "in the filter selection
 * screen it keeps the transparent old nodes and lays out the new ones over the top ... when I click
 * done after filtering it doesn't apply the layout and subsequent layouts seem to be using invisible
 * nodes"). The app reads the working graph (design/working-graph/design.md, section 3):
 *
 * 1. while a filter is edited nothing moves, and no node the filter hides is drawn;
 * 2. Done lays the graph out again over what the filter shows;
 * 3. a layout chosen later lays out only what the filter shows, hidden nodes where they were.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The owner's path is the full-screen selection workspace, the `selection-workspace` experiment.
withFeatures(["selection-workspace"]);

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * Les Miserables in the workspace, on the Graph place, laid out and the Layout tool enabled.
 * @returns the element and its session.
 */
async function openGraph(): Promise<{ element: Element; session: GraphSession }> {
    await page.viewport(1440, 900);
    render(
        <Workspace
            store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })}
            registrations={REGISTRATIONS}
        />,
    );
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element;
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    const tool = screen.getByRole("button", { name: "Layout" });
    await waitFor(() => {
        assert.isFalse(tool.hasAttribute("aria-disabled"));
    });
    await element.waitForSettled();
    await element.waitForStableFrame();
    return { element, session };
}

/**
 * Choose a layout in the Layout popover and apply it, as a reader does.
 * @param element - the element.
 * @param name - the option's name.
 */
async function chooseLayout(element: Element, name: RegExp): Promise<void> {
    await userEvent.click(page.getByRole("button", { name: "Graph", exact: true }));
    await userEvent.click(await screen.findByRole("button", { name: "Layout" }));
    const popover = await screen.findByRole("dialog", { name: "Layout" });
    await userEvent.click(within(popover).getByRole("option", { name }));
    // Flat, so the shown nodes' angles about their centre read the arrangement.
    await userEvent.click(within(within(popover).getByRole("radiogroup", { name: "Shape" })).getByText("2D"));
    await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
    await userEvent.keyboard("{Escape}");
    await element.waitForSettled();
    await element.waitForStableFrame();
}

/**
 * The open workspace, waited for.
 * @returns it.
 */
async function ws(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}

/**
 * Type the first Degree card's lower end.
 * @param value - the lower end.
 */
async function degreeFrom(value: string): Promise<void> {
    const from = await waitFor(() => {
        const card = document.querySelector<HTMLElement>(".sel-ws .sel-card");
        assert.isNotNull(card);
        return within(card ?? document.body).getByRole("textbox", { name: "Degree from, number" });
    });
    await userEvent.clear(from);
    await userEvent.type(from, `${value}{Enter}`);
}

/**
 * Open the Data place's filter: a new one when there is none, else the one there is.
 * @returns the workspace.
 */
async function openFilters(): Promise<HTMLElement> {
    await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
    const list = screen.queryByRole("list", { name: "Filters" });
    const saved = list?.querySelector<HTMLElement>(".dp-filter-name") ?? null;
    await userEvent.click(saved ?? (await screen.findByRole("button", { name: "Add filter" })));
    return ws();
}

/**
 * Press the workspace's Done and wait for what it set off.
 * @param element - the element.
 * @param modal - the workspace.
 */
async function done(element: Element, modal: HTMLElement): Promise<void> {
    await userEvent.click(within(modal).getByRole("button", { name: /^Done/ }));
    await waitFor(() => {
        assert.isNull(document.querySelector(".sel-ws"), "Done closes it");
    });
    await element.waitForSettled();
    await element.waitForStableFrame();
}

/**
 * A new filter from the toolbar: Degree from a lower end, then Done.
 * @param element - the element.
 * @param value - the lower end.
 */
async function filterDegree(element: Element, value: string): Promise<void> {
    const modal = await openFilters();
    // The new card's Value opens its picker.
    if (screen.queryByRole("combobox", { name: "Find attributes, results" }) === null) {
        await userEvent.click(within(modal).getByRole("button", { name: /^Value$/ }));
    }
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard("Degree");
    await userEvent.keyboard("{Enter}");
    await degreeFrom(value);
    await done(element, modal);
}

/**
 * Where every node is, from the element's coordinates.
 * @param session - the session.
 * @returns each node's x, y and z, by id.
 */
function positionsOf(session: GraphSession): Map<string, [number, number, number]> {
    const { ids } = session.data.snapshot();
    const out = new Map<string, [number, number, number]>();
    const at = { x: 0, y: 0, z: 0 };
    for (let row = 0; row < ids.size; row++) {
        if (session.positions.isPlaced(row)) {
            session.positions.read(row, at);
            out.set(String(ids.idOf(row)), [at.x, at.y, at.z]);
        }
    }
    return out;
}

/**
 * The smallest gap, in degrees, between the angles of some nodes about their centre.
 * @param at - every node's position.
 * @param ids - the nodes.
 * @returns the gap: 360 / n for n nodes on a circle of their own.
 */
function smallestGap(at: Map<string, [number, number, number]>, ids: readonly string[]): number {
    const points = ids.map((id) => at.get(id) ?? [Number.NaN, Number.NaN, Number.NaN]);
    const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
    const angles = points.map(([x, y]) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI).sort((a, b) => a - b);
    return Math.min(
        ...angles.map((angle, i) => (i === 0 ? angle + 360 - angles[angles.length - 1] : angle - angles[i - 1])),
    );
}

/**
 * The ids the filter shows, and the ones it hides.
 * @param session - the session.
 * @returns both, as strings.
 */
function shownAndHidden(session: GraphSession): { shown: string[]; hidden: string[] } {
    const { ids } = session.data.snapshot();
    const all = Array.from({ length: ids.size }, (_, row) => String(ids.idOf(row)));
    const shown = new Set([...session.visibility.nodes].map(String));
    return { shown: all.filter((id) => shown.has(id)), hidden: all.filter((id) => !shown.has(id)) };
}

/**
 * The nodes drawn anywhere on the element.
 * @param element - the element.
 * @returns their ids, as strings.
 */
function drawn(element: Element): string[] {
    const { width, height } = element.getBoundingClientRect();
    return element.nodesInRect({ x: 0, y: 0, width, height }).map(String);
}

describe("a filter lays out what it shows", () => {
    it("Done lays the graph out again over what the filter shows, each time", async () => {
        const { element, session } = await openGraph();
        await chooseLayout(element, /^Circle(?!s)/);

        // (2) Done lays the graph out again over what the filter shows: a circle of its own.
        await filterDegree(element, "6");
        const first = shownAndHidden(session);
        assert.isAbove(first.hidden.length, 0, "the filter hides something");
        assert.closeTo(smallestGap(positionsOf(session), first.shown), 360 / first.shown.length, 0.5);

        // Edited and Done again: the new, smaller set on a circle of its own.
        const modal = await openFilters();
        await degreeFrom("8");
        await done(element, modal);
        const second = shownAndHidden(session);
        assert.isBelow(second.shown.length, first.shown.length);
        assert.closeTo(smallestGap(positionsOf(session), second.shown), 360 / second.shown.length, 0.5);
    });

    it("while a filter is edited nothing moves, and no node the filter hides is drawn", async () => {
        const { element, session } = await openGraph();
        await filterDegree(element, "6");
        const { hidden } = shownAndHidden(session);
        assert.isAbove(hidden.length, 0, "the filter hides something");

        // (1) Editing it again: nothing moves, and no node the filter hides is drawn, faint or not.
        const before = positionsOf(session);
        const modal = await openFilters();
        await degreeFrom("8");
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches, "the edit is previewed");
        });
        await element.waitForPainted();
        await element.waitForStableFrame();
        assert.deepEqual(positionsOf(session), before, "nothing moves while the filter is edited");
        const gone = new Set(hidden);
        assert.deepEqual(
            drawn(element).filter((id) => gone.has(id)),
            [],
            "no node the filter hides is drawn while it is edited",
        );
        // Cancel writes nothing, so nothing moves either.
        await userEvent.click(within(modal).getByRole("button", { name: /^Cancel/ }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "Cancel closes it");
        });
        await element.waitForSettled();
        assert.deepEqual(positionsOf(session), before, "Cancel lays nothing out");
    });

    it("a layout chosen after the filter lays out only what it shows, hidden nodes where they were", async () => {
        const { element, session } = await openGraph();
        await filterDegree(element, "6");
        const { shown, hidden } = shownAndHidden(session);
        const before = positionsOf(session);

        // (3) Later layouts ignore the hidden nodes.
        await chooseLayout(element, /^Circle(?!s)/);
        const after = positionsOf(session);
        assert.closeTo(smallestGap(after, shown), 360 / shown.length, 0.5, "the shown nodes on a circle of their own");
        for (const id of hidden) {
            assert.deepEqual(after.get(id), before.get(id), `hidden ${id} stayed where it was`);
        }
    });
});
