/**
 * The find box on the REAL graphty-element: a rule over a column the graph does not have says so,
 * and offers the column a run published under that name; the result list closes as a list does;
 * Control+F reaches the box from anywhere; a layer made from a find rule reads as its cards.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hub "a" with three spokes, and the givers' donations. */
const NODES = [
    { id: "a", name: "Ava", donations: 12000 },
    { id: "b", name: "Ben", donations: 500 },
    { id: "c", name: "Cy", donations: 10000 },
    { id: "d", name: "Dee", donations: 50 },
].map((node, i) => ({ ...node, position: { x: (i - 2) * 6, y: 0, z: 0 } }));
const EDGES = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "a", target: "d" },
];

/**
 * Renders the workspace with a project open and loads the graph.
 * @returns the element's session.
 */
async function openWithGraph(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Givers", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    let element: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(() => {
        element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element as HTMLElementTagNameMap["graphty-element"];
    await session.layout.set("fixed");
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return session;
}

/**
 * The find box, with focus in it.
 * @returns the box.
 */
async function focusFind(): Promise<HTMLElement> {
    const find = await screen.findByRole("combobox", { name: "Find" });
    await userEvent.click(find);
    return find;
}

/**
 * The reader's own layers, bottom first.
 * @param session - the element's session.
 * @returns the layers.
 */
function readerLayers(session: GraphSession): Layer[] {
    return session.styles.list().filter((l) => l.source.by === "user");
}

describe("the find box", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("says a rule's column is unknown rather than that nothing matches, and selects nothing", async () => {
        const session = await openWithGraph();
        await focusFind();
        await userEvent.keyboard("=nosuch > `1`{Enter}");

        // The line under the box, and the status line that speaks it.
        await screen.findAllByText('No column named "nosuch"', {});
        assert.isNull(screen.queryByText("Nothing matches this rule"));
        assert.lengthOf(session.selection.nodes, 0);
    });

    it("offers a run's result for its name, and Enter on it selects what the run measured", async () => {
        const session = await openWithGraph();
        await session.runs.start("degree", {}, { style: false });
        await focusFind();
        await userEvent.keyboard("=degree > `2`");

        await screen.findByText("Did you mean Degree?", {});
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["a"]);
        });
    });

    it("offers a run's result as a column while a rule is typed", async () => {
        const session = await openWithGraph();
        await session.runs.start("degree", {}, { style: false });
        await focusFind();
        await userEvent.keyboard("=degr");

        const list = await screen.findByRole("listbox", { name: "Find results" });
        assert.isNotNull(within(list).queryByRole("group", { name: "Columns" }));
    });

    it("closes its list on Escape at the clear button, and on a click outside", async () => {
        await openWithGraph();
        const find = await focusFind();
        await userEvent.keyboard("Av");
        await screen.findByRole("listbox", { name: "Find results" });

        await userEvent.tab();
        assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "Clear search");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox", { name: "Find results" }));
        });
        assert.strictEqual(document.activeElement, find, "focus is back in the box");

        await userEvent.keyboard("Av");
        await screen.findByRole("listbox", { name: "Find results" });
        await userEvent.click(screen.getByRole("complementary", { name: "Inspector" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listbox", { name: "Find results" }));
        });
        assert.strictEqual((find as HTMLInputElement).value, "Av", "the text stays for coming back to");
    });

    it("takes focus on Control+F from a toolbar button, its text selected for the next search", async () => {
        await openWithGraph();
        await focusFind();
        await userEvent.keyboard("Av");
        const toolbar = await screen.findByRole("toolbar", { name: "Canvas tools" });
        const [first] = within(toolbar).getAllByRole("button");
        first.focus();
        await userEvent.keyboard("{Control>}f{/Control}");

        const find = await screen.findByRole("combobox", { name: "Find" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, find);
        });
        await userEvent.keyboard("Ben");
        assert.strictEqual((find as HTMLInputElement).value, "Ben");
    });

    it("makes a layer from a number rule named by its card, and shows the rule as that card", async () => {
        const session = await openWithGraph();
        await focusFind();
        await userEvent.keyboard("=donations >= `10000`{Enter}");
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["a", "c"]);
        });
        const before = readerLayers(session).length;
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await userEvent.click(await inspector.findByRole("button", { name: /actions$/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /New layer from selection/ }));
        const tab = await screen.findByTestId("style-tab", {});
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node fill" }));
        const field = await screen.findByRole("textbox", { name: /^Node color(,|$)/ });
        await userEvent.clear(field);
        await userEvent.type(field, "00AA55{Enter}");
        await waitFor(() => {
            assert.lengthOf(readerLayers(session), before + 1);
        });

        const made = readerLayers(session).at(-1);
        assert.strictEqual(made?.name, "donations 10000 or more");
        const which = await screen.findByRole("button", { name: /^Which nodes/ });
        const said = which.getAttribute("aria-label") ?? "";
        assert.include(said, "donations 10000 or more");
        assert.notInclude(said, "A rule set elsewhere");
    });
});
