/**
 * The layers a project starts with are ordinary layers, on the REAL graphty-element, with real
 * input. The owner's rule (2026-11-05): "hover is just a style on a calculated value. select is
 * just a style on a calculated value. pin is just a style on a calculated value. any layer may be
 * deleted or modified in any way. there are NO SPECIAL LAYER." If a reader leaves nodes out of
 * Everything, they are hidden.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, selectorStates } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

const NODES = ["a", "b", "c", "d"];

/**
 * A new project as the app starts one, with a small graph.
 * @returns the session.
 */
async function openProject(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    await session.config.set({ startingRows: true, editableBase: true });
    await session.data.addNodes(NODES.map((id, at) => ({ id, label: at < 2 ? "first" : "second" })));
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    await session.styles.settled();
    return session;
}

/**
 * The nodes drawn now.
 * @param session - the session.
 * @returns their ids.
 */
function drawn(session: GraphSession): string[] {
    const element = document.querySelector("graphty-element");
    assert.isNotNull(element);
    return session.data
        .nodes()
        .filter((node) => element?.getNode(node.id)?.getRenderState() === "visible")
        .map((node) => String(node.id))
        .sort();
}

/**
 * A row of the style tree.
 * @param name - its name.
 * @returns the row.
 */
async function treeRow(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    return within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * Runs a command from a row's menu, opened with a real right click.
 * @param name - the row's name.
 * @param command - the menu item's name.
 */
async function fromMenu(name: string, command: string): Promise<void> {
    await userEvent.click(await treeRow(name), { button: "right" });
    const menu = await screen.findByRole("menu");
    await userEvent.click(within(menu).getByRole("menuitem", { name: new RegExp(`^${command}`) }));
}

/**
 * Whether the tree holds a row.
 * @param name - its name.
 * @returns true when it does.
 */
function hasRow(name: string): boolean {
    const tree = screen.getByRole("tree", { name: "Style layers" });
    return within(tree).queryByRole("treeitem", { name: new RegExp(`^${name}, `) }) !== null;
}

/**
 * Opens the node selection of a row and adds a condition on the label: the same steps on any row.
 * @param name - the row's name.
 */
async function addCondition(name: string): Promise<void> {
    await userEvent.click(await treeRow(name));
    await showKind("node");
    const which = await waitFor(() => {
        const found = document.querySelector('[data-testid="which-picker"] button');
        assert.isNotNull(found);
        return found;
    });
    await userEvent.click(which ?? document.body);
    const editor = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the selection opens in its editor");
        return found ?? document.body;
    });
    const add = await waitFor(() => {
        const [found] = within(editor).queryAllByRole("button", { name: /^(?:Value|And\.\.\.|Keep)$/ });
        assert.isDefined(found, "the editor offers a new condition");
        return found;
    });
    await userEvent.click(add);
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard("label");
    await userEvent.keyboard("{Enter}");
    await userEvent.click(await within(editor).findByRole("checkbox", { name: /^first/ }));
    await userEvent.click(within(editor).getByRole("button", { name: "Done" }));
}

describe.each([
    ["off", ["timeline"]],
    ["on", ["timeline", "selection-workspace"]],
])("the starting layers, selection workspace %s", (_state, features) => {
    beforeAll(async () => {
        await siteFeatures(features);
        await page.viewport(1366, 768);
    });

    it("leaves undrawn what Everything no longer paints, and Restore brings the row back", async () => {
        const session = await openProject();
        await waitFor(() => {
            assert.deepEqual(drawn(session), NODES);
        });

        await fromMenu("Everything", "Delete");
        await waitFor(() => {
            assert.isFalse(hasRow("Everything"));
            assert.deepEqual(drawn(session), [], "no shown layer paints a node");
        });

        await userEvent.click(await screen.findByRole("button", { name: "Restore starting layers" }));
        await waitFor(() => {
            assert.isTrue(hasRow("Everything"));
            assert.deepEqual(drawn(session), NODES);
        });
    });

    it("takes a condition on Everything, and hides what it leaves out", async () => {
        const session = await openProject();
        await addCondition("Everything");
        await waitFor(() => {
            assert.deepEqual(drawn(session), ["a", "b"]);
        });
    });

    it("takes a condition on Selected beside the state", async () => {
        const session = await openProject();
        const layer = session.styles.list().find((each) => each.name === "Selected" && each.target === "node");
        assert.isDefined(layer);
        // A condition lists the values of what it narrows: the selection.
        await session.selection.apply({ nodes: ["a", "c"] });
        await addCondition("Selected");
        await waitFor(() => {
            const selector = session.styles.get(layer?.id ?? "")?.selector;
            assert.isDefined(selector);
            assert.strictEqual(selector?.match, "rule");
            assert.deepEqual(selector === undefined ? [] : selectorStates(selector), ["selected"]);
            assert.include(JSON.stringify(selector), "data.label");
            assert.strictEqual(session.styles.counts(layer?.id ?? "").matched, 1, "a is selected and first");
        });
    });

    it("loads an old project's starting layers as layers like any other", async () => {
        const session = await openProject();
        const { text } = await session.project.save();
        await session.project.open(text, { discard: true });
        await session.styles.settled();

        await fromMenu("Hovered", "Delete");
        await waitFor(() => {
            assert.isFalse(hasRow("Hovered"));
        });
        await fromMenu("Everything", "Pin to top");
        await waitFor(() => {
            const everything = session.styles.tree().find((row) => row.name === "Everything");
            assert.strictEqual(everything?.pin, "top");
        });
        await session.selection.apply({ nodes: ["a", "c"] });
        await addCondition("Selected");
        await waitFor(() => {
            const selected = session.styles.list().find((each) => each.name === "Selected" && each.target === "node");
            assert.strictEqual(selected?.selector.match, "rule");
        });
    });
});
