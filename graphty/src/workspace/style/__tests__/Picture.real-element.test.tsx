/**
 * Pictures on nodes (`node.texture`) in the tier 3 Style panel and on the canvas, on the REAL
 * graphty-element, by real input (node-models design 13.5, 13.7): Fill's "+" adds a Picture row
 * whose pop-over takes a chosen picture, on a built-in shape and on a model; a model chosen there
 * is offered as the layer's model; a picture a layer names as its model moves to node.texture in
 * one undo step; a picture dropped on the canvas supplies the model waiting for it, else becomes
 * one undoable layer. Every assertion reads what the element reports: its layers and assets.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import { quadGlb } from "./quadGlb";

/** A hang guard for the element coming up, loading and drawing, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "1", position: { x: -2, y: 0, z: 0 } },
    { id: "2", position: { x: 2, y: 0, z: 0 } },
];

/**
 * A fixture as a file, from the test server.
 * @param url - its URL.
 * @param name - the file's name.
 * @returns the file.
 */
async function fixture(url: string, name: string): Promise<File> {
    return new File([await (await fetch(url)).arrayBuffer()], name);
}

/**
 * colormap.png, from the Kenney car kit.
 * @returns the file.
 */
function colormap(): Promise<File> {
    return fixture(colormapUrl, "colormap.png");
}

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
 * A project with two nodes and a "Shapes" layer setting `set`, its Style tab open.
 * @param set - what the layer sets, or how to make it from the session.
 * @returns the session and the Style tab.
 */
async function openShapes(
    set: Record<string, string> | ((session: GraphSession) => Promise<Record<string, string>>),
): Promise<{ session: GraphSession; tab: HTMLElement }> {
    const store = createWorkspaceStore({ project: { name: "Pictures", id: 1 } });
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
 * Fill's "+" > Picture: the row is added and its pop-over opens at once.
 * @param tab - the Style tab.
 * @returns the Picture pop-over.
 */
async function addPicture(tab: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node fill" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Picture" }));
    return screen.findByRole("dialog", { name: "Picture" });
}

/**
 * The file input of a pop-over.
 * @param root - where it is.
 * @returns the input.
 */
