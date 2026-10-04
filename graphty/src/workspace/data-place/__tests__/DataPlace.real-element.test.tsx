/**
 * The Data place on the REAL graphty-element: what it lists is what the element reports
 * (`data.source()`, `data.lastImport()`, `data.attributes()`), it follows undo, and its menus act
 * through the element. Every assertion reads the element or the chrome store, never pixels.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML, WIDE_JSON } from "../fixtures";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the workspace on the Data place with a project open and waits for the session.
 * @returns the session and the chrome store.
 */
async function openDataPlace(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return { session, store };
}

/**
 * Imports the small graph file through the element's own import.
 * @param session - the session.
 */
async function importGraphFile(session: GraphSession): Promise<void> {
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
}

/**
 * The tree with this name.
 * @param name - "Sources" or "Attributes".
 * @returns the tree.
 */
const tree = (name: string): HTMLElement => screen.getByRole("tree", { name });

/**
 * Opens a row's context menu from the keyboard, as a reader without a mouse would.
 * @param row - the tree row.
 * @returns the menu.
 */
async function menuOf(row: HTMLElement): Promise<HTMLElement> {
    row.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    return screen.findByRole("menu");
}

describe("the Data place on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "lists the graph file as one source holding a node table and an edge table, and follows undo",
        async () => {
            const { session } = await openDataPlace();
            const place = screen.getByRole("region", { name: "Data place" });
            assert.isNotNull(within(place).getByRole("heading", { name: "Les Miserables" }));
            // Nothing loaded: no source rows.
            assert.isNull(within(place).queryByRole("tree", { name: "Sources" }));

            await importGraphFile(session);

            const file = await within(place).findByRole("treeitem", { name: "les-miserables.gml" });
            const { counts } = session.data.lastImport() ?? assert.fail("no import report");
            assert.include(file.textContent, `${String(counts.nodes)} nodes, ${String(counts.edges)} edges`);
            const nodes = within(tree("Sources")).getByRole("treeitem", { name: "Nodes" });
            assert.include(nodes.textContent, `${String(counts.nodeRecords)} rows, ${String(counts.nodes)} nodes`);
            assert.isNotNull(within(tree("Sources")).getByRole("treeitem", { name: "Edges" }));

            await session.undo();
            await waitFor(() => {
                assert.isNull(within(place).queryByRole("tree", { name: "Sources" }));
            });
        },
        TIMEOUT_MS,
    );

    it(
        "lists every attribute the element describes, with its fill when some elements lack a value",
        async () => {
            const { session } = await openDataPlace();
            await importGraphFile(session);

            const attributes = await screen.findByRole("tree", { name: "Attributes" });
            for (const a of session.data.attributes()) {
                const row = within(attributes).getByRole("treeitem", { name: a.name });
                if (a.completeness < 1) {
                    assert.include(row.textContent, `${String(Math.floor(a.completeness * 100))}%`, a.name);
                }
            }
            const born = session.data.attributes().find((a) => a.kind === "node" && a.name === "born");
            assert.equal(born?.completeness, 0.25);
            // Subheads in the design's order.
            assert.deepEqual(
                within(attributes)
                    .getAllByRole("treeitem")
                    .filter((row) => row.getAttribute("aria-level") === "1")
                    .map((row) => row.getAttribute("aria-label")),
                ["Nodes", "Edges"],
            );
        },
        TIMEOUT_MS,
    );

    it(
        "opens an attribute's inspector on a click, and Edit source... opens the Data page",
        async () => {
            const { session, store } = await openDataPlace();
            await importGraphFile(session);

            await userEvent.click(await screen.findByRole("treeitem", { name: "group" }));
            assert.deepEqual(store.get().inspected, { kind: "attribute", id: "node:group" });

            const menu = await menuOf(within(tree("Sources")).getByRole("treeitem", { name: "les-miserables.gml" }));
            // Rename waits for the element (#894).
            assert.deepEqual(
                within(menu)
                    .getAllByRole("menuitem")
                    .map((item) => item.textContent),
                ["Edit source..."],
            );
            await userEvent.click(within(menu).getByRole("menuitem", { name: "Edit source..." }));
            assert.equal(store.get().page, "data-page");
        },
        TIMEOUT_MS,
    );

    it(
        "Add label line binds a new layer's node label to the attribute, as one undoable step",
        async () => {
            const { session } = await openDataPlace();
            await importGraphFile(session);
            const before = session.styles.list().length;

            const menu = await menuOf(await screen.findByRole("treeitem", { name: "label" }));
            await userEvent.click(within(menu).getByRole("menuitem", { name: "Add label line" }));

            await waitFor(() => {
                assert.equal(session.styles.list().length, before + 1);
            });
            // A new row on top, its node label bound to the column.
            const layer = session.styles.list().at(-1);
            assert.equal(layer?.name, "label");
            assert.include(JSON.stringify(layer?.encode?.["node.label"]), '"data.label"');

            await session.undo();
            await waitFor(() => {
                assert.equal(session.styles.list().length, before);
            });
        },
        TIMEOUT_MS,
    );

    it(
        "an edge attribute has no menu until the table dock is built (Show in table)",
        async () => {
            const { session } = await openDataPlace();
            await importGraphFile(session);

            const value = within(await screen.findByRole("tree", { name: "Attributes" }))
                .getAllByRole("treeitem", { name: "value" })
                .at(-1);
            assert.isDefined(value);
            value?.focus();
            await userEvent.keyboard("{Shift>}{F10}{/Shift}");
            assert.isNull(screen.queryByRole("menu"));
        },
        TIMEOUT_MS,
    );

    it(
        "shows Find past 15 attributes, and Find narrows the list by name",
        async () => {
            const { session } = await openDataPlace();
            await session.data.import({ type: "json", name: "wide.json", config: { data: WIDE_JSON } });

            const find = await screen.findByRole("searchbox", { name: "Find attribute" });
            const attributes = tree("Attributes");
            assert.isNotNull(within(attributes).getByRole("treeitem", { name: "m01" }));
            await userEvent.type(find, "m16");
            await waitFor(() => {
                assert.isNull(within(attributes).queryByRole("treeitem", { name: "m01" }));
            });
            assert.isNotNull(within(attributes).getByRole("treeitem", { name: "m16" }));
        },
        TIMEOUT_MS,
    );
});
