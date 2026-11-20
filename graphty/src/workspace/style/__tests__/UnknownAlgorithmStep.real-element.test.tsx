/**
 * A style layer whose selection has a measure step naming an algorithm nothing registers (an
 * extension's, not loaded here), on the REAL graphty-element: the Style layers tree still draws,
 * with that layer's row in it, rather than the Graph place falling to its error boundary.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withoutFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withoutFeatures(["file-styles"]);

describe("a layer selecting by an unregistered algorithm", () => {
    it("leaves the Style layers tree drawn, with the layer's row", async () => {
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
        await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
        await session.styles.add({
            name: "Path",
            target: "node",
            selector: {
                match: "rule",
                where: {
                    kind: "union",
                    side: "nodes",
                    within: "graph",
                    branches: [
                        {
                            start: "none",
                            steps: [
                                {
                                    op: "add",
                                    rule: { kind: "measure", algorithm: "no-such-algorithm", field: "onPath" },
                                },
                            ],
                        },
                    ],
                },
            },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();

        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await within(tree).findByRole("treeitem", { name: /^Path, / });
    });
});
