/**
 * What the inspector opens, on the REAL graphty-element: a "Why this look" link opens the layer
 * that paints the node, a group's Style is its layer's, a row an undo removed gives way to the
 * selection, a click on the node already selected brings it back, a node a filter hides leaves it,
 * and every column of the node's kind shows, an empty one as "No value". A click on empty canvas
 * closes an open row and a right-click there keeps it; while the selection workspace is open no
 * canvas click moves the inspector, which follows the selection once Done closes it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { act, render, screen, waitFor, type Within, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Two rings of six joined by one bridge; every node but the last carries a phone. */
const NODES = Array.from({ length: 12 }, (_, i) => ({
    id: `n${String(i)}`,
    label: `Node ${String(i)}`,
    ...(i === 11 ? {} : { phone: `555-01${String(i).padStart(2, "0")}` }),
}));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }];

/**
 * The workspace holding the two rings, once the element's session has come up.
 * @returns the session and the store.
 */
async function openRings(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Two rings", id: 1 } });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    // The starting rows the app gives every project it opens: Everything, Selected, Hovered.
    await session.config.set({
        startingRows: true,
        editableBase: true,
        runPlacement: "top",
        data: { knownFields: { nodeLabelPath: "label" } },
    });
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return { session, store };
}

/**
 * Louvain, each group painted as a layer of its own in a folder, as the study's projects hold it.
 * @param session - the session.
 * @returns the run's id.
 */
async function louvainAsLayers(session: GraphSession): Promise<string> {
    const run = session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
    await act(async () => {
        await run;
        await session.styles.settled();
    });
    return run.id;
}

/**
 * Selects one node, as picking it in the find list does.
 * @param session - the session.
 * @param id - the node.
 */
async function pick(session: GraphSession, id: string): Promise<void> {
    await act(async () => {
        await session.selection.apply({ nodes: [id] });
    });
}

/**
 * The inspector region.
 * @returns queries scoped to it.
 */
const inspector = (): Within => within(screen.getByRole("complementary", { name: "Inspector" }));

/**
 * What the inspector draws now.
 * @returns its kind.
 */
const drawn = (): string | null | undefined =>
    screen
        .getByRole("complementary", { name: "Inspector" })
        .querySelector("[data-inspected]")
        ?.getAttribute("data-inspected");

/**
 * The style tree row of the layer that won a node's color.
 * @param session - the session.
 * @param node - the node.
 * @returns the row's id.
 */
function colorRowOf(session: GraphSession, node: string): string {
    const painter = session.styles.explain({ node }).channels.find((c) => c.channel === "node.color");
    if (painter === undefined) {
        throw new Error(`nothing paints ${node}'s color`);
    }
    return session.styles.get(painter.layerId)?.row ?? painter.layerId;
}

/**
 * A node's color as the element paints it.
 * @param session - the session.
 * @param node - the node.
 * @returns the color as lower-case hex.
 */
const colorOf = (session: GraphSession, node: string): string | undefined =>
    session.styles.explain({ node }).merged["node.color"]?.hex.slice(0, 7).toLowerCase();

/**
 * The drawn element, once its layout has settled and a frame is stable.
 * @returns the element.
 */
async function settledElement(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        throw new Error("no element");
    }
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * A point on the canvas that is no node and no edge, as the element would pick it.
 * @param element - the element.
 * @returns the point, in the element's own pixels.
 */
async function emptyPoint(element: HTMLElementTagNameMap["graphty-element"]): Promise<{ x: number; y: number }> {
    return waitFor(() => {
        const { width, height } = element.getBoundingClientRect();
        for (const point of [
            { x: 12, y: height - 12 },
            { x: width - 12, y: height - 12 },
            { x: width / 2, y: height - 12 },
            { x: 12, y: height / 2 },
        ]) {
            if (element.elementAt(point) === null) {
                return point;
            }
        }
        throw new Error("no empty point on the canvas");
    });
}

