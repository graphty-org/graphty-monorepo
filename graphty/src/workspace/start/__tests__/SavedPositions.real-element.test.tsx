/**
 * A file whose nodes all carry saved positions opens where it was saved, on the REAL
 * graphty-element (issue #9281): a GEXF with a viz:position on every node, dropped on the start
 * screen, opens on the fixed layout with each node at its stored coordinate, not in a new force
 * layout. A file with no positions still opens on the force layout every project starts with.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { render, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Where the file puts each node (Gephi's viz:position is y up, as the element draws). */
const SAVED: Readonly<Record<string, readonly [number, number]>> = { a: [0, 0], b: [10, 0], c: [0, 20] };

/** A GEXF placing every node of {@link SAVED}. */
const PLACED_GEXF = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">',
    '<graph defaultedgetype="undirected"><nodes>',
    ...Object.entries(SAVED).map(
        ([id, [x, y]]) => `<node id="${id}" label="${id}"><viz:position x="${x}" y="${y}" z="0"/></node>`,
    ),
    '</nodes><edges><edge id="e1" source="a" target="b"/><edge id="e2" source="a" target="c"/></edges></graph></gexf>',
].join("\n");

/**
 * Drops a file as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param file - the file.
 */
function drop(file: File): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * Drops a file on the start screen and waits for the project's element to hold its nodes.
 * @param file - the file.
 * @param nodes - how many nodes it holds.
 * @returns the project's session.
 */
async function openOnStart(file: File, nodes: number): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore()} />);
    drop(file);
    return waitFor(() => {
        // The start screen draws a graph of its own; the project's element is the other one.
        const session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
        assert.strictEqual(session?.data.nodes().length, nodes);
        return session;
    });
}

/**
 * Where the element draws a node.
 * @param session - the session.
 * @param id - the node.
 * @returns its x and y.
 */
function drawnAt(session: GraphSession, id: string): readonly [number, number] {
    const snapshot = session.snapshot();
    for (let row = 0; row < snapshot.nodeCount; row++) {
        if (String(snapshot.ids.idOf(row)) === id) {
            const at = { x: 0, y: 0, z: 0 };
            session.positions.read(row, at);
            return [at.x, at.y];
        }
    }
    throw new Error(`no node ${id}`);
}

describe("opening a file with saved positions", () => {
    it("opens a GEXF with viz:position where it was saved, on the fixed layout", async () => {
        const session = await openOnStart(new File([PLACED_GEXF], "saved.gexf"), 3);
        await waitFor(() => {
            assert.strictEqual(session.layout.id, "fixed", "every node placed: the file's drawing is kept");
        });
        // The fixed layout may draw the file at its own scale: every node keeps the file's shape.
        await waitFor(() => {
            const [ax, ay] = drawnAt(session, "a");
            const [bx, by] = drawnAt(session, "b");
            const unit = (bx - ax) / SAVED.b[0];
            assert.isAbove(unit, 0, "b is to the right of a, as saved");
            assert.closeTo(by - ay, 0, 1e-6, "b level with a");
            const [cx, cy] = drawnAt(session, "c");
            assert.closeTo(cx - ax, 0, 1e-6, "c above a");
            assert.closeTo(cy - ay, SAVED.c[1] * unit, 1e-6, "c twice as far as b, as saved");
        });
    });

    it("opens a file with no positions on the force layout the project starts with", async () => {
        const session = await openOnStart(new File(["source,target\na,b\nb,c\n"], "plain.csv"), 3);
        await waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        assert.strictEqual(session.layout.id, "force");
    });
});
