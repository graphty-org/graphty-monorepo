/**
 * The node models experiment's test harness (issue #3396): a workspace on the real element with the
 * experiment switched on as a site would, a "Shapes" layer open in the Style tab, and the ways a
 * reader reaches the Models pop-over. Every helper drives real input or reads what the element
 * reports.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert } from "vitest";
import { page, userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const NODES = [
    { id: "1", position: { x: -2, y: 0, z: 0 } },
    { id: "2", position: { x: 2, y: 0, z: 0 } },
];

/**
 * The element on the project's canvas, once it has come up.
 * @returns the element.
 */
async function canvasElement(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    return waitFor(() => {
        const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(".ws-canvas graphty-element");
        assert.isDefined(element?.session);
        if (element === null) {
            throw new Error("the element never came up");
        }
        return element;
    });
}

/** What the "Shapes" layer sets unless a test says otherwise. */
const CYLINDERS: Readonly<Record<string, unknown>> = Object.freeze({ "node.shape": "cylinder" });

/** What `openShapes` hands a test. */
export interface Shapes {
    readonly session: GraphSession;
    readonly tab: HTMLElement;
    readonly store: WorkspaceStore;
}

/**
 * A project with two nodes and a "Shapes" layer drawing them as cylinders, its Style tab open, with
 * the node models experiment on (or the given experiments).
 * @param features - the site's experiments.
 * @param set - what the layer sets, or how to make it from the session once it is up.
 * @returns the session, the Style tab and the workspace store.
 */
export async function openShapes(
    features: readonly string[] = ["node-models"],
    set: Record<string, unknown> | ((session: GraphSession) => Promise<Record<string, unknown>>) = CYLINDERS,
): Promise<Shapes> {
    await page.viewport(1440, 900);
    await siteFeatures(features);
    const store = createWorkspaceStore({ project: { name: "Models", id: 1 } });
    render(<Workspace store={store} />);
    const { session } = await canvasElement();
    await session.layout.set("fixed");
    await session.data.addNodes(NODES);
    await session.styles.add({
        name: "Shapes",
        target: "node",
        selector: { match: "everything" },
        set: typeof set === "function" ? await set(session) : set,
    });
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Shapes, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return { session, tab: await screen.findByTestId("style-tab"), store };
}

/**
 * The "Shapes" layer's value for a channel.
 * @param session - the element's session.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
export function written(session: GraphSession, channel: string): unknown {
    const layer = session.styles.list().find((l) => l.name === "Shapes");
    return (layer?.set as Record<string, unknown> | undefined)?.[channel];
}

/**
 * The Shape field.
 * @param tab - the Style tab.
 * @returns the combobox.
 */
export function shapeField(tab: HTMLElement): HTMLElement {
    return within(tab).getByRole("combobox", { name: /^Node shape/ });
}

/**
 * The names of the choices the Shape field's list offers, read with the list open and closed again.
 * @param tab - the Style tab.
 * @returns the names.
 */
export async function shapeChoices(tab: HTMLElement): Promise<string[]> {
    await userEvent.click(shapeField(tab));
    const options = await screen.findAllByRole("option");
    const names = options.map((option) => option.textContent);
    await userEvent.keyboard("{Escape}");
    return names;
}

/**
 * Opens the Models pop-over by a click on the Shape list's last choice, Model....
 * @param tab - the Style tab.
 * @returns the pop-over.
 */
export async function openModels(tab: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(shapeField(tab));
    await userEvent.click(await screen.findByRole("option", { name: "Model..." }));
    return screen.findByRole("dialog", { name: "Models" });
}

/**
 * Opens a section's "+" menu and reads what it offers, closing it again.
 * @param tab - the Style tab.
 * @param section - the section's name, as its "+" says it ("node fill").
 * @returns the menu items' names.
 */