describe("what the inspector opens, on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("a Why this look link opens the layer that paints the node, and its color repaints that group only", async () => {
        const { session, store } = await openRings();
        await louvainAsLayers(session);
        await pick(session, "n3");
        await userEvent.click(await inspector().findByRole("tab", { name: "Style" }));

        const lines: HTMLElement[] = await inspector().findAllByTestId("why-line");
        // One list item per row, each a link, the Everything row too.
        for (const line of lines) {
            assert.equal(line.tagName, "LI");
            assert.lengthOf(within(line).getAllByRole("button"), 1, `${line.textContent} is a link`);
        }
        assert.isDefined(
            lines.find((line) => line.textContent.startsWith("Everything")),
            lines.map((line) => line.textContent).join(" | "),
        );

        const row = colorRowOf(session, "n3");
        const other = session.data.nodes().find((n) => colorRowOf(session, String(n.id)) !== row);
        if (other === undefined) {
            throw new Error("Louvain left one group");
        }
        const otherBefore = colorOf(session, String(other.id));
        const color = lines.find((line) => line.textContent.startsWith("Louvain / "));
        if (color === undefined) {
            throw new Error("no line names Louvain's group");
        }
        assert.include(color.textContent, "Color");
        await userEvent.click(within(color).getByRole("button"));
        assert.deepEqual(store.get().inspected, { kind: "layer-row", id: row, tab: "style" });
        // Focus lands on the Color line the link explained, not on the opened row's heading.
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest('[data-line="node.color"]') ?? null);
        });

        // The opened layer's Color is the node's own; red there repaints its group only.
        const hex = (colorOf(session, "n3") ?? "").slice(1).toUpperCase();
        const box = (await inspector().findAllByRole("textbox", { name: /color/i })).find(
            (field: HTMLElement) => (field as HTMLInputElement).value.toUpperCase() === hex,
        );
        if (box === undefined) {
            throw new Error("the opened layer shows no Color holding the node's color");
        }
        await userEvent.clear(box);
        await userEvent.type(box, "FF0000{Enter}");
        await act(async () => {
            await session.styles.settled();
        });
        await waitFor(() => {
            assert.equal(colorOf(session, "n3"), "#ff0000");
        });
        assert.equal(colorOf(session, String(other.id)), otherBefore, "another group keeps its color");
    });

    it("the Everything line of Why this look lands on the Color line it explains", async () => {
        const { session, store } = await openRings();
        await pick(session, "n3");
        await userEvent.click(await inspector().findByRole("tab", { name: "Style" }));
        const lines: HTMLElement[] = await inspector().findAllByTestId("why-line");
        const everything = lines.find((line) => line.textContent.startsWith("Everything"));
        if (everything === undefined) {
            throw new Error(lines.map((line) => line.textContent).join(" | "));
        }
        assert.include(everything.textContent, "Color");
        await userEvent.click(within(everything).getByRole("button"));
        await waitFor(() => {
            assert.equal(store.get().inspected?.tab, "style");
            const focused = document.activeElement;
            assert.isNotNull(focused?.closest('[data-line="node.color"]') ?? null, focused?.outerHTML.slice(0, 200));
        });
    });

    it("a group's Style is its layer's when the run paints each group as a layer", async () => {
        const { session, store } = await openRings();
        const id = await louvainAsLayers(session);
        const group = session.runs.get(id)?.result?.summary().groups?.[0];
        if (group === undefined) {
            throw new Error("Louvain made no groups");
        }
        act(() => {
            store.set({ inspected: { kind: "group-row", id: JSON.stringify([id, group.group]) } });
        });
        await waitFor(() => {
            assert.equal(drawn(), "group-row");
        });
        assert.isNull(inspector().queryByText("This run paints nothing by group"));
        assert.isNotEmpty(await inspector().findAllByRole("textbox", { name: /color/i }));
    });

    it("an undo that removes the open row returns the inspector to the selection", async () => {
        const { session, store } = await openRings();
        const id = await louvainAsLayers(session);
        await pick(session, "n3");
        act(() => {
            store.set({ inspected: { kind: "layer-row", id: colorRowOf(session, "n3") } });
        });
        await waitFor(() => {
            assert.equal(drawn(), "layer-row");
        });
        await act(async () => {
            await session.undo();
        });
        await waitFor(() => {
            assert.isUndefined(session.runs.get(id));
            assert.equal(drawn(), "node");
        });
        assert.isNull(inspector().queryByText("This row is gone"));
        assert.isNull(store.get().inspected);
    });

    it("a click on the node already selected brings its inspector back", async () => {
        const { session, store } = await openRings();
        const id = await louvainAsLayers(session);
        await pick(session, "n3");
        const group = session.runs.get(id)?.result?.node("n3")?.group;
        act(() => {
            store.set({ inspected: { kind: "group-row", id: JSON.stringify([id, group]) } });
        });
        await waitFor(() => {
            assert.equal(drawn(), "group-row");
        });
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("no element");
        }
        // The node's center once the layout has settled, and the drawing answers n3 there.
        await element.waitForStableFrame();
        let point: { x: number; y: number } | undefined;
        await waitFor(() => {
            const at = element.nodeScreenPosition("n3");
            point = at?.visible === true ? { x: at.x, y: at.y } : undefined;
            assert.equal(point === undefined ? undefined : element.elementAt(point)?.id, "n3");
        });
        await userEvent.click(element, { position: point });
        await waitFor(() => {
            assert.equal(drawn(), "node");
        });
        assert.deepEqual([...session.selection.nodes], ["n3"]);
    });

    it("every column shows, an empty one as No value, and a filter that hides the node takes it off the inspector", async () => {
        const { session } = await openRings();
        await pick(session, "n11");
        // Every column of the node's kind, as the table lists them.
        const phone = await inspector().findByRole("group", { name: "phone" });
        assert.include(phone.textContent, "No value");
        assert.isNull(inspector().queryByText(/hidden by a filter/));

        await act(async () => {
            await session.visibility.set({ kind: "categories", attribute: "data.label", values: ["Node 0"] });
        });
        // The app reads the working graph, so a filter drops a node it hides from the selection
        // (the owner's decision, 2026-11-06), and the inspector, which shows the selection, lets
        // it go.
        await waitFor(() => {
            assert.isFalse(session.visibility.isVisible("n11"));
            assert.deepEqual([...session.selection.nodes], []);
            assert.isNull(inspector().queryByRole("group", { name: "phone" }));
        });
    });

    it("a click on empty canvas closes an open row; a right-click there asks for a menu and keeps it", async () => {
        const { store } = await openRings();
        const element = await settledElement();
        act(() => {
            store.set({ inspected: { kind: "everything-row" } });
        });
        await waitFor(() => {
            assert.equal(drawn(), "everything-row");
        });
        const point = await emptyPoint(element);

        await userEvent.click(element, { position: point, button: "right" });
        await screen.findByRole("menuitem", { name: /^Select all/ });
        assert.deepEqual(store.get().inspected, { kind: "everything-row" }, "a right-click lets go of nothing");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menuitem", { name: /^Select all/ }));
        });

        await userEvent.click(element, { position: point });
        await waitFor(() => {
            assert.isNull(store.get().inspected);
            assert.equal(drawn(), "graph");
        });
    });

    it("while the selection workspace is open a canvas click never moves the inspector; it follows the selection on Done", async () => {
        const { session, store } = await openRings();
        await session.styles.add({
            name: "Framed",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Framed, / }));
        const framed = await waitFor(() => {
            const open = store.get().inspected;
            assert.equal(open?.kind, "layer-row");
            return open;
        });
        await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
        const ws = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found, "the workspace is open");
            assert.notStrictEqual(found?.style.visibility, "hidden", "and placed");
            return found;
        });
        // Styled draws the layers' own look in the preview; Card colors would paint the rule's groups instead.
        await userEvent.click(within(ws).getByText("Styled"));
        const element = await settledElement();
        // A click on a node selects it in the preview, and the inspector stays on the editor.
        let node: { x: number; y: number } | undefined;
        await waitFor(() => {
            const at = element.nodeScreenPosition("n3");
            node = at?.visible === true ? { x: at.x, y: at.y } : undefined;
            assert.equal(node === undefined ? undefined : element.elementAt(node)?.id, "n3");
        });
        await userEvent.click(element, { position: node });
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["n3"]);
        });
        assert.deepEqual(store.get().inspected, framed);
        assert.isNotNull(document.querySelector(".sel-ws"), "the workspace stays open");

        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            assert.isNull(store.get().inspected);
            assert.equal(drawn(), "node");
        });
    });
});