function chooserIn(root: HTMLElement): HTMLInputElement {
    const input = root.querySelector<HTMLInputElement>("input[type=file]");
    if (input === null) {
        throw new Error("no file input");
    }
    return input;
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

describe("pictures on nodes, on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("puts a chosen picture on a sphere layer from Fill's Picture row", async () => {
        const { session, tab } = await openShapes({ "node.shape": "sphere" });
        const picture = await addPicture(tab);
        assert.isNotNull(within(picture).getByRole("button", { name: "Choose picture" }));
        await userEvent.upload(chooserIn(picture), [await colormap()]);

        await waitFor(
            () => {
                assert.match(String(written(session, "node.texture")), /^asset:/);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(written(session, "node.shape"), "sphere");
        assert.isNotNull(await within(tab).findByRole("textbox", { name: "Node picture, colormap" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }), "picking closes the pop-over");
        });
        assert.notInclude(document.body.textContent, "cannot be loaded");
    });

    it("puts a picture on a model layer, and offers a model chosen there as the layer's model", async () => {
        const { session, tab } = await openShapes({ "node.model": "asset:sample/box" });
        let picture = await addPicture(tab);
        await userEvent.upload(chooserIn(picture), [await colormap()]);
        await waitFor(
            () => {
                assert.match(String(written(session, "node.texture")), /^asset:/);
            },
            { timeout: TIMEOUT_MS },
        );
        const texture = written(session, "node.texture");
        assert.equal(written(session, "node.model"), "asset:sample/box", "the model stays");

        // The row opens the pop-over again; the project's picture is there, and a .glb chosen
        // there is a model: Use as model writes node.model, never node.texture.
        await userEvent.click(await within(tab).findByRole("textbox", { name: "Node picture, colormap" }));
        picture = await screen.findByRole("dialog", { name: "Picture" });
        assert.isNotNull(within(picture).getByRole("button", { name: "colormap" }));
        await userEvent.upload(chooserIn(picture), [new File([quadGlb()], "quad.glb")]);
        const use = await within(picture).findByRole("button", { name: "Use quad as model" }, { timeout: TIMEOUT_MS });
        assert.isNotNull(within(picture).getByText("Not a picture"));
        await userEvent.click(use);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
            assert.notEqual(written(session, "node.model"), "asset:sample/box");
        });
        assert.equal(written(session, "node.texture"), texture);
    });

    it("moves a picture a layer names as its model to node.texture, in one undo step", async () => {
        let id = "";
        const { session, tab } = await openShapes(async (s) => {
            const record = await s.assets.add(await colormap());
            assert.equal(record.kind, "image");
            ({ id } = record);
            return { "node.model": id };
        });

        const use = await within(tab).findByRole(
            "button",
            { name: "Use colormap as picture" },
            { timeout: TIMEOUT_MS },
        );
        assert.isNotNull(within(tab).getByText("Picture"));
        await userEvent.click(use);
        await waitFor(() => {
            assert.equal(written(session, "node.texture"), id);
            assert.isUndefined(written(session, "node.model"));
        });
        await session.undo();
        assert.equal(written(session, "node.model"), id);
        assert.isUndefined(written(session, "node.texture"));
    });

    it("puts on the nodes a waiting model the picture dropped on the canvas finishes, when no layer names it", async () => {
        const store = createWorkspaceStore({ project: { name: "Pictures", id: 1 } });
        render(<Workspace store={store} />);
        const { session } = await canvasElement();
        await session.data.addNodes(NODES);
        const police = await session.assets.add(await fixture(policeUrl, "police.glb"));
        assert.lengthOf(session.assets.waiting(), 1, "police waits for its picture");
        const before = session.styles.list().length;

        dropOn(screen.getByTestId("canvas"), [await colormap()]);
        await waitFor(
            () => {
                assert.lengthOf(session.assets.waiting(), 0);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(session.assets.list().find((r) => r.kind === "model")?.state, "accepted");
        assert.notEqual(police.state, "accepted");
        await waitFor(() => {
            assert.lengthOf(session.styles.list(), before + 1, "one layer draws the finished model");
        });
        const layer = session.styles.list().find((l) => l.set?.["node.model"] !== undefined);
        const named = layer?.set?.["node.model"];
        assert.isString(named);
        assert.equal(session.assets.find(named as string)?.state, "accepted");
        assert.equal(store.get().notice?.message, "Nodes drawn as police");
    });

    it("draws police.glb then colormap.png dropped on the canvas: the layer waits, then draws", async () => {
        const store = createWorkspaceStore({ project: { name: "Pictures", id: 1 } });
        render(<Workspace store={store} />);
        const { session } = await canvasElement();
        await session.data.addNodes(NODES);
        const before = session.styles.list().length;

        // The car alone: one layer names it while it waits, and the notice names what is missing.
        dropOn(screen.getByTestId("canvas"), [await fixture(policeUrl, "police.glb")]);
        await waitFor(
            () => {
                assert.lengthOf(session.styles.list(), before + 1);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.lengthOf(session.assets.waiting(), 1);
        assert.include(store.get().notice?.message ?? "", "Textures/colormap.png");
        // The new layer opens in the Style panel, its Shape field naming the car with its chip in view.
        const made = session.styles.list().find((l) => l.set?.["node.model"] !== undefined);
        assert.deepEqual(store.get().inspected, { kind: "layer-row", id: made?.id, tab: "style" });
        assert.isNotNull(
            await screen.findByRole("button", { name: "1 missing, police" }, { timeout: TIMEOUT_MS }),
            "the missing-parts chip is in view",
        );

        // Its picture: the same layer draws it, and no second layer is made.
        dropOn(screen.getByTestId("canvas"), [await colormap()]);
        await waitFor(
            () => {
                assert.lengthOf(session.assets.waiting(), 0);
            },
            { timeout: TIMEOUT_MS },
        );
        const layer = session.styles.list().find((l) => l.set?.["node.model"] !== undefined);
        const ref = layer?.set?.["node.model"] as string;
        await waitFor(
            () => {
                assert.equal(session.assets.states().find((change) => change.ref === ref)?.state, "drawn");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.lengthOf(session.styles.list(), before + 1);
        assert.equal(store.get().notice?.message, "colormap.png added to police");
    });

    it("takes back a Picture line just added and holding nothing on Escape, focus on the '+'", async () => {
        const { session, tab } = await openShapes({ "node.shape": "sphere" });
        await addPicture(tab);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }));
            assert.isNull(within(tab).queryByRole("textbox", { name: /^Node picture/ }));
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add to node fill");
        });
        assert.isUndefined(written(session, "node.texture"));
    });

    it("lets go of a model chosen in the Picture pop-over and not taken as the model", async () => {
        const { session, tab } = await openShapes({ "node.shape": "sphere" });
        const picture = await addPicture(tab);
        await userEvent.upload(chooserIn(picture), [await fixture(policeUrl, "police.glb")]);
        assert.isNotNull(
            await within(picture).findByRole("button", { name: "Use police as model" }, { timeout: TIMEOUT_MS }),
        );
        assert.lengthOf(session.assets.waiting(), 1);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.lengthOf(session.assets.waiting(), 0, "nothing the reader did not choose waits");
        });
    });

    it("draws a picture dropped on the canvas on every node, as one undoable layer", async () => {
        const store = createWorkspaceStore({ project: { name: "Pictures", id: 1 } });
        render(<Workspace store={store} />);
        const { session } = await canvasElement();
        await session.data.addNodes(NODES);
        const before = session.styles.list().length;

        dropOn(screen.getByTestId("canvas"), [await colormap()]);
        await waitFor(
            () => {
                assert.lengthOf(session.styles.list(), before + 1);
            },
            { timeout: TIMEOUT_MS },
        );
        const layer = session.styles.list().find((l) => l.set?.["node.texture"] !== undefined);
        assert.deepEqual(layer?.selector, { match: "everything" });
        assert.isUndefined(layer?.set?.["node.model"]);
        assert.equal(store.get().notice?.message, "Nodes drawn with colormap");
        await session.undo();
        assert.lengthOf(session.styles.list(), before);
    });

    it("opens a picture dropped on the start screen as a project drawing its nodes with it", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const land = await screen.findByText(/Or drop a file anywhere/, {}, { timeout: TIMEOUT_MS });
        dropOn(land, [await colormap()]);

        const { session } = await canvasElement();
        await waitFor(
            () => {
                assert.isDefined(session.styles.list().find((l) => l.set?.["node.texture"] !== undefined));
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(store.get().project?.name, "colormap");
        assert.isNull(session.data.lastImport(), "nothing was read as graph data");
    });
});
