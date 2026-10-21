/**
 * Models in the tier 3 Style panel, on the REAL graphty-element, by real input (node-models design
 * 13.2, 13.3, 13.5, 13.9): the Shape grid's Model... tile opens the Models pop-over; a sample or a
 * chosen .glb becomes the Shape field's value; a built-in shape takes the model off in one undo
 * step; Model settings writes the model's channels; a lone picture is offered as the layer's
 * picture, never refused as a model. Also a model dropped on the start screen and on the canvas.
 * Every assertion reads what the element reports: its layers, its assets and its model states.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { dotPng, quadGlb } from "./quadGlb";

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
 * A project with two nodes and a "Shapes" layer drawing them as cylinders, its Style tab open.
 * @returns the session and the Style tab.
 */
async function openShapes(): Promise<{ session: GraphSession; tab: HTMLElement }> {
    const store = createWorkspaceStore({ project: { name: "Models", id: 1 } });
    render(<Workspace store={store} />);
    const { session } = await canvasElement();
    await session.layout.set("fixed");
    await session.data.addNodes(NODES);
    await session.styles.add({
        name: "Shapes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": "cylinder" },
    });
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Shapes, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return { session, tab: await screen.findByTestId("style-tab") };
}

/**
 * The "Shapes" layer's value for a channel.
 * @param session - the element's session.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
function written(session: GraphSession, channel: string): unknown {
    const layer = session.styles.list().find((l) => l.name === "Shapes");
    return (layer?.set as Record<string, unknown> | undefined)?.[channel];
}

/**
 * The Shape field.
 * @param tab - the Style tab.
 * @returns the combobox.
 */
function shapeField(tab: HTMLElement): HTMLElement {
    return within(tab).getByRole("combobox", { name: /^Node shape/ });
}

/**
 * Opens the Models pop-over by the keyboard: focus on the Shape field, ArrowDown opens the grid,
 * End reaches Model..., Enter takes it.
 * @param tab - the Style tab.
 * @returns the pop-over.
 */
async function openModels(tab: HTMLElement): Promise<HTMLElement> {
    shapeField(tab).focus();
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("option", { name: "Model..." });
    await userEvent.keyboard("{End}{Enter}");
    return screen.findByRole("dialog", { name: "Models" });
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

/**
 * The tooltip a control shows on hover.
 * @param control - the control.
 * @returns its words.
 */
async function tooltipOf(control: HTMLElement): Promise<string> {
    await userEvent.hover(control);
    const tip = await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS });
    return tip.textContent;
}

describe("models in the Shape field, on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("picks Box by the keyboard, draws a chosen .glb, takes a shape back in one undo step, and sets Up", async () => {
        const { session, tab } = await openShapes();

        // The keyboard: the grid, End, Enter on Model..., and focus starts on the first sample.
        let models = await openModels(tab);
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Box");
        });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(written(session, "node.model"), "asset:sample/box");
        });
        assert.isNotNull(await within(tab).findByRole("combobox", { name: "Node shape, Box" }));
        assert.isNull(screen.queryByRole("dialog", { name: "Models" }), "picking closes the pop-over");
        await drawn(session, "asset:sample/box");

        // Choose files: a .glb from the file chooser, drawn on the layer's nodes.
        models = await openModels(tab);
        const chooser = within(models).getByRole("button", { name: "Choose model files" });
        assert.equal(chooser.getAttribute("title"), "Choose model files");
        const input = models.querySelector<HTMLInputElement>("input[type=file]:not([webkitdirectory])");
        if (input === null) {
            throw new Error("no file input");
        }
        await userEvent.upload(input, [new File([quadGlb()], "quad.glb", { type: "model/gltf-binary" })]);
        await waitFor(
            () => {
                assert.match(String(written(session, "node.model")), /^asset:/);
                assert.notEqual(written(session, "node.model"), "asset:sample/box");
            },
            { timeout: TIMEOUT_MS },
        );
        const quad = String(written(session, "node.model"));
        await drawn(session, quad);
        assert.isNotNull(await within(tab).findByRole("combobox", { name: "Node shape, quad" }));

        // Model settings: Up set to Z writes node.modelSourceUp.
        const settings = within(tab).getByRole("button", { name: "Model settings" });
        assert.equal(await tooltipOf(settings), "Model settings");
        await userEvent.click(settings);
        const panel = await screen.findByRole("dialog", { name: "Model settings" });
        await userEvent.click(within(panel).getByRole("combobox", { name: /^Up, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Z" }));
        await waitFor(() => {
            assert.equal(written(session, "node.modelSourceUp"), "z");
        });
        await userEvent.keyboard("{Escape}");

        // A built-in shape: the model goes, in one undo step.
        await userEvent.click(shapeField(tab));
        await userEvent.click(await screen.findByRole("option", { name: "Sphere" }));
        await waitFor(() => {
            assert.isUndefined(written(session, "node.model"));
            assert.equal(written(session, "node.shape"), "sphere");
        });
        assert.isUndefined(written(session, "node.modelSourceUp"), "its settings go with it");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.equal(written(session, "node.model"), quad);
            assert.equal(written(session, "node.modelSourceUp"), "z");
        });
    });

    it("offers a lone picture as the layer's picture, never refusing it as a model", async () => {
        const { session, tab } = await openShapes();
        const models = await openModels(tab);
        dropOn(within(models).getByRole("group", { name: "Model files" }), [new File([dotPng()], "colormap.png")]);

        const use = await within(models).findByRole(
            "button",
            { name: "Use colormap as picture" },
            { timeout: TIMEOUT_MS },
        );
        assert.isNotNull(within(models).getByText("Not a model"));
        assert.notInclude(document.body.textContent, "cannot be loaded");
        await userEvent.click(use);
        await waitFor(() => {
            assert.match(String(written(session, "node.texture")), /^asset:/);
        });
        assert.isUndefined(written(session, "node.model"), "nothing names the picture as a model");
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
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(store.get().project?.name, "rack");
        assert.isNull(session.data.lastImport(), "nothing was read as graph data");
    });

    it("draws a .glb dropped on the canvas on the selected nodes only, as one undoable layer", async () => {
        const store = createWorkspaceStore({ project: { name: "Models", id: 1 } });
        render(<Workspace store={store} />);
        const { session } = await canvasElement();
        await session.layout.set("fixed");
        await session.data.addNodes(NODES);
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
