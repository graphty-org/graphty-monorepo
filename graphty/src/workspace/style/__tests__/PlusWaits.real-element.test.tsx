/**
 * A section's "+" on the REAL graphty-element, driven by real clicks and keys: adding a property
 * writes nothing, so the drawing and the key stay as they are until the reader picks a value. Its
 * line shows what the row's elements draw now. Covered: a node a layer draws as a cube (Shape and
 * Fill on the node's own Style tab, and Escape taking a waiting line back), an existing layer's
 * Shape, and a selection over a size binding.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Layout steps taken before the first frame is drawn, so the layout is at rest when it is. */
const PRE_STEPS = 1000;

/** Six nodes in a ring, each with a number. */
const RING_GML = `graph [
  directed 0
${[1, 2, 3, 4, 5, 6].map((n) => `  node [ id ${String(n)} name "n${String(n)}" weight ${String(n * 10)} ]`).join("\n")}
${[1, 2, 3, 4, 5, 6].map((n) => `  edge [ source ${String(n)} target ${String((n % 6) + 1)} ]`).join("\n")}
]`;

/**
 * The ring in the workspace with its starting rows.
 * @returns the session.
 */
async function openScene(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
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
    // The force layout settles before the first frame: these tests are about the Style panel, not
    // the layout, and a layout left to settle on screen draws a frame per step. On a software GPU
    // each frame holds the page's main thread until it is read back (hundreds of milliseconds on
    // a busy machine), the layout keeps to the clock so it draws on through the whole test, and
    // every click waits behind those frames (issue #4239).
    await session.config.set({ layoutBehavior: { preSteps: PRE_STEPS } });
    await session.data.import({ type: "gml", name: "ring.gml", config: { data: RING_GML } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await session.styles.settled();
    return session;
}

/**
 * The drawing as the element states it: every layer's writes and every node's merged look.
 * @param session - the element's session.
 * @returns the state, as text.
 */
function drawing(session: GraphSession): string {
    return JSON.stringify({
        layers: session.styles.list().map((layer) => [layer.id, layer.set, layer.encode, layer.selector]),
        nodes: session.data.nodes().map((node) => session.styles.explain({ node: node.id }).merged),
        legend: session.styles.legend(),
    });
}

/**
 * Selects nodes and opens the selection's Style tab.
 * @param session - the element's session.
 * @param nodes - the node ids.
 */
async function styleSelection(session: GraphSession, nodes: string[]): Promise<void> {
    await act(async () => {
        await session.selection.apply({ nodes });
    });
    await userEvent.click(await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));
}

/**
 * Clicks a section's "+" and, when it opens a menu, the property.
 * @param section - the section's name, as "Add to node <section>" reads.
 * @param item - the menu item, when the "+" opens a menu.
 */
async function plus(section: string, item?: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: `Add to node ${section}` }));
    if (item !== undefined) {
        await userEvent.click(await screen.findByRole("menuitem", { name: item }));
    }
}

/**
 * The line "+" just added, once it is drawn.
 * @param channel - its channel.
 * @returns the line.
 */
async function lineOf(channel: string): Promise<HTMLElement> {
    return waitFor(() => {
        const line = screen.getByTestId("style-tab").querySelector<HTMLElement>(`[data-line="${channel}"]`);
        assert.isNotNull(line);
        return line;
    });
}

describe("a section's '+' waits for a value", () => {
    it("on a node a layer draws as a cube: Shape and Fill change nothing until a shape is picked", async () => {
        const session = await openScene();
        await session.styles.add({
            name: "Cubes",
            target: "node",
            selector: { match: "ids", nodes: ["1", "2"] },
            set: { "node.shape": "box" },
        });
        await session.styles.settled();
        await styleSelection(session, ["1"]);
        const before = drawing(session);

        await plus("shape", "Shape");
        const shape = await lineOf("node.shape");
        // The line starts at the cube the node draws now: the field is named for it.
        within(shape).getByRole("combobox", { name: /Box$/ });
        await plus("fill");
        const fill = await lineOf("node.color");
        await session.styles.settled();
        assert.strictEqual(drawing(session), before, "the drawing and the key are unchanged");
        await waitFor(() => {
            assert.isTrue(fill.contains(document.activeElement), "focus in the new Fill line");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.getByTestId("style-tab").querySelector('[data-line="node.color"]'), "Escape drops it");
        });
        assert.strictEqual(drawing(session), before, "still nothing written");

        await userEvent.click(within(shape).getByRole("combobox"));
        await userEvent.keyboard("Torus{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.styles.explain({ node: "1" }).merged["node.shape"], "torus");
        });
        assert.strictEqual(session.styles.explain({ node: "2" }).merged["node.shape"], "box");
    });

    it("on a layer's own row: Shape writes nothing and the key gains no entry until a shape is picked", async () => {
        const session = await openScene();
        const layer = await session.styles.add({
            name: "Some",
            target: "node",
            selector: { match: "ids", nodes: ["3", "4"] },
            set: { "node.color": "#E8590C" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Some, / }));
        await screen.findByTestId("style-tab");
        const before = drawing(session);

        await plus("shape", "Shape");
        const shape = await lineOf("node.shape");
        await session.styles.settled();
        assert.strictEqual(drawing(session), before, "nothing written, nothing in the key");

        await userEvent.click(within(shape).getByRole("combobox"));
        await userEvent.keyboard("Torus{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(layer.id)?.set?.["node.shape"], "torus");
        });
        await session.styles.settled();
        assert.notStrictEqual(
            JSON.stringify(session.styles.legend()),
            JSON.stringify(JSON.parse(before).legend),
            "the key lists the shape once it is picked",
        );
    });

    it("on a selection over a size binding: Size keeps the bound sizes and the size key", async () => {
        const session = await openScene();
        await session.styles.add({
            name: "By weight",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.weight" } },
        });
        await session.styles.settled();
        await styleSelection(session, ["1", "5"]);
        const before = drawing(session);

        await plus("shape", "Size");
        await lineOf("node.size");
        await session.styles.settled();
        assert.strictEqual(drawing(session), before, "the bound sizes and their key entry stay");
    });
});
