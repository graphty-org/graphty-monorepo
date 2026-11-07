/**
 * Pictures on nodes (`node.texture`) with the node models experiment on (issue #3396), in the Style
 * tab and on the canvas, on the real graphty-element, by real input: Fill's "+" adds a Picture line
 * whose pop-over takes a chosen picture; a model chosen there is offered as the layer's model, and
 * let go when it is not taken; a picture a layer names as its model moves to node.texture in one
 * undo step; Escape takes back an empty new Picture line and Delete removes a set one; a picture
 * dropped on the canvas finishes the model waiting for it. Every assertion reads what the element
 * reports: its layers and assets.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import { canvasElement, dropOn, fileInput, NODES, openShapes, written } from "./modelHarness";
import { quadGlb } from "./quadGlb";

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
 * Fill's "+" > Picture: the line is added and its pop-over opens at once.
 * @param tab - the Style tab.
 * @returns the Picture pop-over.
 */
async function addPicture(tab: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node fill" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Picture" }));
    return screen.findByRole("dialog", { name: "Picture" });
}

/**
 * Chooses colormap.png in the Picture pop-over and waits until the layer names it.
 * @param picture - the pop-over.
 * @param session - the element's session.
 * @returns what the layer names.
 */
async function chooseColormap(
    picture: HTMLElement,
    session: Awaited<ReturnType<typeof openShapes>>["session"],
): Promise<unknown> {
    await userEvent.upload(fileInput(picture), [await colormap()]);
    await waitFor(() => {
        assert.match(String(written(session, "node.texture")), /^asset:/);
    });
    return written(session, "node.texture");
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("pictures on nodes, on the real element", () => {
    it("puts a chosen picture on a sphere layer from Fill's Picture line", async () => {
        const { session, tab } = await openShapes(["node-models"], { "node.shape": "sphere" });
        const picture = await addPicture(tab);
        assert.isNotNull(within(picture).getByRole("button", { name: "Choose picture" }));
        await chooseColormap(picture, session);
        assert.equal(written(session, "node.shape"), "sphere");
        assert.isNotNull(await within(tab).findByLabelText("Node picture, colormap"));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }), "picking closes the pop-over");
        });
    });

    it("offers a model chosen in the Picture pop-over as the layer's model", async () => {
        const { session, tab } = await openShapes(["node-models"], { "node.model": "asset:sample/box" });
        const texture = await chooseColormap(await addPicture(tab), session);
        assert.equal(written(session, "node.model"), "asset:sample/box", "the model stays");

        // The line opens the pop-over again; the project's picture is there, and a .glb chosen there
        // is a model: Use as model writes node.model, never node.texture.
        await userEvent.click(await within(tab).findByLabelText("Node picture, colormap"));
        const picture = await screen.findByRole("dialog", { name: "Picture" });
        assert.isNotNull(within(picture).getByRole("button", { name: "colormap" }));
        await userEvent.upload(fileInput(picture), [new File([quadGlb()], "quad.glb")]);
        const use = await within(picture).findByRole("button", { name: "Use quad as model" });
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
        const { session, tab } = await openShapes(["node-models"], async (up) => {
            const record = await up.assets.add(await colormap());
            assert.equal(record.kind, "image");
            ({ id } = record);
            return { "node.model": id };
        });

        await userEvent.click(await within(tab).findByRole("button", { name: "Use colormap as picture" }));
        await waitFor(() => {
            assert.equal(written(session, "node.texture"), id);
            assert.isUndefined(written(session, "node.model"));
        });
        await session.undo();
        assert.equal(written(session, "node.model"), id);
        assert.isUndefined(written(session, "node.texture"));
    });

    it("finishes a waiting model with a picture dropped on the canvas", async () => {
        const store = createWorkspaceStore({ project: { name: "Models", id: 1 } });
        await siteFeatures(["node-models"]);
        render(<Workspace store={store} />);
        const { session } = await canvasElement();
        await session.data.addNodes(NODES);
        const before = session.styles.list().length;

        // The car alone: one layer names it while it waits.
        dropOn(screen.getByTestId("canvas"), [await fixture(policeUrl, "police.glb")]);
        await waitFor(() => {
            assert.lengthOf(session.styles.list(), before + 1);
        });
        assert.lengthOf(session.assets.waiting(), 1);
        assert.isNotNull(await screen.findByRole("button", { name: "police: 1 file missing" }));

        // Its picture: the same layer draws it, and no second layer is made.
        dropOn(screen.getByTestId("canvas"), [await colormap()]);
        await waitFor(() => {
            assert.lengthOf(session.assets.waiting(), 0);
        });
        const ref = session.styles.list().find((l) => l.set?.["node.model"] !== undefined)?.set?.["node.model"];
        await waitFor(() => {
            assert.equal(session.assets.states().find((change) => change.ref === ref)?.state, "drawn");
        });
        assert.lengthOf(session.styles.list(), before + 1);
        assert.equal(store.get().notice?.message, "colormap.png added to police");
    });

    it("takes back a Picture line just added and holding nothing on Escape, focus on the '+'", async () => {
        const { session, tab, store } = await openShapes(["node-models"], { "node.shape": "sphere" });
        await addPicture(tab);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }));
            assert.isNull(within(tab).queryByLabelText(/^Node picture/));
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add to node fill");
        });
        assert.equal(store.get().announcement, "Node picture not added");
        assert.isUndefined(written(session, "node.texture"));
    });

    it("removes the Picture line with Delete on its field", async () => {
        const { session, tab } = await openShapes(["node-models"], { "node.shape": "sphere" });
        await chooseColormap(await addPicture(tab), session);
        const field = await within(tab).findByLabelText("Node picture, colormap");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }));
        });
        field.focus();
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.isUndefined(written(session, "node.texture"));
        });
        assert.equal(written(session, "node.shape"), "sphere");
    });

    it("lets go of a model chosen in the Picture pop-over and not taken as the model", async () => {
        const { session, tab } = await openShapes(["node-models"], { "node.shape": "sphere" });
        const picture = await addPicture(tab);
        await userEvent.upload(fileInput(picture), [await fixture(policeUrl, "police.glb")]);
        assert.isNotNull(await within(picture).findByRole("button", { name: "Use police as model" }));
        assert.lengthOf(session.assets.waiting(), 1);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.lengthOf(session.assets.waiting(), 0, "nothing the reader did not choose waits");
        });
    });

    it("lets go of a model that finishes loading after the Picture pop-over closed", async () => {
        const url = "https://models.example.com/car/police.glb";
        const police = await (await fetch(policeUrl)).arrayBuffer();
        const asked: string[] = [];
        let answer: (response: Response) => void = () => undefined;
        const original = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const to = input instanceof Request ? input.url : String(input);
            if (to === url) {
                asked.push(to);
                return new Promise<Response>((resolve) => {
                    answer = resolve;
                });
            }
            // Its picture is not on the site: the model waits for it.
            return to.startsWith("https://models.example.com/")
                ? Promise.resolve(new Response(null, { status: 404 }))
                : original(input, init);
        });
        const { session, tab } = await openShapes(["node-models"], { "node.shape": "sphere" });
        await chooseColormap(await addPicture(tab), session);
        const field = await within(tab).findByLabelText("Node picture, colormap");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }));
        });

        await userEvent.click(field);
        let picture = await screen.findByRole("dialog", { name: "Picture" });
        await userEvent.type(within(picture).getByRole("textbox", { name: "Picture address" }), url);
        await userEvent.click(within(picture).getByRole("button", { name: "Add picture address" }));
        await waitFor(() => {
            assert.include(asked, url);
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }));
        });

        answer(new Response(police, { status: 200 }));
        // Open again: once the add has finished, its button is no longer loading.
        await userEvent.click(field);
        picture = await screen.findByRole("dialog", { name: "Picture" });
        await waitFor(() => {
            assert.isNull(
                within(picture).getByRole("button", { name: "Add picture address" }).getAttribute("data-loading"),
            );
        });
        assert.lengthOf(session.assets.waiting(), 0, "nothing the reader closed on waits for parts");
        assert.isNull(within(picture).queryByRole("button", { name: "Use police as model" }));
    });
});
