/**
 * Drawing nodes as 3D models from the app, on the REAL graphty-element: the Model picker in the
 * Style tab's shape line, the file chooser, a model dropped on the start screen and on the canvas,
 * Use node color, and the words for a refused model. Every assertion reads what the element
 * reports: its model states, its layers, its assets, and a screenshot it takes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { quadGlb } from "./quadGlb";

/** A hang guard for the element coming up, loading and drawing a model, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "1", position: { x: -2, y: 0, z: 0 } },
    { id: "2", position: { x: 2, y: 0, z: 0 } },
];

/**
 * The element on the project's canvas, once it has come up.
 * @returns the element.
 */
async function canvasElement(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    let element: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(
        () => {
            element = document.querySelector(".ws-canvas graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (element === null) {
        throw new Error("the element never came up");
    }
    return element;
}

/**
 * The workspace with a project open on the Everything row and two nodes in it.
 * @returns the element.
 */
async function openWithGraph(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    const store = createWorkspaceStore({ project: { name: "Models", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    const element = await canvasElement();
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(NODES);
    return element;
}

/**
 * Opens the Model picker as a reader does: the shape line, then Model... in the Shape popover.
 * @returns the picker.
 */
async function openPicker(): Promise<HTMLElement> {
    const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
    await userEvent.click(within(tab).getByRole("button", { name: /^Shape / }));
    const shapes = await screen.findByRole("dialog", { name: "Shapes" });
    await userEvent.click(within(shapes).getByRole("option", { name: "Model..." }));
    return screen.findByRole("group", { name: "Models" });
}

/**
 * Waits until graphty-element reports the model drawn.
 * @param session - the element's session.
 * @param ref - what the layer names.
 */
async function drawn(session: GraphSession, ref: string): Promise<void> {
    await waitFor(
        () => {
            assert.equal(session.assets.states().find((change) => change.ref === ref)?.state, "drawn");
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * The model the reader's layers name.
 * @param session - the element's session.
 * @returns the asset id, or undefined.
 */
function namedModel(session: GraphSession): unknown {
    return session.styles
        .list()
        .map((layer) => layer.set?.["node.model"])
        .find((value) => value !== undefined);
}

/**
 * Counts strongly red pixels in a screenshot the element takes.
 * @param element - the element.
 * @returns how many.
 */
async function redPixels(element: HTMLElementTagNameMap["graphty-element"]): Promise<number> {
    const shot = await element.captureScreenshot({ format: "png", destination: { blob: true } });
    const bitmap = await createImageBitmap(shot.blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("no 2d context");
    }
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let count = 0;
    for (let at = 0; at < data.length; at += 4) {
        if (data[at] > 150 && data[at + 1] < 70 && data[at + 2] < 70) {
            count++;
        }
    }
    return count;
}

/**
 * Drops files as the browser does. A synthetic DragEvent, the one exception to real input: a page
 * cannot start a drag of a file from the operating system, and Playwright's drag-and-drop moves
 * page elements, never files.
 * @param target - where they are dropped.
 * @param files - the files.
 */
function dropOn(target: EventTarget, files: readonly File[]): void {
    const dataTransfer = new DataTransfer();
    for (const file of files) {
        dataTransfer.items.add(file);
    }
    for (const type of ["dragover", "drop"]) {
        target.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

describe("nodes drawn as models from the app, on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("draws the Server sample picked in the Model picker on the row's nodes", async () => {
        const { session } = await openWithGraph();
        const picker = await openPicker();
        await userEvent.click(within(picker).getByRole("button", { name: "Server" }));

        await drawn(session, "asset:sample/server");
        assert.equal(namedModel(session), "asset:sample/server");
        // The shape section now has the model's own line.
        assert.isNotNull(await screen.findByRole("button", { name: "Model Server" }));
    });

    it("draws a .glb chosen with Choose file... on the row's nodes", async () => {
        const { session } = await openWithGraph();
        const picker = await openPicker();
        await userEvent.upload(within(picker).getByTestId("model-file-input"), [
            new File([quadGlb()], "panel.glb", { type: "model/gltf-binary" }),
        ]);

        await waitFor(
            () => {
                assert.equal(session.assets.list()[0]?.state, "accepted");
            },
            { timeout: TIMEOUT_MS },
        );
        const [record] = session.assets.list();
        await drawn(session, record.id);
        assert.equal(namedModel(session), record.id);
        assert.isNotNull(await screen.findByRole("button", { name: "Model panel" }));
    });

    it("opens a .glb dropped on the start screen as a model, not as graph data", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const land = await screen.findByText(/Or drop a file anywhere/, {}, { timeout: TIMEOUT_MS });
        dropOn(land, [new File([quadGlb()], "rack.glb")]);

        const { session } = await canvasElement();
        await waitFor(
            () => {
                assert.equal(session.assets.list()[0]?.state, "accepted");
                assert.equal(namedModel(session), session.assets.list()[0]?.id);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(store.get().project?.name, "rack");
        assert.isNull(session.data.lastImport(), "nothing was read as graph data");
        // The nodes added next are drawn as the model.
        await session.data.addNodes([{ id: "a" }]);
        await drawn(session, session.assets.list()[0].id);
    });

    it("turns the model red with Use node color under a red color layer", async () => {
        const element = await openWithGraph();
        const { session } = element;
        await session.styles.add({
            name: "red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        const picker = await openPicker();
        await userEvent.click(within(picker).getByRole("button", { name: "Box" }));
        await drawn(session, "asset:sample/box");

        // The element says the color does not reach the model; the control says so too.
        const useColor = await screen.findByRole("button", { name: "Use node color" });
        await waitFor(
            () => {
                assert.equal(useColor.dataset.prominent, "true");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.isBelow(await redPixels(element), 200, "the model keeps its own gray");

        await userEvent.click(useColor);
        await waitFor(
            async () => {
                assert.isAbove(await redPixels(element), 2000, "the model is drawn red");
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("says which file a dropped .gltf needs when its .bin is missing", async () => {
        const { session } = await openWithGraph();
        const gltf = JSON.stringify({
            asset: { version: "2.0" },
            buffers: [{ uri: "robot.bin", byteLength: 36 }],
        });
        dropOn(screen.getByTestId("canvas"), [new File([gltf], "robot.gltf")]);

        assert.isNotNull(
            await screen.findByText(
                "robot.gltf needs robot.bin. Drop the whole folder or a .zip, or export as .glb.",
                {},
                { timeout: TIMEOUT_MS },
            ),
        );
        assert.isUndefined(namedModel(session), "no layer names a refused model");
        assert.isNull(session.data.lastImport(), "nor was it read as graph data");
    });

    it("draws a .glb dropped on the canvas on the selected nodes only, as one undoable layer", async () => {
        const { session } = await openWithGraph();
        await session.selection.apply({ nodes: ["1"] });
        const before = session.styles.list().length;
        dropOn(screen.getByTestId("canvas"), [new File([quadGlb()], "chip.glb")]);

        await waitFor(
            () => {
                assert.lengthOf(session.styles.list(), before + 1);
            },
            { timeout: TIMEOUT_MS },
        );
        const layer = session.styles.list().find((l) => l.set?.["node.model"] !== undefined);
        assert.deepEqual(layer?.selector, { match: "ids", nodes: ["1"] });
        await session.undo();
        assert.lengthOf(session.styles.list(), before);
    });
});
