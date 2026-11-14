/**
 * A Cytoscape session's own defaults on the REAL graphty-element with the file-styles experiment
 * on (issue #7495): the app's Everything row holds the base look, and the file's defaults are drawn
 * over it, not under it. Every value asserted is read through the element's public API.
 */
// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import CYS_URL from "../../../../../graph-io/test/corpus/styles/cys/BasicDataVizDemo.cys?url";
import { withFeatures } from "../../../test/features";
import { render, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["file-styles"]);

/**
 * Opens the workspace and loads the Cytoscape session with its styles.
 * @returns the session.
 */
async function openCys(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    // The rows a new project starts with: Everything holds the base look as values a reader edits.
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const data = new Uint8Array(await (await fetch(CYS_URL)).arrayBuffer());
    await session.data.import({ type: "cys", name: "BasicDataVizDemo.cys", config: { data } }, { styles: "file" });
    await session.styles.settled();
    return session;
}

describe("a Cytoscape session's defaults in the app", () => {
    it("draws the file's node shape and color and its edge ends over Everything", async () => {
        const session = await openCys();
        const node = session.data.nodes()[0];
        const edge = session.data.edges()[0];
        const nodeLook = session.styles.explain({ node: node.id }).merged as Record<string, unknown>;
        const edgeLook = session.styles.explain({ edge: edge.id }).merged as Record<string, unknown>;

        assert.strictEqual(nodeLook["node.shape"], "round-rectangle");
        assert.strictEqual((nodeLook["node.color"] as { hex: string }).hex.toLowerCase(), "#66ccff");
        assert.strictEqual(edgeLook["edge.arrowHead"], "none");
        assert.strictEqual(edgeLook["edge.arrowTail"], "none");
    });
});
