/**
 * The node models experiment's test harness (issue #3396): a workspace on the real element with the
 * experiment switched on as a site would, a "Shapes" layer open in the Style tab, and the ways a
 * reader reaches the Models pop-over. Every helper drives real input or reads what the element
 * reports.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A file a test chooses: a path from the package's folder (a folder chooses all of it), or its bytes. */
type ChosenFile =
    { readonly path: string } | { readonly name: string; readonly mimeType: string; readonly base64: string };

declare module "vitest/browser" {
    interface BrowserCommands {
        chooseNextFiles: (files: ChosenFile[]) => Promise<void>;
        lastFileChooser: () => Promise<{ accept: string | null; multiple: boolean } | null>;
    }
}

/**
 * Files from the package's folder, read as the test server has them, for a drop.
 * @param paths - each file's path from the package's folder.
 * @returns the files.
 */
export async function filesAt(paths: readonly string[]): Promise<File[]> {
    return Promise.all(
        paths.map(async (at) => {
            const bytes = Uint8Array.from(atob(await commands.readFile(at, "base64")), (c) => c.codePointAt(0) ?? 0);
            return new File([bytes], at.slice(at.lastIndexOf("/") + 1));
        }),
    );
}

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
 * A file's bytes as base64, to hand to the browser command that answers the file picker.
 * @param file - the file.
 * @returns the base64.
 */
async function base64(file: File): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let text = "";
    for (let at = 0; at < bytes.length; at += 0x8000) {
        text += String.fromCodePoint(...bytes.subarray(at, at + 0x8000));
    }
    return btoa(text);
}

/**
 * Clicks a button that opens the browser's file picker, and answers the picker with files, as a
 * reader choosing them: each a File, or a path from the package's folder. A path to a folder, with
 * the button that opens the folder picker, chooses that folder.
 * @param scope - where the button is.
 * @param name - the button's accessible name, "Choose file".
 * @param files - the files.
 */
export async function choose(
    scope: HTMLElement,
    name: string | RegExp,
    files: readonly (File | string)[],
): Promise<void> {
    const chosen = await Promise.all(
        files.map(async (file) =>
            typeof file === "string"
                ? { path: file }
                : { name: file.name, mimeType: file.type, base64: await base64(file) },
        ),
    );
    await commands.chooseNextFiles(chosen);
    await userEvent.click(within(scope).getByRole("button", { name }));
}

/**
 * Opens the Load custom model dialog from the Models pop-over's Add custom model... button.
 * @param tab - the Style tab.
 * @returns the dialog.
 */
export async function openCustom(tab: HTMLElement): Promise<HTMLElement> {
    const models = await openModels(tab);
    await userEvent.click(within(models).getByRole("button", { name: "Add custom model..." }));
    return screen.findByRole("dialog", { name: "Load custom model" });
}

/**
 * How many pixels of the preview's canvas are drawn (not fully transparent), as it shows now.
 * @param canvas - the canvas graphty-element draws the preview in.
 * @returns the count of drawn pixels.
 */
function drawnPixels(canvas: HTMLCanvasElement): number {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    let drawn = 0;
    for (let at = 3; at < data.length; at += 4) {
        drawn += data[at] > 0 ? 1 : 0;
    }
    return drawn;
}

/**
 * The preview's canvas, by its name.
 * @param dialog - the dialog.
 * @param name - the model's name.
 * @returns the canvas, or null while there is none.
 */
function previewCanvas(dialog: HTMLElement, name: string): HTMLCanvasElement | null {
    return within(dialog).queryByRole<HTMLCanvasElement>("img", { name: new RegExp(`^${name} preview`) });
}

/**
 * The preview's picture as it is now, to compare with a later one.
 * @param dialog - the dialog.
 * @param name - the model's name.
 * @returns the picture as a data URL, or "" without a preview.
 */
export function previewPicture(dialog: HTMLElement, name: string): string {
    return previewCanvas(dialog, name)?.toDataURL() ?? "";
}

/**
 * Waits until the dialog shows its model drawn live by graphty-element: its canvas, with the model
 * on it, not empty.
 * @param dialog - the dialog.
 * @param name - the model's name.
 * @returns the preview's canvas.
 */
export async function previewOf(dialog: HTMLElement, name: string): Promise<HTMLCanvasElement> {
    return waitFor(() => {
        const canvas = previewCanvas(dialog, name);
        assert.isNotNull(canvas, `${name} has a preview`);
        assert.isAbove(drawnPixels(canvas), 0, `${name} is drawn in the preview`);
        return canvas;
    });
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