export async function plusMenu(tab: HTMLElement, section: string): Promise<string[]> {
    await userEvent.click(within(tab).getByRole("button", { name: `Add to ${section}` }));
    const items = await screen.findAllByRole("menuitem");
    const names = items.map((item) => item.textContent);
    await userEvent.keyboard("{Escape}");
    return names;
}

/**
 * Waits until graphty-element reports a model or picture in a state.
 * @param session - the element's session.
 * @param ref - what the layer names.
 * @param state - the state ("drawn" by default).
 */
export async function reaches(session: GraphSession, ref: string, state = "drawn"): Promise<void> {
    await waitFor(() => {
        assert.equal(session.assets.states().find((change) => change.ref === ref)?.state, state);
    });
}

/**
 * Drops files as the browser does. A synthetic DragEvent, the one exception to real input: a page
 * cannot start a drag of a file from the operating system, and Playwright's drag-and-drop moves
 * page elements, never files.
 * @param target - where they are dropped.
 * @param files - the files.
 */
export function dropOn(target: EventTarget, files: readonly File[]): void {
    const dataTransfer = new DataTransfer();
    for (const file of files) {
        dataTransfer.items.add(file);
    }
    for (const type of ["dragover", "drop"]) {
        target.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * The file input behind a pop-over's chooser button, which `userEvent.upload` fills as the
 * browser's file chooser would.
 * @param within - the pop-over.
 * @param folder - the folder chooser's input rather than the files chooser's.
 * @returns the input.
 */
export function fileInput(within: HTMLElement, folder = false): HTMLInputElement {
    const input = within.querySelector<HTMLInputElement>(
        folder ? "input[type=file][webkitdirectory]" : "input[type=file]:not([webkitdirectory])",
    );
    if (input === null) {
        throw new Error("no file input");
    }
    return input;
}

/**
 * Opens the Load custom model dialog from the Models pop-over's Custom model... button.
 * @param tab - the Style tab.
 * @returns the dialog.
 */
export async function openCustom(tab: HTMLElement): Promise<HTMLElement> {
    const models = await openModels(tab);
    await userEvent.click(within(models).getByRole("button", { name: "Custom model..." }));
    return screen.findByRole("dialog", { name: "Load custom model" });
}

/**
 * How many pixels of a picture are not fully transparent.
 * @param picture - the picture, loaded or loading.
 * @returns the count of drawn pixels.
 */
async function drawnPixels(picture: HTMLImageElement): Promise<number> {
    await picture.decode();
    const canvas = document.createElement("canvas");
    canvas.width = picture.naturalWidth;
    canvas.height = picture.naturalHeight;
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(picture, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let drawn = 0;
    for (let at = 3; at < data.length; at += 4) {
        drawn += data[at] > 0 ? 1 : 0;
    }
    return drawn;
}

/**
 * Waits until the dialog shows its model drawn by graphty-element: a PNG with the model on it,
 * not an empty picture.
 * @param dialog - the dialog.
 * @param name - the model's name.
 * @returns the preview picture.
 */
export async function previewOf(dialog: HTMLElement, name: string): Promise<HTMLImageElement> {
    const picture = await within(dialog).findByRole<HTMLImageElement>("img", { name: `${name} preview` });
    assert.match(picture.src, /^data:image\/png;base64,/);
    assert.isAbove(await drawnPixels(picture), 0, `${name} is drawn in the preview`);
    return picture;
}

/**
 * Presses the dialog's Add button, once it can be pressed, and waits for the dialog to close.
 * @param dialog - the dialog.
 * @param word - the button's name: "Add model" with a layer, "Add to project" from the Main menu.
 */
export async function addModel(dialog: HTMLElement, word = "Add model"): Promise<void> {
    const add = within(dialog).getByRole("button", { name: word });
    await waitFor(() => {
        assert.isNull(add.getAttribute("aria-disabled"));
    });
    await userEvent.click(add);
    await waitFor(() => {
        assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
    });
}
