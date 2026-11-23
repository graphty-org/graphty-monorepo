/**
 * On the REAL graphty-element: the Assistant's rail button is drawn with the frame, and its panel,
 * engine and TanStack AI modules are downloaded only when the Assistant opens.
 */

import { assert, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";

// The browser keeps 250 resource entries unless told otherwise, and a test page loads thousands of
// modules, so the app and the element load only after the limit is raised: the download check below
// sees every module. The element's import registers the real <graphty-element>, as main.tsx does.
performance.setResourceTimingBufferSize(100_000);
await import("@graphty/graphty-element");
const { Workspace } = await import("../../Workspace");

describe("the Assistant before it opens", () => {
    it("draws its rail button and downloads no assistant panel, no assistant engine and no TanStack AI module", async () => {
        render(<Workspace store={createWorkspaceStore({ project: { name: "Load", id: 1 } })} />);
        await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isNotNull(found);
            assert.isDefined(found.session);
        });
        await screen.findByRole("combobox", { name: "Find" });
        const rail = screen.getByRole("toolbar", { name: "Places" });
        await within(rail).findByRole("button", { name: "Assistant" });

        const loaded = performance.getEntriesByType("resource").map((entry) => entry.name);
        // What the check reads does hold the frame and the element.
        assert.isNotEmpty(loaded.filter((name) => name.includes("/workspace/frame/Frame.tsx")));
        assert.isNotEmpty(loaded.filter((name) => name.includes("/graphty-element/src/Graph.ts")));
        // TanStack's AI packages; its Table and Virtual libraries are the app's data table.
        const assistant = loaded.filter((name) =>
            /\/workspace\/assistant\/|\/src\/ai\/engine\/|@tanstack[/_]ai/.test(name),
        );
        assert.deepEqual(assistant, []);
    });
});
