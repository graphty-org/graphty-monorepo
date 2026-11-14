/**
 * The Load custom model dialog with the node models experiment on (issue #3396, node-models design
 * 14), on the real graphty-element, by real input: opened from the Main menu (Add only adds the
 * model to the project) or from the Models pop-over's Custom model... (Add names it on the layer,
 * with the dialog's settings, in one undo step); a folder, a file or an address loads one model
 * whose preview graphty-element draws; a missing picture is answered from the row or with another
 * file of the set; Cancel lets go of what it loaded; Advanced starts closed. Every assertion reads
 * what the element reports: its layers, its assets and its pictures.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import damagedPlyUrl from "../__fixtures__/variants/damaged.ply?url";
import pointsPlyUrl from "../__fixtures__/variants/points.ply?url";
import { addModel, fileInput, openCustom, openModels, openShapes, previewOf, written } from "./modelHarness";
import { dotPng, quadGlb } from "./quadGlb";

/** The car kit's folder, as the file chooser reads it (relative to the graphty project). */
const KIT_FOLDER = "src/workspace/style/__fixtures__/car-kit";

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
 * quad.glb, as a chosen file.
 * @returns the file.
 */
function quadFile(): File {
    return new File([quadGlb()], "quad.glb", { type: "model/gltf-binary" });
}

/**
 * The accepted models of the project.
 * @param session - the element's session.
 * @returns their main files.
 */
function models(session: GraphSession): (string | undefined)[] {
    return session.assets
        .list()
        .filter((r) => r.kind === "model" && r.state === "accepted")
        .map((r) => r.path);
}

/**
 * Opens the dialog from the Main menu.
 * @returns the dialog.
 */
