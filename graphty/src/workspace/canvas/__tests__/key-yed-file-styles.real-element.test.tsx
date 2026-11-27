/**
 * A yEd drawing opened with its own styles on the REAL graphty-element: the card at the canvas's
 * top left once read "Edge bends: graphty.style.graphml.edge.copy.bends ..." and "Edge curved ...",
 * and stayed there whatever the pointer did (#7496, #7795). It was the canvas key listing the
 * file's edge routes, never a hover card. A route or a curve is drawn by the line itself, so the
 * key lists none, and pointing at a node and leaving the canvas leaves nothing hovered.
 */
// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import yed from "../../../../../graph-io/test/corpus/styles/graphml/fidelity/galaxy-lcms-workflow.graphml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor } from "../../../test/test-utils";
import { IMPORT_FILE_STYLES } from "../../settings/preferences";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Styles from files are an experiment: this test switches it on.
withFeatures(["file-styles"]);

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

/**
 * A spot a reader can point at: a node drawn there, picked there, and with no app overlay (the
 * canvas toolbar, the key) over it. The drawing is framed in the whole canvas and overlays float
 * on top of it, so any one node, such as the file's first, can lie under an overlay (#10273).
 * @param element - the element.
 * @returns the spot, in the element's own pixels, or undefined when every node is covered.
 */
function reachableNode(element: HTMLElementTagNameMap["graphty-element"]): { x: number; y: number } | undefined {
    const box = element.getBoundingClientRect();
    for (const node of element.session.data.nodes()) {
        const at = element.nodeScreenPosition(String(node.id));
        if (at?.visible !== true) {
            continue;
        }
        const point = { x: at.x, y: at.y };
        const picked = element.elementAt(point);
        const top = document.elementFromPoint(box.left + point.x, box.top + point.y);
        if (picked?.kind === "node" && String(picked.id) === String(node.id) && top !== null && element.contains(top)) {
            return point;
        }
    }
    return undefined;
}

describe("a yEd file opened with its styles", () => {
    it("keys no edge route, and leaving the canvas leaves nothing hovered", async () => {
        await page.viewport(1440, 900);
        localStorage.setItem(IMPORT_FILE_STYLES.key, "on");
        render(<Workspace store={createWorkspaceStore()} />);
        drop(new File([yed], "galaxy-lcms-workflow.graphml", { type: "application/xml" }));

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
        await element.waitForStableFrame();
        // The file's own layers are on: the edge routes are there to be keyed.
        assert.isTrue(
            session.styles.legend().some((block) => block.channel === "edge.bends"),
            "the file binds edge.bends",
        );

        const at = reachableNode(element);
        assert.isDefined(at, "a node is drawn where the reader can point at it");
        await userEvent.hover(element, { position: at });
        await waitFor(() => {
            assert.isNotNull(session.selection.hovered, "pointing at a node hovers it");
        });
        await userEvent.hover(page.getByRole("tree", { name: "Style layers", exact: true }));
        await waitFor(() => {
            assert.isNull(session.selection.hovered, "the pointer left the canvas");
        });

        assert.isNull(screen.queryByText(/^Edge bends/), "no key row for the edge routes");
        assert.isNull(screen.queryByText(/^Edge curved/), "no key row for the edge curves");
        localStorage.removeItem(IMPORT_FILE_STYLES.key);
    });
});
