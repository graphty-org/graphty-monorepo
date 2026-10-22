/**
 * A layer row's count and the canvas key agree with what the layer draws, on the REAL
 * graphty-element: a new layer whose node card matches nothing counts 0, not its edges; an edge-only
 * condition counts its edges and names the layer an edge layer, and still names edges once a node
 * look is added; a size key lists no group a layer above covers; a one-node layer colored by a
 * column keys only its node's value; a size under a layer that fixes some nodes at another size
 * says how many; one group given its own color keeps its place in the key; and a size that is the
 * same for every group is no key.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import VOLUNTEERS from "../../../../../design/ui/studio/tool/files/volunteers.graphml?raw";
import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a repaint, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * The workspace with the element up and one file read.
 * @param file - which file.
 * @returns the session.
 */
async function open(file: "volunteers" | "lesmis"): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: file, id: 1 } })} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await (file === "volunteers"
        ? session.data.import({ type: "graphml", name: "volunteers.graphml", config: { data: VOLUNTEERS } })
        : session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } }));
    await session.styles.settled();
    return session;
}

/**
 * The count a layer row shows.
 * @param name - the row's name.
 * @returns the row and its count's text.
 */
async function rowCount(name: string): Promise<{ row: HTMLElement; count: string }> {
    const tree = screen.getByRole("tree", { name: "Style layers" });
    const row = await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }, { timeout: TIMEOUT_MS });
    return { row, count: row.querySelector(".ws-row-count")?.textContent ?? "" };
}

/**
 * A key section's row names, top first.
 * @param title - the section's title.
 * @returns the names.
 */
async function keyRows(title: string): Promise<string[]> {
    const legend = await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
    const section = await within(legend).findByRole("group", { name: title }, { timeout: TIMEOUT_MS });
    return [...section.querySelectorAll(".cm-data-row-name")].map((name) => name.textContent ?? "");
}

describe("layer rows and the key agree with what a layer draws", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("counts a new layer's nodes when its node card matches none, not its edges", async () => {
        const session = await open("volunteers");
        const added = await session.styles.addRow({
            name: "Layer 1",
            target: "both",
            selector: { match: "everything" },
        });
        if (added.node === undefined) {
            throw new Error("the row has no node half");
        }
        await session.styles.update(added.node, {
            selector: { match: "rule", where: { kind: "categories", attribute: "data.role", values: ["nobody"] } },
        });
        await session.styles.settled();
        await waitFor(async () => {
            const { row, count } = await rowCount("Layer 1");
            assert.equal(count, "0");
            assert.equal(row.getAttribute("aria-label"), "Layer 1, node layer, 0 nodes");
        });
    });

    it("counts an edge-only condition's edges and calls the layer an edge layer", async () => {
        const session = await open("lesmis");
        const added = await session.styles.addRow({
            name: "Layer 1",
            target: "both",
            selector: { match: "everything" },
        });
        if (added.edge === undefined) {
            throw new Error("the row has no edge half");
        }
        await session.styles.update(added.edge, {
            selector: { match: "rule", where: { kind: "range", attribute: "data.shared_chapters", min: 5, max: 31 } },
        });
        await session.styles.settled();
        const edges = session.styles.counts(added.edge).matched;
        assert.isAbove(edges, 0);
        assert.notEqual(edges, session.data.nodes().length);
        await waitFor(async () => {
            const { row, count } = await rowCount("Layer 1");
            assert.equal(count, String(edges));
            assert.equal(row.getAttribute("aria-label"), `Layer 1, edge layer, ${String(edges)} edges`);
        });
    });

    it("keeps an edge-only condition's layer an edge layer when a node look is added", async () => {
        const session = await open("lesmis");
        const added = await session.styles.addRow({
            name: "Layer 1",
            target: "both",
            selector: { match: "everything" },
        });
        if (added.edge === undefined || added.node === undefined) {
            throw new Error("the row has no edge or no node half");
        }
        await session.styles.update(added.edge, {
            selector: { match: "rule", where: { kind: "range", attribute: "data.shared_chapters", min: 5, max: 31 } },
        });
        await session.styles.update(added.node, { set: { "node.color": "#ff0000" } });
        await session.styles.settled();
        await waitFor(async () => {
            const { row } = await rowCount("Layer 1");
            assert.match(row.getAttribute("aria-label") ?? "", /^Layer 1, node and edge layer, /);
        });
    });

    it("lists no group in a size key that a layer above covers on every node", async () => {
        const session = await open("volunteers");
        await session.styles.addRow({
            name: "Roles",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.size": { by: "data.role", scale: "ordinal", map: { volunteer: 1, staff: 2, board: 3 } },
            },
        });
        await session.styles.addRow({
            name: "Board",
            target: "node",
            selector: { match: "rule", where: { kind: "categories", attribute: "data.role", values: ["board"] } },
            set: { "node.size": 4 },
        });
        await session.styles.settled();
        await waitFor(async () => {
            const rows = await keyRows("Size: role");
            assert.sameMembers(rows, ["volunteer", "staff"]);
        });
    });

    it("keys only the value a one-node layer's node holds", async () => {
        const session = await open("volunteers");
        const node = session.data.nodes()[0];
        await session.styles.addRow({
            name: "One",
            target: "node",
            selector: { match: "ids", nodes: [node.id] },
            encode: { "node.color": { by: "data.role", scale: "ordinal" } },
        });
        await session.styles.settled();
        const rows = await keyRows("Color: role");
        assert.deepEqual(rows, [String(node.role)]);
    });

    it("says how many of a size's nodes a layer above fixes at another size", async () => {
        const session = await open("volunteers");
        await session.styles.addRow({
            name: "By hours",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.hours", range: [1, 3] } },
        });
        const ids = session.data.nodes().map((node) => node.id);
        await session.styles.addRow({
            name: "Picked",
            target: "node",
            selector: { match: "ids", nodes: ids.slice(0, 3) },
            set: { "node.size": 4 },
        });
        await session.styles.settled();
        const legend = await screen.findByRole("region", { name: "Legend" }, { timeout: TIMEOUT_MS });
        const section = await within(legend).findByRole("group", { name: "Size: hours" }, { timeout: TIMEOUT_MS });
        await waitFor(() => {
            assert.include(section.textContent, "3 nodes covered by Picked");
        });
    });

    it("keeps a group's place in the key when it gets its own color, and keys no size that never varies", async () => {
        const session = await open("volunteers");
        const layer = await session.styles.add({
            name: "Roles",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.color": { by: "data.role", scale: "ordinal" },
                "node.size": { by: "data.role", scale: "ordinal", map: { volunteer: 2, staff: 2, board: 2 } },
            },
        });
        await session.styles.settled();
        const order = session.styles.groups(layer.id, "data.role").map((group) => String(group.value));
        assert.lengthOf(order, 3);
        assert.deepEqual(await keyRows("Color: role"), order, "the key lists the groups as the table does");

        await session.styles.setValueEntry(layer.id, "node.color", order[2], "#ff0000");
        await session.styles.settled();
        await waitFor(async () => {
            assert.deepEqual(await keyRows("Color: role"), order, "the recolored group keeps its place");
        });
        const legend = screen.getByRole("region", { name: "Legend" });
        assert.isNull(within(legend).queryByRole("group", { name: "Size: role" }), "every role is size 2");
    });
});