async function fromMenu(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Custom model..." }));
    return screen.findByRole("dialog", { name: "Load custom model" });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("the Load custom model dialog, on the real element", () => {
    it("adds the car kit's folder to the project from the Main menu, changing no layer", async () => {
        const { session, tab, store } = await openShapes();
        const dialog = await fromMenu();
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Model address");
        });
        await userEvent.upload(fileInput(dialog, true), KIT_FOLDER);
        await previewOf(dialog, "police");
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Name", "focus moves to Name");
        });
        assert.equal(
            within(dialog).getByRole("button", { name: "Files" }).getAttribute("aria-expanded"),
            "false",
            "a set whose files were all found keeps Files closed",
        );
        await addModel(dialog, "Add to project");
        assert.include(models(session), "police.glb");
        assert.isUndefined(written(session, "node.model"), "no layer names it");
        assert.equal(store.get().notice?.message, "police added to the project", "a notice the reader sees");
        assert.equal(store.get().announcement, "police added to the project");
        const own = within(await openModels(tab)).getByRole("group", { name: "In this project" });
        assert.isNotNull(within(own).getByRole("button", { name: "police" }));
    });

    it("names a chosen .glb on the layer from Custom model..., taken back in one undo step", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        assert.isNull(screen.queryByRole("dialog", { name: "Models" }), "one at a time");
        assert.equal(
            within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"),
            "true",
            "nothing to add yet",
        );
        await userEvent.upload(fileInput(dialog), [quadFile()]);
        await previewOf(dialog, "quad");
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
        assert.isNotNull(await within(tab).findByRole("combobox", { name: "Node shape, quad" }));
        await session.undo();
        await waitFor(() => {
            assert.isUndefined(written(session, "node.model"));
        });
    });

    it("lists police.glb's missing picture, and takes it from the row's Choose", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [await fixture(policeUrl, "police.glb")]);
        const files = await within(dialog).findByTestId("model-files");
        await waitFor(() => {
            assert.equal(within(dialog).getByRole("button", { name: "Files" }).getAttribute("aria-expanded"), "true");
        });
        const row = within(files).getByRole("group", { name: "colormap.png" });
        assert.isNotNull(within(row).getByText("Texture"));
        await waitFor(() => {
            assert.isTrue(row.contains(document.activeElement), "focus moves to the part that needs an answer");
        });
        assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), "true");
        await userEvent.upload(fileInput(row), [await fixture(colormapUrl, "colormap.png")]);
        await previewOf(dialog, "police");
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
    });

    it("maps a picture named otherwise to the missing one with Use file", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [
            await fixture(policeUrl, "police.glb"),
            await fixture(colormapUrl, "paint.png"),
        ]);
        const files = await within(dialog).findByTestId("model-files");
        assert.isNotNull(await within(files).findByText("Not used"));
        await userEvent.click(within(files).getByRole("combobox", { name: "File for colormap.png" }));
        await userEvent.click(await screen.findByRole("option", { name: "paint.png" }));
        await previewOf(dialog, "police");
        const record = session.assets.list().find((r) => r.path === "police.glb" && r.state === "accepted");
        assert.deepEqual(
            record?.parts?.map((p) => [p.role, p.state]),
            [
                ["model", "found"],
                ["texture", "found"],
            ],
        );
    });

    it("asks which file is the model for a set of two, and loads the one picked", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [quadFile(), await fixture(policeUrl, "police.glb")]);
        const files = await within(dialog).findByTestId("model-files");
        await userEvent.click(await within(files).findByRole("combobox", { name: "Which file is the model" }));
        await userEvent.click(await screen.findByRole("option", { name: "quad.glb" }));
        await previewOf(dialog, "quad");
    });

    it("hands files that are not a model to the model waiting, and replaces it with a model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [await fixture(policeUrl, "police.glb")]);
        await within(dialog).findByRole("group", { name: "colormap.png" });
        // Two pictures at once: graphty-element matches colormap.png to the part, paint.png to none.
        await userEvent.click(within(dialog).getByRole("button", { name: "Replace..." }));
        await userEvent.upload(fileInput(dialog), [
            await fixture(colormapUrl, "colormap.png"),
            await fixture(colormapUrl, "paint.png"),
        ]);
        await previewOf(dialog, "police");

        // A model chosen now replaces police, which the dialog lets go of.
        await userEvent.click(within(dialog).getByRole("button", { name: "Replace..." }));
        await userEvent.upload(fileInput(dialog), [quadFile()]);
        await previewOf(dialog, "quad");
        await waitFor(() => {
            assert.deepEqual(models(session), ["quad.glb"]);
        });
    });

    it("replaces police waiting for its picture with another model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [await fixture(policeUrl, "police.glb")]);
        await within(dialog).findByRole("group", { name: "colormap.png" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Replace..." }));
        await userEvent.upload(fileInput(dialog), [quadFile()]);
        await previewOf(dialog, "quad");
        assert.isUndefined(
            session.assets.waiting().find((w) => w.path === "police.glb"),
            "police is let go",
        );
    });

    it("lets go of what it loaded on Cancel and on Escape, but keeps a model the project had", async () => {
        const { session, tab } = await openShapes();
        let dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [quadFile()]);
        await previewOf(dialog, "quad");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
        });
        assert.deepEqual(models(session), [], "Cancel let it go");

        dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [quadFile()]);
        await previewOf(dialog, "quad");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
        });
        assert.deepEqual(models(session), [], "Escape let it go");

        await session.assets.add(quadFile());
        dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [quadFile()]);
        await previewOf(dialog, "quad");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
        });
        assert.deepEqual(models(session), ["quad.glb"], "the project's own model stays");
    });

    it("keeps the reader's name for the model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [quadFile()]);
        await previewOf(dialog, "quad");
        const name = within(dialog).getByRole("textbox", { name: "Name" });
        await userEvent.clear(name);
        await userEvent.type(name, "Cruiser{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
        });
        assert.isNotNull(await within(tab).findByRole("combobox", { name: "Node shape, Cruiser" }));
        assert.equal(session.assets.find(String(written(session, "node.model")))?.plainName, "Cruiser");
        const own = within(await openModels(tab)).getByRole("group", { name: "In this project" });
        assert.isNotNull(within(own).getByRole("button", { name: "Cruiser" }));
    });

    it("keeps Advanced closed, redraws the preview for Up, and writes it with the model in one step", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [quadFile()]);
        const before = (await previewOf(dialog, "quad")).src;
        const advanced = within(dialog).getByRole("button", { name: "Advanced" });
        assert.equal(advanced.getAttribute("aria-expanded"), "false");
        await userEvent.click(advanced);
        const rows = within(dialog).getByTestId("model-advanced");
        assert.match(within(rows).getByTestId("model-details").textContent, /^Details: GLB, 4 triangles/);
        await userEvent.click(within(rows).getByRole("combobox", { name: /^Up, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Z" }));
        await waitFor(() => {
            assert.notEqual(within(dialog).getByRole<HTMLImageElement>("img", { name: "quad preview" }).src, before);
        });
        assert.isUndefined(written(session, "node.modelSourceUp"), "a draft until Add");
        await addModel(dialog);
        await waitFor(() => {
            assert.equal(written(session, "node.modelSourceUp"), "z");
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
        await session.undo();
        await waitFor(() => {
            assert.isUndefined(written(session, "node.model"));
            assert.isUndefined(written(session, "node.modelSourceUp"));
        });
    });

    it("names a point cloud's variant under its preview and flags it Approximated on the Advanced line", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [await fixture(pointsPlyUrl, "points.ply")]);
        await previewOf(dialog, "points");
        assert.equal(within(dialog).getByTestId("model-variant").textContent, "PLY, binary, point cloud");
        const advanced = within(dialog).getByRole("button", { name: "Advanced" });
        assert.isNotNull(within(advanced.parentElement ?? dialog).getByText("Approximated"));
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
    });

    it("shows why graphty-element could not draw an accepted model, and blocks Add", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [await fixture(damagedPlyUrl, "cube.ply")]);
        const preview = await within(dialog).findByTestId("model-preview");
        assert.isNotNull(await within(preview).findByText("Not loaded"));
        assert.isNull(preview.querySelector("img"));
        assert.match(within(dialog).getByTestId("model-refusal").textContent, /^Not loaded: /);
        assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), "true");
    });

    it("offers a lone picture as the layer's picture", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [new File([dotPng()], "colormap.png")]);
        assert.isNotNull(await within(dialog).findByText(/^colormap is a picture, not a 3D model/));
        await userEvent.click(within(dialog).getByRole("button", { name: "Use colormap as picture" }));
        await waitFor(() => {
            assert.match(String(written(session, "node.texture")), /^asset:/);
        });
        assert.isUndefined(written(session, "node.model"), "nothing names the picture as a model");
    });

    it("writes nothing for an address that finishes loading after the dialog closed", async () => {
        const url = "https://models.example.com/late/panel.glb";
        const asked: string[] = [];
        let answer: (response: Response) => void = () => undefined;
        const original = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const to = input instanceof Request ? input.url : String(input);
            if (to !== url) {
                return original(input, init);
            }
            asked.push(to);
            return new Promise<Response>((resolve) => {
                answer = resolve;
            });
        });
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${url}{Enter}`);
        await waitFor(() => {
            assert.include(asked, url);
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
        });
        answer(new Response(quadGlb(), { status: 200 }));
        await waitFor(() => {
            assert.isUndefined(session.assets.find(url), "let go once it settled");
        });
        assert.isUndefined(written(session, "node.model"), "the reader closed it before it loaded");
    });

    it("has no Main menu row with the experiment off", async () => {
        await openShapes([]);
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await screen.findByRole("menuitem", { name: "Add Shader..." });
        assert.isNull(screen.queryByRole("menuitem", { name: "Custom model..." }));
        await userEvent.keyboard("{Escape}");
    });
});
