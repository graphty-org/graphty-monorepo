/**
 * The Undo button on the REAL graphty-element names each kind of step it would take back: a kept
 * set's changes, hiding and showing nodes, showing hidden nodes faintly, pinning and releasing
 * nodes, laying out part or all of the graph, a result's rename and move, merging nodes, collapsing
 * and expanding a group, column settings, annotations, filter steps, layer moves, the default rows
 * and a project shader's changes. Each step runs through the
 * session; the test reads the Undo button's name, which is what its tooltip shows.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, NodeId } from "@graphty/graphty-element/session";
import { assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { GRAPH_FILE_GML } from "../../data-place/fixtures";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Renders the workspace, waits for the session and loads the small graph file (8 nodes, 9 edges).
 * @returns the session, the chrome store and the first two node ids.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore; ids: NodeId[] }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    const ids = session.data
        .nodes()
        .slice(0, 2)
        .map((node) => node.id);
    return { session, store, ids };
}

/** The Undo button's name as the test last read it, so the next read waits for the next step. */
let lastName = "";

/**
 * Waits until the Undo button names a new step, then checks it names this one.
 * @param words - what follows "Undo".
 * @returns the button.
 */
async function undoNamed(words: string): Promise<HTMLElement> {
    const undo = await waitFor(() => {
        const button = screen.getByRole("button", { name: /^Undo( |$)/ });
        assert.notEqual(button.getAttribute("aria-label") ?? "", lastName);
        return button;
    });
    lastName = undo.getAttribute("aria-label") ?? "";
    assert.equal(lastName, `Undo ${words}`);
    return undo;
}

describe("the Undo button names each kind of step", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });
    beforeEach(() => {
        lastName = "";
    });

    it("names a kept set's rename, change, members and removal", async () => {
        const { session, store, ids } = await openWithGraph();
        const set = session.sets.create({ kind: "fixed", nodes: ids, reading: "induced" }, { name: "Friends" });
        await undoNamed("creating Friends");

        session.sets.rename(set, "Allies");
        await undoNamed("renaming Friends");

        session.sets.redefine(set, { kind: "fixed", nodes: ids.slice(0, 1), reading: "induced" });
        await undoNamed("changing Allies");

        session.sets.addMembers(set, { nodes: ids.slice(1) });
        await undoNamed("changing the members of Allies");

        session.sets.remove(set);
        const undo = await undoNamed("deleting Allies");

        // Undo says what it took back on the status line.
        await userEvent.click(undo);
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Undid deleting Allies");
        });
    });

    it("names hiding and showing nodes, showing hidden nodes faintly, pins and the layout's scope", async () => {
        const { session, ids } = await openWithGraph();
        await session.execute({ op: "visibility.hide", ids, hidden: true });
        await undoNamed("hiding 2 nodes");

        await session.execute({ op: "visibility.hide", ids: ids.slice(0, 1), hidden: false });
        await undoNamed("showing 1 node");

        await session.execute({ op: "visibility.context", show: true });
        await undoNamed("showing context");

        await session.execute({ op: "visibility.context", show: false });
        await undoNamed("hiding context");

        await session.execute({ op: "positions.pin", ids, pinned: true });
        await undoNamed("pinning 2 nodes");

        await session.execute({ op: "positions.pin", ids, pinned: false });
        await undoNamed("releasing 2 nodes");

        await session.execute({ op: "layout.scope", scope: { nodes: ids } });
        await undoNamed("laying out part of the graph");

        await session.execute({ op: "layout.scope", scope: "graph" });
        await undoNamed("laying out the whole graph");
    });

    it("names a result's rename by the result's row", async () => {
        const { session } = await openWithGraph();
        const run = session.runs.start("degree");
        await run;
        await session.runs.rename(run.id, "Ties");
        // The step is named by the result's row, which keeps the method's name.
        await undoNamed("renaming Degree");
    });

    it("names merging nodes, a group's collapse and expand, column settings, annotations and filter steps", async () => {
        const { session, ids } = await openWithGraph();
        await session.data.mergeNodes(ids);
        await undoNamed("merging 2 nodes");

        await session.groups.collapse({ groupBy: "data.group", group: 3 });
        await undoNamed("collapsing group 3");

        await session.groups.expand({ groupBy: "data.group", group: 3 });
        await undoNamed("expanding group 3");

        await session.execute({ op: "data.columns", settings: { hidden: [], types: {}, renamed: {} } });
        await undoNamed("changing the columns");

        await session.execute({ op: "annotations.set", annotations: [] });
        await undoNamed("setting the annotations");

        await session.execute({ op: "visibility.steps", steps: [] });
        await undoNamed("changing the filter steps");
    });

    it("names a result's move, a layer's move, the default rows and a shader's changes", async () => {
        const { session } = await openWithGraph();
        await session.styles.add({
            name: "Big",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        await undoNamed("adding the layer Big");
        const big = session.styles.list().find((each) => each.name === "Big");
        assert.isDefined(big);
        const run = session.runs.start("degree");
        await run;
        // The result's layer comes in on top of Big: Big moving to the top is a step, and so is the
        // result's block moving back to the top.
        await session.execute({ op: "style.patch", action: "move", id: big.id, before: null });
        await undoNamed("moving the layer Big");
        await session.execute({ op: "algo.move", runId: run.id, before: null });
        await undoNamed("moving Degree");

        await session.execute({ op: "style.patch", action: "addDefaultRows" });
        await undoNamed("adding the default rows");

        // A project shader is named as the catalog names it ("Shader" for one that declares no name),
        // and "a shader" once the catalog no longer holds it.
        const shader = {
            op: "shader.set",
            id: "user/glow",
            text: "vec4 shade(NodeInput n) { return n.color; }",
        } as const;
        await session.execute(shader);
        await undoNamed("adding the shader Shader");
        await session.execute({ ...shader, text: "vec4 shade(NodeInput n) { return vec4(1.0); }" });
        await undoNamed("changing the shader Shader");
        await session.execute({ ...shader, text: null });
        await undoNamed("removing a shader");
    });
});
