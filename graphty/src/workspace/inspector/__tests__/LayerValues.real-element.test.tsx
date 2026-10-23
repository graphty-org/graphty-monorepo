/**
 * A layer row's Values tab on the REAL graphty-element, on Les Miserables (77 characters), reached
 * by real clicks: Degree's histogram states the run's minimum, median and maximum; Louvain's
 * group sizes add up to every node and a click on one selects that many; the route lists its
 * steps in order; Selected lists the node a click on the canvas selected; the painted counts are
 * the element's.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { channelWord } from "../../style/words";
import { Workspace } from "../../Workspace";
import { formatNumber } from "../words";

/** A hang guard for the element coming up and runs finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Renders the workspace and loads Les Miserables.
 * @returns the session, the element and the store.
 */
async function open(): Promise<{
    session: GraphSession;
    element: HTMLElementTagNameMap["graphty-element"];
    store: WorkspaceStore;
}> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, inspected: null });
    render(<Workspace store={store} />);
    const element = await waitFor(
        () => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    const session = element?.session;
    if (element === null || session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.styles.settled();
    return { session, element, store };
}

/**
 * Runs an algorithm and returns the first layer it painted with.
 * @param session - the session.
 * @param algorithm - the algorithm.
 * @param params - its settings.
 * @returns the run's id and its layer.
 */
async function runLayer(
    session: GraphSession,
    algorithm: string,
    params: Record<string, unknown> = {},
): Promise<{ runId: string; layer: Layer }> {
    const { runId } = await session.runs.start(algorithm, params);
    await session.styles.settled();
    const layer = session.runs
        .bindings(runId)
        .map((id) => session.styles.get(id))
        .find((l) => l !== undefined);
    assert.isDefined(layer, `${algorithm} paints a layer`);
    if (layer === undefined) {
        throw new Error("no layer");
    }
    return { runId, layer };
}

/**
 * Opens a row in the inspector and clicks its Values tab.
 * @param store - the store.
 * @param rowId - the row.
 * @returns the inspector.
 */
async function openValues(store: WorkspaceStore, rowId: string): Promise<HTMLElement> {
    store.set({ inspected: { kind: "layer-row", id: rowId } });
    const inspector = await screen.findByRole("complementary", { name: "Inspector" });
    await userEvent.click(await within(inspector).findByRole("tab", { name: "Values" }));
    return inspector;
}

/**
 * A stat row's value.
 * @param scope - where the row is.
 * @param name - the row's name.
 * @returns its value's text.
 */
function statValue(scope: HTMLElement, name: string): string {
    return within(scope).getByRole("group", { name }).querySelector("[data-testid=data-row-value]")?.textContent ?? "";
}

/**
 * Checks the Where its look shows section against `styles.counts`.
 * @param session - the session.
 * @param inspector - the inspector.
 * @param layer - the layer.
 */
function assertPainted(session: GraphSession, inspector: HTMLElement, layer: Layer): void {
    const counts = session.styles.counts(layer.id);
    const painted = within(inspector).getByRole("group", { name: "Where its look shows" });
    const entries = Object.entries(counts.painted);
    assert.isNotEmpty(entries);
    for (const [channel, n] of entries) {
        const name = `Node ${channelWord(channel as Parameters<typeof channelWord>[0]).toLowerCase()}`;
        assert.match(
            statValue(painted, name),
            new RegExp(`^on ${formatNumber(n ?? 0)} of ${formatNumber(counts.matched)} nodes?$`),
        );
    }
}

describe("a layer row's Values tab on the real element", () => {
    it("Degree: a histogram with the run's minimum, median and maximum, and the painted counts", async () => {
        const { session, store } = await open();
        const { runId, layer } = await runLayer(session, "degree");
        const inspector = await openValues(store, layer.row ?? layer.id);
        const summary = session.runs.get(runId)?.result?.summary();
        assert.isDefined(summary);
        const spread = await within(inspector).findByTestId("values-spread");
        assert.equal(statValue(spread, "Lowest"), formatNumber(summary?.min ?? 0));
        assert.equal(statValue(spread, "Median"), formatNumber(summary?.median ?? 0));
        assert.equal(statValue(spread, "Highest"), formatNumber(summary?.max ?? 0));
        assert.isNotEmpty(within(inspector).getAllByTestId("histogram-bar"));
        assert.equal(statValue(inspector, "Matched nodes"), formatNumber(session.styles.counts(layer.id).matched));
        assertPainted(session, inspector, layer);
    });

    it("Louvain: group sizes add up to every node, and a click on one selects that many", async () => {
        const { session, store } = await open();
        const { layer } = await runLayer(session, "louvain");
        const inspector = await openValues(store, layer.row ?? layer.id);
        const header = await within(inspector).findByText("Groups, largest first");
        const section = header.closest<HTMLElement>("[role=group]");
        assert.isNotNull(section);
        if (section === null) {
            return;
        }
        const more = within(section).queryByRole("button", { name: /^\d+ more$/ });
        if (more !== null) {
            await userEvent.click(more);
        }
        const rows = await waitFor(() => {
            const found = [...section.querySelectorAll<HTMLElement>("[data-testid=data-row-button]")];
            assert.lengthOf(found, session.styles.categories(layer.id, "node.color").length);
            return found;
        });
        const sizes = rows.map((row) => Number(row.querySelector("[data-testid=data-row-value]")?.textContent));
        assert.equal(
            sizes.reduce((sum, n) => sum + n, 0),
            77,
        );
        await userEvent.click(rows[0]);
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, sizes[0], "the group's nodes are selected");
        });
    });

    it("Louvain: a category list with one Summary, no histogram of community numbers", async () => {
        const { session, store } = await open();
        const { layer } = await runLayer(session, "louvain");
        const inspector = await openValues(store, layer.row ?? layer.id);
        await within(inspector).findByText("Groups, largest first");
        assert.lengthOf(within(inspector).getAllByRole("group", { name: "Covers" }), 1);
        assert.isEmpty(within(inspector).queryAllByTestId("histogram-bar"));
        assert.isNull(within(inspector).queryByTestId("values-spread"));
        // The values read are a section of their own, not a header row whose next row reads as its value.
        assert.isNotNull(within(inspector).getByRole("group", { name: "Values read" }));
        await page.screenshot({
            path: "../../../../../design/ui/studio/tier3/build/key-values-settings/louvain-values.png",
        });
    });

    it("a route lists its steps in order", async () => {
        const { session, store } = await open();
        const ids = session.data.nodes().map((node) => node.id);
        const { runId, layer } = await runLayer(session, "shortest-path", {
            source: ids[0],
            target: ids[ids.length - 1],
        });
        const order = (session.runs.get(runId)?.result?.ranking("order") ?? [])
            .filter((entry) => Number.isFinite(entry.value))
            .sort((a, b) => a.value - b.value)
            .map((entry) => String(entry.id));
        assert.isAtLeast(order.length, 3);
        const inspector = await openValues(store, layer.row ?? layer.id);
        const steps = await within(inspector).findByRole("group", { name: "Nodes in order" });
        const names = [...steps.querySelectorAll("[data-testid=data-row-button] .cm-data-row-name")].map(
            (name) => name.textContent,
        );
        assert.deepEqual(names, order);
        assert.lengthOf(within(inspector).getAllByRole("group", { name: "Covers" }), 1);
    });

    it("Selected lists the node a real click on the canvas selected", async () => {
        const { session, element, store } = await open();
        await session.config.set({ startingRows: true, editableBase: true });
        await session.styles.settled();
        await element.waitForStableFrame();
        const id = session.data.nodes()[11]?.id;
        assert.isDefined(id);
        // The force layout may still be moving, so the click is made where the element says the
        // node is now, and made again until the element selects it.
        await waitFor(
            async () => {
                const at = element.nodeScreenPosition(id ?? "");
                assert.isTrue(at?.visible);
                assert.equal(element.elementAt({ x: at?.x ?? 0, y: at?.y ?? 0 })?.id, id);
                await userEvent.click(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
                assert.deepEqual(session.selection.nodes, [id]);
            },
            { timeout: TIMEOUT_MS },
        );
        const selected = session.styles
            .list()
            .find((l) => l.selector.match === "state" && l.selector.state === "selected" && l.target === "node");
        assert.isDefined(selected, "the starting Selected layer");
        const inspector = await openValues(store, selected?.row ?? selected?.id ?? "");
        const now = await within(inspector).findByRole("group", { name: "Now" });
        assert.isNotNull(within(now).getByText(String(id)));
        assert.equal(statValue(inspector, "Is selected"), "This view only");
    });

    it("Where its look shows: a covered layer names who covers it, and that row selects what it paints", async () => {
        const { session, store } = await open();
        const base = await session.styles.add({
            name: "Base red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.add({
            name: "Top blue",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#0000ff" },
        });
        await session.styles.settled();
        const inspector = await openValues(store, base.row ?? base.id);
        const shows = await within(inspector).findByRole("group", { name: "Where its look shows" });
        const { matched } = session.styles.counts(base.id);
        assert.match(statValue(shows, "Node color"), new RegExp(`^on 0 of ${formatNumber(matched)} nodes?$`));
        await userEvent.click(within(shows).getByText("Covered by Top blue"));
        await waitFor(() => {
            assert.equal(session.selection.nodes.length, matched);
        });
    });
});
