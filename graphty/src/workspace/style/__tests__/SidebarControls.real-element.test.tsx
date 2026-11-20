/**
 * The Style sidebar draws only approved controls (owner, 2026-11-17; #8739), on the REAL graphty-element, opened by
 * real clicks: every element the sidebar draws is an approved control, sits inside one, or is a container the list
 * names, and every word it shows is a control's own or a control's name. A pill, chip, badge, caption, note or
 * warning fails. The approved list is src/workspace/style/approved-controls.json, shared with the lint rule
 * graphty/eslint-rules/style-sidebar-controls.js.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures, withoutFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { findTreeRow } from "../../graph-place/rows";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { outsideTheList } from "./approvedControls";
import { showKind } from "./kindTab";
import { openShapes } from "./modelHarness";

/**
 * Checks the open Style tab, on each kind's tab when it has two.
 * @param where - what is open, for the message.
 */
async function checkSidebar(where: string): Promise<void> {
    const kinds = screen.queryByRole("tablist", { name: "Style for" }) === null ? [null] : (["node", "edge"] as const);
    for (const kind of kinds) {
        if (kind !== null) {
            await showKind(kind);
        }
        const tab = await screen.findByTestId("style-tab");
        assert.deepEqual(outsideTheList(tab), [], `${where}${kind === null ? "" : `, ${kind}s`}`);
    }
}

/**
 * Les Miserables with a hand-picked layer, Degree, Louvain and a route.
 * @returns the session and each row's name.
 */
async function openScene(): Promise<{ session: GraphSession; rows: string[] }> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true });
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: ["Valjean", "Javert"].map(idOf) },
        set: { "node.color": "#E8590C" },
    });
    const rowOf = async (algorithm: string, params: Record<string, unknown> = {}): Promise<string> => {
        const { runId } = await session.runs.start(algorithm, params);
        await session.styles.settled();
        const id = session.runs.bindings(runId).at(-1) ?? "";
        const layer = session.styles.get(id);
        return findTreeRow(session.styles.tree(), layer?.row ?? id)?.row.name ?? String(layer?.name);
    };
    const runs = [
        await rowOf("degree"),
        await rowOf("louvain"),
        await rowOf("shortest-path", { source: idOf("Myriel"), target: idOf("Marius") }),
    ];
    return { session, rows: ["Everything", "Key people", ...runs] };
}

/**
 * Opens a tree row's Style tab by a click on the row, or adds the row to those picked by a Control-click.
 * @param name - the row's name.
 * @param add - whether to add it to the rows already picked.
 */
async function clickRow(name: string, add = false): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    const row = await within(tree).findByRole("treeitem", {
        name: new RegExp(`^${name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}, `),
    });
    if (add) {
        await userEvent.keyboard("{Control>}");
        await userEvent.click(row);
        await userEvent.keyboard("{/Control}");
        // Several rows have one panel, with no Values tab beside it.
        return;
    }
    await userEvent.click(row);
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
}

describe("the Style sidebar draws only approved controls", () => {
    // The panel before Style panel v2; the describe below runs the same check on v2.
    withoutFeatures(["style-panel-v2"]);
    it("on a layer, a run's rows, the Everything row and several rows together", async () => {
        const { rows } = await openScene();
        for (const name of rows) {
            await clickRow(name);
            await checkSidebar(name);
        }
        await clickRow("Key people");
        await clickRow(rows[2], true);
        await checkSidebar("Key people and Degree together");
    });

    it("with the Which picker's cards open", async () => {
        await openScene();
        await clickRow("Key people");
        await showKind("node");
        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: /^Which nodes/ }));
        await screen.findByRole("group", { name: "Which nodes" });
        await checkSidebar("Key people, Which open");
    });

    it("on a model's Shape field", async () => {
        await openShapes();
        await checkSidebar("Shapes, node models on");
    });
});

// The same check on Style panel v2 in both configurations, so #8739 holds there before it leaves its flag.
describe("the Style sidebar draws only approved controls on Style panel v2", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("on a layer, a run's rows and the Everything row", async () => {
        const { rows } = await openScene();
        for (const name of rows) {
            await clickRow(name);
            await checkSidebar(`${name}, v2`);
        }
    });
});
