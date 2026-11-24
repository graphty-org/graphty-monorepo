/**
 * A Cytoscape session opened with its own styles on the REAL graphty-element: the canvas key once
 * listed every property the session's defaults set, the edge ends' caption face ("Edge label at
 * target end font: Drawing") on top, with the draw order and every label setting (#9297). The key
 * now shows the session's own look -- its node color and shape, its edge color and line -- and none
 * of the text's look, the bare numbers, the draw order or the parts it draws as nothing.
 */
// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page } from "vitest/browser";

import CYS_URL from "../../../../../graph-io/test/corpus/styles/cys/BasicDataVizDemo.cys?url";
import { render, screen, waitFor } from "../../../test/test-utils";
import { IMPORT_FILE_STYLES } from "../../settings/preferences";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Styles from files are an experiment: this test switches it on.

/**
 * Drops a file as the browser does. A synthetic DragEvent: a page cannot start a drag of a file
 * from the operating system, and Playwright's drag-and-drop moves page elements, never files.
 * @param file - the file.
 */
function drop(file: File): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

describe("a Cytoscape session opened with its styles", () => {
    it("keys the session's look, not its text faces, numbers or draw order", async () => {
        await page.viewport(1440, 900);
        localStorage.setItem(IMPORT_FILE_STYLES.key, "on");
        render(<Workspace store={createWorkspaceStore()} />);
        const bytes = await (await fetch(CYS_URL)).arrayBuffer();
        drop(new File([bytes], "BasicDataVizDemo.cys", { type: "application/zip" }));

        const element = await waitFor(() => {
            const found = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element:not([data-start-page])",
            );
            assert.isNotNull(found);
            assert.isAbove(found?.session.data.lastImport()?.counts.nodes ?? 0, 0);
            return found;
        });
        const { session } = element;
        await session.styles.settled();
        await element.waitForSettled();
        // The session's layers set the end captions' face and the draw order: there to be keyed.
        const channels = new Set(session.styles.legend().map((block) => block.channel));
        assert.isTrue(channels.has("edge.arrowHeadTextFont"), "the file sets the end captions' face");
        assert.isTrue(channels.has("node.drawOrder"), "the file sets the draw order");

        const legend = await screen.findByRole("region", { name: "Legend" });
        // The session's look, top layer first: its edge line and color, then its node shape and color.
        await waitFor(() => {
            assert.include(legend.textContent, "Color: Defaults");
        });
        const text = legend.textContent;
        for (const title of ["Edge line: Defaults", "Edge color: Defaults", "Shape: Defaults", "Color: Defaults"]) {
            assert.include(text, title);
        }
        // No caption face, no draw order, no label setting, no bare number, no border 0 wide.
        assert.notMatch(text, /Drawing|Draw order|label|Label|Opacity|Corner|Width|Height|wave|Border/);
        localStorage.removeItem(IMPORT_FILE_STYLES.key);
    });
});
