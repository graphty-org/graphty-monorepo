/**
 * The Load custom model dialog with the node models experiment on (issue #3396, node-models design
 * 14), on the real graphty-element, by real input: opened from the Main menu (Add only adds the
 * model to the project) or from the Models pop-over's Add custom model... (Add names it on the layer,
 * with the dialog's settings, in one undo step); a folder, a file or an address loads one model
 * whose preview graphty-element draws; a missing picture is answered from the row or with another
 * file of the set; Cancel lets go of what it loaded; More options starts closed while Details and Files are plain lists; a load
 * shows its progress and Cancel load stops it; once loaded the preview sits right of the name and
 * its rotate buttons write Up and Turn. Every assertion reads
 * what the element reports: its layers, its assets and its pictures.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { withoutFeatures } from "../../../test/features";
import { dragAcross } from "../../../test/real-pointer";
import { screen, waitFor, within } from "../../../test/test-utils";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import damagedPlyUrl from "../__fixtures__/variants/damaged.ply?url";
import pointsPlyUrl from "../__fixtures__/variants/points.ply?url";
import {
    addModel,
    choose,
    dropOn,
    openCustom,
    openModels,
    openShapes,
    previewOf,
    previewPicture,
    written,
} from "./modelHarness";
import { dotPng, quadGlb } from "./quadGlb";

/** babylonjs-models' variant fixtures, as the file chooser reads them (relative to the graphty project). */
const VARIANTS = "../babylonjs-models/test/fixtures/variants";

// These tests drive the Style panel the app shows with file styles off; the panel by part of the
// drawing, which replaces the node tab with them on, is tested in PartsPanel.real-element.test.tsx.
withoutFeatures(["file-styles"]);

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
    await userEvent.click(await screen.findByRole("menuitem", { name: "Add custom model..." }));
    return screen.findByRole("dialog", { name: "Load custom model" });
}

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * Serves one address as a download that arrives only when the test pushes it, and records whether
 * it was stopped. Every other address is fetched as usual.
 * @param url - the address.
 * @param body - the file, for its Content-Length (four times its size, so it never finishes).
 * @returns the push, once the download has started, and whether it was cancelled.
 */
function slowFetch(url: string, body: Uint8Array): { push?: (chunk: Uint8Array) => void; cancelled: boolean } {
    const state: { push?: (chunk: Uint8Array) => void; cancelled: boolean } = { cancelled: false };
    const original = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const to = input instanceof Request ? input.url : String(input);
        if (to !== url) {
            return original(input, init);
        }
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                state.push = (chunk) => {
                    controller.enqueue(chunk);
                };
            },
            cancel() {
                state.cancelled = true;
            },
        });
        init?.signal?.addEventListener("abort", () => {
            state.cancelled = true;
        });
        return Promise.resolve(
            new Response(stream, { status: 200, headers: { "content-length": String(body.byteLength * 4) } }),
        );
    });
    return state;
}

describe("the Load custom model dialog, on the real element", () => {
    it("adds the car kit's folder to the project from the Main menu, changing no layer", async () => {
        const { session, tab, store } = await openShapes();
        const dialog = await fromMenu();
        await waitFor(() => {
            assert.equal(
                document.activeElement?.getAttribute("aria-label"),
                "Model address",
                "focus starts on the address",
            );
        });
        await choose(dialog, "Choose folder", [KIT_FOLDER]);
        await previewOf(dialog, "police");
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Name", "focus moves to Name");
        });
        const files = within(dialog).getByRole("region", { name: "Files" });
        assert.isNotNull(within(files).getByText("police.glb"), "the set's files are listed, with nothing to open");
        assert.isNull(within(dialog).queryByRole("button", { name: "Files" }), "Files is no disclosure");
        await addModel(dialog, "Add to project");
        assert.include(models(session), "police.glb");
        assert.isUndefined(written(session, "node.model"), "no layer names it");
        assert.equal(store.get().notice?.message, "police added to the project", "a notice the reader sees");
        assert.equal(store.get().announcement, "police added to the project");
        const own = within(await openModels(tab)).getByRole("group", { name: "In this project" });
        assert.isNotNull(within(own).getByRole("button", { name: "police" }));
    });

    it("names a chosen .glb on the layer from Add custom model..., taken back in one undo step", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        assert.isNull(screen.queryByRole("dialog", { name: "Models" }), "one at a time");
        assert.equal(
            within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"),
            "true",
            "nothing to add yet",
        );
        await choose(dialog, "Choose file", [quadFile()]);
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
        await choose(dialog, "Choose file", [await fixture(policeUrl, "police.glb")]);
        const files = await within(dialog).findByTestId("model-files");
        const row = within(files).getByRole("group", { name: "colormap.png" });
        assert.isNotNull(within(row).getByText("Texture"));
        assert.equal(files.tagName, "SECTION", "a plain list, no disclosure");
        assert.isNull(within(dialog).queryByRole("button", { name: "Files" }));
        assert.equal(getComputedStyle(files).overflowY, "auto", "it scrolls past its height");
        assert.isTrue(
            row.contains(files.querySelector("[data-part], .ws-part-row")),
            "the part that needs an answer is listed first",
        );
        await waitFor(() => {
            assert.isTrue(row.contains(document.activeElement), "focus moves to the part that needs an answer");
        });
        assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), "true");
        await choose(row, "Choose colormap.png", [await fixture(colormapUrl, "colormap.png")]);
        await previewOf(dialog, "police");
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
    });

    it("maps a picture named otherwise to the missing one with Use file", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        // Several files at once come by a drop: the chooser takes the model's own file.
        dropOn(within(dialog).getByTestId("custom-model"), [
            await fixture(policeUrl, "police.glb"),
            await fixture(colormapUrl, "paint.png"),
        ]);
        const files = await within(dialog).findByTestId("model-files");
        assert.isNotNull(await within(files).findByText("Not used"));
        await userEvent.click(within(files).getByRole("combobox", { name: "File for colormap.png" }));
        await userEvent.click(await screen.findByRole("option", { name: "paint.png" }));
        await waitFor(() => {
            assert.isNull(within(files).queryByRole("combobox", { name: "File for colormap.png" }), "answered");
        });
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

    it("steps through a drop of three models, and adds the ones checked with their names", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        const wall = new File([quadGlb()], "wall.glb", { type: "model/gltf-binary" });
        dropOn(within(dialog).getByTestId("custom-model"), [
            quadFile(),
            wall,
            await fixture(policeUrl, "police.glb"),
            await fixture(colormapUrl, "colormap.png"),
        ]);
        const position = await within(dialog).findByTestId("model-position");
        const label = within(dialog).getByTestId("model-label");
        await previewOf(dialog, "police");
        assert.equal(position.textContent, "1 of 3");
        assert.equal(label.textContent, "police", "the box names the model it shows");

        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await previewOf(dialog, "quad");
        assert.equal(position.textContent, "2 of 3");
        assert.equal(label.textContent, "quad");
        await userEvent.click(within(dialog).getByRole("checkbox", { name: "Load this model" }));
        assert.isNotNull(within(dialog).getByRole("button", { name: "Add 2 models" }));

        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await previewOf(dialog, "wall");
        assert.isTrue(within(dialog).getByRole<HTMLInputElement>("checkbox", { name: "Load this model" }).checked);
        const nameField = within(dialog).getByRole("textbox", { name: "Name" });
        await userEvent.clear(nameField);
        await userEvent.type(nameField, "Wall panel");
        await waitFor(() => {
            assert.equal(label.textContent, "Wall panel");
        });

        // The arrow keys on the arrows step too, wrapping round to the first.
        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await previewOf(dialog, "police");
        await userEvent.keyboard("{ArrowLeft}");
        await waitFor(() => {
            assert.equal(position.textContent, "3 of 3");
        });
        assert.equal(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value, "Wall panel");
        await userEvent.keyboard("{ArrowRight}");
        await previewOf(dialog, "police");

        await addModel(dialog, "Add 2 models");
        await waitFor(() => {
            assert.sameMembers(models(session), ["police.glb", "wall.glb"], "the unchecked quad is let go");
        });
        const named = session.assets.list().find((r) => r.path === "wall.glb");
        assert.equal(named?.plainName, "Wall panel");
        const police = session.assets.list().find((r) => r.path === "police.glb");
        assert.equal(written(session, "node.model"), police?.id, "the layer takes the model shown");
    });

    it("unchecks every model of a set and blocks Add", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        const wall = new File([quadGlb()], "wall.glb", { type: "model/gltf-binary" });
        dropOn(within(dialog).getByTestId("custom-model"), [quadFile(), wall]);
        await previewOf(dialog, "quad");
        await userEvent.click(within(dialog).getByRole("checkbox", { name: "Load this model" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await previewOf(dialog, "wall");
        await userEvent.click(within(dialog).getByRole("checkbox", { name: "Load this model" }));
        const add = within(dialog).getByRole("button", { name: "Add model" });
        assert.equal(add.getAttribute("aria-disabled"), "true");
    });

    it("shows one model of a folder as before: no arrows, no checkbox", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose folder", [KIT_FOLDER]);
        await previewOf(dialog, "police");
        assert.isNull(within(dialog).queryByRole("button", { name: "Next model" }));
        assert.isNull(within(dialog).queryByRole("checkbox", { name: "Load this model" }));
        assert.isNull(within(dialog).queryByTestId("model-label"));
    });

    it("hands files that are not a model to the model waiting, and replaces it with a model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [await fixture(policeUrl, "police.glb")]);
        await within(dialog).findByRole("group", { name: "colormap.png" });
        // Two pictures dropped at once: graphty-element matches colormap.png to the part, paint.png to none.
        const body = within(dialog).getByTestId("custom-model");
        dropOn(body, [await fixture(colormapUrl, "colormap.png"), await fixture(colormapUrl, "paint.png")]);
        await waitFor(() => {
            assert.isNull(within(dialog).queryByRole("group", { name: "colormap.png" }), "the part is answered");
        });
        await previewOf(dialog, "police");

        // A model dropped now replaces police, which the dialog lets go of.
        dropOn(body, [quadFile()]);
        await previewOf(dialog, "quad");
        await waitFor(() => {
            assert.deepEqual(models(session), ["quad.glb"]);
        });
    });

    it("replaces police waiting for its picture with another model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [await fixture(policeUrl, "police.glb")]);
        await within(dialog).findByRole("group", { name: "colormap.png" });
        dropOn(within(dialog).getByTestId("custom-model"), [quadFile()]);
        await previewOf(dialog, "quad");
        assert.isUndefined(
            session.assets.waiting().find((w) => w.path === "police.glb"),
            "police is let go",
        );
    });

    it("shows a file glyph on its chooser, says a file may be dropped, and marks a drag over the dialog", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        const chooser = within(dialog).getByRole("button", { name: "Choose file" });
        assert.equal(chooser.querySelector("svg")?.getAttribute("data-glyph"), "fileUpload");
        const address = within(dialog).getByRole("textbox", { name: "Model address" });
        assert.equal(address.getAttribute("placeholder"), "Model address, or drop a file");
        const empty = within(dialog).getByTestId("model-preview");
        assert.equal(getComputedStyle(empty).borderTopStyle, "dashed", "the empty preview is drawn as a drop area");
        assert.include(empty.textContent, "Drop a model file, a folder or a .zip here");

        const body = within(dialog).getByTestId("custom-model");
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(quadFile());
        for (const type of ["dragenter", "dragover"]) {
            body.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
        }
        await waitFor(() => {
            assert.equal(dialog.querySelector(".cm-file-drop-cue")?.textContent, "Drop to load model");
        });
        assert.equal(body.dataset.over, "true", "the whole dialog is lit as the drop target");
        body.dispatchEvent(new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }));
        await previewOf(dialog, "quad");
        assert.isNull(dialog.querySelector(".cm-file-drop-cue"), "the cue goes with the drag");
    });

    it("takes the loaded model out with the x beside its name, back to the empty dialog", async () => {
        const { session, tab, store } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        // One line says what was loaded: its name and the x, with no chooser or address under it.
        const line = within(dialog).getByTitle("quad.glb");
        assert.isTrue(line.classList.contains("cm-file-loaded"), "the file loader's loaded line");
        assert.equal(line.textContent, "quad.glb");
        assert.isNull(within(dialog).queryByRole("button", { name: "Choose file" }), "no chooser");
        assert.isNull(within(dialog).queryByRole("textbox", { name: "Model address" }), "no address field");
        assert.lengthOf(within(dialog).getAllByText("quad.glb"), 1, "the name is said once");
        const name = within(dialog).getByRole("textbox", { name: "Name" });
        await userEvent.clear(name);
        await userEvent.type(name, "Panel");
        await userEvent.click(within(dialog).getByRole("button", { name: "More options" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Remove quad.glb" }));

        await within(dialog).findByRole("button", { name: "Choose file" });
        assert.equal(
            document.activeElement,
            within(dialog).getByRole("textbox", { name: "Model address" }),
            "focus goes to the address that comes back",
        );
        assert.isNull(within(dialog).queryByRole("textbox", { name: "Name" }), "no Name");
        assert.isNull(within(dialog).queryByRole("button", { name: "More options" }), "no More options");
        assert.isNull(dialog.querySelector(".cm-file-loaded"), "no file line");
        const blank = within(dialog).getByTestId("model-preview");
        assert.isNull(blank.querySelector("canvas"), "no model drawn");
        assert.include(blank.textContent, "Drop a model file", "the empty drop area again");
        assert.equal(store.get().announcement, "quad.glb removed");
        await waitFor(() => {
            assert.deepEqual(models(session), [], "what nothing uses is let go");
        });
        assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), "true");

        // Loading again starts fresh: the file's own name, More options closed.
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        assert.equal(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value, "quad");
        assert.equal(
            within(dialog).getByRole("button", { name: "More options" }).getAttribute("aria-expanded"),
            "false",
        );
    });

    it("draws a model waiting for a picture or a material, while Files still asks for it", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [await fixture(policeUrl, "police.glb")]);
        await previewOf(dialog, "police");
        assert.isNotNull(within(dialog).getByRole("group", { name: "colormap.png" }), "the picture is still asked for");
        assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), "true");

        await userEvent.click(await within(dialog).findByRole("button", { name: "Remove police.glb" }));
        await choose(dialog, "Choose file", [`${VARIANTS}/obj-mtl-png/cube.obj`]);
        await previewOf(dialog, "cube");
        assert.isNotNull(within(dialog).getByRole("group", { name: "cube.mtl" }), "the material is still asked for");
    });

    it("chooses the model's own file first, then asks for its parts with a chooser that filters nothing", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [`${VARIANTS}/obj-mtl-png/cube.obj`]);
        const main = await commands.lastFileChooser();
        assert.isFalse(main?.multiple, "one file");
        const offered = String(main?.accept).split(",");
        assert.includeMembers(offered, [".obj", ".glb", ".gltf", ".zip"]);
        for (const part of [".mtl", ".bin", ".json", ".png"]) {
            assert.notInclude(offered, part, `${part} is asked for after the model`);
        }

        const row = await within(dialog).findByRole("group", { name: "cube.mtl" });
        const partChooser = within(row).getByRole("button", { name: "Choose cube.mtl" });
        assert.equal(partChooser.querySelector("svg")?.getAttribute("data-glyph"), "fileUpload", "the same glyph");
        assert.equal(
            within(row).getByRole("textbox", { name: "cube.mtl address" }).getAttribute("placeholder"),
            "cube.mtl address, or drop a file",
        );
        await choose(row, "Choose cube.mtl", [`${VARIANTS}/obj-mtl-png/cube.mtl`]);
        assert.isNull((await commands.lastFileChooser())?.accept ?? null, "an .mtl is offered whatever its type");
        const picture = await within(dialog).findByRole("group", { name: "cube.png" });
        await choose(picture, "Choose cube.png", [`${VARIANTS}/obj-mtl-png/cube.png`]);
        await waitFor(() => {
            assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), null);
        });
        await previewOf(dialog, "cube");
    });

    it("keeps the cube and its missing chip for a .gltf waiting for its .bin", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [`${VARIANTS}/gltf-bin/cube.gltf`]);
        await within(dialog).findByRole("group", { name: "cube.bin" });
        const preview = within(dialog).getByTestId("model-preview");
        assert.isNotNull(within(preview).getByText("1 missing"));
        assert.isNull(within(preview).queryByRole("img"), "nothing to draw without its geometry");
        assert.isNull(within(dialog).queryByTestId("model-refusal"), "and no refusal said");
    });

    it("lets go of what it loaded on Cancel and on Escape, but keeps a model the project had", async () => {
        const { session, tab } = await openShapes();
        let dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
        });
        assert.deepEqual(models(session), [], "Cancel let it go");

        dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
        });
        assert.deepEqual(models(session), [], "Escape let it go");

        await session.assets.add(quadFile());
        dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
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
        await choose(dialog, "Choose file", [quadFile()]);
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

    it("keeps More options closed, redraws the preview for Up, and writes it with the model in one step", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        const before = previewPicture(dialog, "quad");
        const more = within(dialog).getByRole("button", { name: "More options" });
        assert.equal(more.getAttribute("aria-expanded"), "false");
        await userEvent.click(more);
        const rows = within(dialog).getByTestId("model-more");
        await userEvent.click(within(rows).getByRole("combobox", { name: /^Up, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Z" }));
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "quad"), before);
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

    it("takes a picture for the model in More options, draws it, and writes it with the model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        const before = previewPicture(dialog, "quad");
        await userEvent.click(within(dialog).getByRole("button", { name: "More options" }));
        const rows = within(dialog).getByTestId("model-more");
        await userEvent.click(within(rows).getByLabelText("Model picture, Choose"));
        const picture = await screen.findByRole("dialog", { name: "Picture" });
        await choose(picture, "Choose picture", [await fixture(colormapUrl, "colormap.png")]);
        assert.isNotNull(await within(rows).findByLabelText("Model picture, colormap"));
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "quad"), before, "the preview draws the picture");
        });
        assert.isUndefined(written(session, "node.texture"), "a draft until Add");
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.texture")), /^asset:/);
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
    });

    it("closes only the Picture pop-over on Escape, keeping the dialog and its model", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        await userEvent.click(within(dialog).getByRole("button", { name: "More options" }));
        await userEvent.click(within(within(dialog).getByTestId("model-more")).getByLabelText("Model picture, Choose"));
        await screen.findByRole("dialog", { name: "Picture" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }), "the pop-over closed");
        });
        assert.isTrue(dialog.isConnected, "the dialog stays");
        assert.isNotNull(within(dialog).queryByTitle("quad.glb"), "with its model");
        // With the pop-over gone, Escape closes the dialog again.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(dialog.isConnected, "the dialog closed");
        });
    });

    it("takes a real click on the loaded file's x with More options open", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        await userEvent.click(within(dialog).getByRole("button", { name: "More options" }));
        // Hovered, the column draws its scrollbar when it overflows: the x stays clear of where the
        // thumb takes clicks (checked with a short window in a browser; this test's window is tall).
        await userEvent.hover(within(dialog).getByRole("button", { name: "More options" }));
        const x = within(dialog).getByRole("button", { name: "Remove quad.glb" });
        const box = x.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        assert.isTrue(x.contains(hit), `the x is on top, not ${String(hit?.className)}`);
        await userEvent.click(x);
        await within(dialog).findByRole("button", { name: "Choose file" });
    });

    it("shows the model's Details as table rows at once, in a list that scrolls on its own", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        assert.isNull(within(dialog).queryByRole("button", { name: "Details" }), "Details is no disclosure");
        const table = within(dialog).getByRole("region", { name: "Details" });
        assert.equal(getComputedStyle(table).overflowY, "auto", "it scrolls past its height");
        assert.notEqual(getComputedStyle(table).maxHeight, "none", "it has a height to scroll past");
        assert.equal(table.tabIndex, 0, "the keyboard scrolls it too");
        assert.include(within(table).getByRole("group", { name: "Format" }).textContent, "GLB");
        assert.include(within(table).getByRole("group", { name: "Triangles" }).textContent, "4");
        assert.isNull(within(table).queryByRole("group", { name: "Animations" }), "only what the file has");
    });

    it("draws the preview right of the file once loaded, Name under it, and its rotate buttons write Up and Turn", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        const box = within(dialog).getByTestId("model-preview").getBoundingClientRect();
        const file = within(dialog).getByRole("button", { name: "Remove quad.glb" }).getBoundingClientRect();
        assert.isAtMost(file.right, box.left, "the preview is in the right column");
        assert.isBelow(Math.abs(box.top - file.top), 48, "both columns start at the top");
        const name = within(dialog).getByRole("textbox", { name: "Name" }).getBoundingClientRect();
        assert.isAtLeast(name.top, box.bottom, "Name is below the preview");
        assert.isBelow(name.top - box.bottom, 24, "directly below it");
        assert.isAtLeast(name.left, box.left, "in the preview's column");
        assert.isAtMost(name.right, box.right + 1);
        // No empty band across the dialog: the taller column fills most of the body above the footer.
        const body = within(dialog).getByTestId("custom-model").getBoundingClientRect();
        const footer = within(dialog).getByRole("button", { name: "Add model" }).getBoundingClientRect();
        const columns = [...dialog.querySelectorAll(".ws-model-left > *, .ws-model-side > *")];
        const lowest = Math.max(...columns.map((child) => child.getBoundingClientRect().bottom));
        assert.isAbove(lowest - body.top, (footer.top - body.top) * 0.6, "the columns fill the body");
        await userEvent.click(within(dialog).getByRole("button", { name: "Tip forward" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Turn left" }));
        await addModel(dialog);
        await waitFor(() => {
            assert.equal(written(session, "node.modelSourceUp"), "-z");
            assert.equal(written(session, "node.modelTurn"), 90);
        });
    });

    it("writes Color, a clip and the Pose it holds (Speed 0) with the model, redrawing the preview", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [`${VARIANTS}/gltf-animated/cube.glb`]);
        await previewOf(dialog, "cube");
        await userEvent.click(within(dialog).getByRole("combobox", { name: /^Color, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Node color on top" }));
        await userEvent.click(within(dialog).getByRole("combobox", { name: /^Animation, / }));
        await userEvent.click(await screen.findByRole("option", { name: /^spin, / }));
        await previewOf(dialog, "cube");
        const still = previewPicture(dialog, "cube");
        const pose = await within(dialog).findByRole("slider", { name: "Pose" });
        pose.focus();
        await userEvent.keyboard("{End}");
        await waitFor(() => {
            assert.equal(pose.getAttribute("aria-valuenow"), "1", "the end of the one-second clip");
        });
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "cube"), still, "the preview draws the pose at the end of the clip");
        });
        assert.isUndefined(written(session, "node.modelAnimation"), "a draft until Add");
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
        assert.equal(written(session, "node.modelTint"), true);
        assert.equal(written(session, "node.modelAnimation"), "spin");
        assert.equal(written(session, "node.modelAnimationSpeed"), 0);
        assert.equal(written(session, "node.modelAnimationOffset"), 1);
    });

    it("loads a model dropped anywhere on the dialog", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        dropOn(within(dialog).getByTestId("custom-model"), [quadFile()]);
        await previewOf(dialog, "quad");
    });

    it("shows an address's download as it comes, and Cancel load stops it", async () => {
        const url = "https://models.example.com/slow/panel.glb";
        const body = quadGlb();
        const slow = slowFetch(url, body);
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${url}{Enter}`);
        assert.isNotNull(await within(dialog).findByText("Downloading"));
        assert.isNotNull(within(dialog).getByRole("progressbar"), "a progress bar while it downloads");
        await waitFor(() => {
            assert.isDefined(slow.push);
        });
        slow.push?.(body);
        assert.isNotNull(await within(dialog).findByText(/ of /), "the bytes so far, of the size the server gave");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel load" }));
        await waitFor(() => {
            assert.isFalse(
                within(dialog).getByRole<HTMLButtonElement>("button", { name: "Choose file" }).disabled,
                "back to the start",
            );
        });
        await waitFor(() => {
            assert.isTrue(slow.cancelled, "the download stopped");
        });
        assert.isUndefined(written(session, "node.model"));
    });

    it("replaces a load still under way with a model dropped on the dialog", async () => {
        const url = "https://models.example.com/slow/first.glb";
        const slow = slowFetch(url, quadGlb());
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${url}{Enter}`);
        assert.isNotNull(await within(dialog).findByText("Downloading"));
        dropOn(within(dialog).getByTestId("custom-model"), [quadFile()]);
        await previewOf(dialog, "quad");
        await waitFor(() => {
            assert.isTrue(slow.cancelled, "the first download stopped");
        });
    });

    it("names a point cloud's variant under its preview and flags it Approximated on the Details line", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [await fixture(pointsPlyUrl, "points.ply")]);
        await previewOf(dialog, "points");
        assert.equal(within(dialog).getByTestId("model-variant").textContent, "PLY, binary, point cloud");
        assert.isNotNull(within(within(dialog).getByTestId("model-details-line")).getByText("Approximated"));
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
    });

    it("shows why graphty-element could not draw an accepted model, and blocks Add", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [await fixture(damagedPlyUrl, "cube.ply")]);
        const preview = await within(dialog).findByTestId("model-preview");
        assert.isNotNull(await within(preview).findByText("Not loaded"));
        assert.isNull(preview.querySelector("img, canvas"));
        assert.match(within(dialog).getByTestId("model-refusal").textContent, /^Not loaded: /);
        assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), "true");
    });

    it("still adds a model when the preview gets no WebGL context of its own", async () => {
        const { session, tab } = await openShapes();
        // The graph's canvas is already in the page; the preview's has none yet when it asks.
        const original = HTMLCanvasElement.prototype.getContext;
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
            this: HTMLCanvasElement,
            type: string,
            ...rest: unknown[]
        ) {
            return !this.isConnected && type.includes("webgl")
                ? null
                : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
        } as typeof original);
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await within(dialog).findByRole("button", { name: /^Remove / });
        const preview = within(dialog).getByTestId("model-preview");
        await waitFor(() => {
            assert.isNull(preview.querySelector('[aria-label^="Loading"]'), "the preview stops loading");
        });
        assert.isNull(preview.querySelector("canvas"), "no canvas is left behind");
        assert.isNull(within(dialog).queryByTestId("model-refusal"), "the model is not refused");
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
    });

    it("offers a lone picture as the layer's picture", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        dropOn(within(dialog).getByTestId("custom-model"), [new File([dotPng()], "colormap.png")]);
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

    it("turns the live preview with a drag and Reset view, changing no setting", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [`${VARIANTS}/gltf-animated/cube.glb`]);
        const canvas = await previewOf(dialog, "cube");
        assert.equal(canvas.tabIndex, 0, "the preview takes focus, so the arrow keys turn it too");
        const start = previewPicture(dialog, "cube");
        await dragAcross(canvas, 80);
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "cube"), start, "the drag turns the model");
        });
        // Reset view sits over the live preview, in its top-right corner, and takes the click.
        const reset = within(dialog).getByRole("button", { name: "Reset view" });
        const box = within(dialog).getByTestId("model-preview").getBoundingClientRect();
        const at = reset.getBoundingClientRect();
        assert.isTrue(within(dialog).getByTestId("model-preview").contains(reset), "inside the preview box");
        assert.isBelow(box.right - at.right, 12, "at its right edge");
        assert.isBelow(at.top - box.top, 12, "at its top edge");
        const hit = document.elementFromPoint(at.left + at.width / 2, at.top + at.height / 2);
        assert.isTrue(reset.contains(hit), "above the canvas");
        await userEvent.click(reset);
        await waitFor(() => {
            assert.equal(previewPicture(dialog, "cube"), start, "back to the first view");
        });
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
        assert.isUndefined(written(session, "node.modelTurn"), "turning the view is not a setting");
        assert.isUndefined(written(session, "node.modelSourceUp"));
    });

    it("plays the chosen clip in the preview, and writes the clip and its Speed with the model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [`${VARIANTS}/gltf-animated/cube.glb`]);
        await previewOf(dialog, "cube");
        await userEvent.click(within(dialog).getByRole("combobox", { name: /^Animation, / }));
        await userEvent.click(await screen.findByRole("option", { name: /^spin, / }));
        const host = within(dialog).getByTestId("model-preview").querySelector(".ws-model-live");
        await waitFor(() => {
            assert.isNull(host?.getAttribute("aria-busy") ?? null, "drawn with the clip");
        });
        // Playing: the picture moves on by itself, again and again.
        for (let seen = 0, last = previewPicture(dialog, "cube"); seen < 2; seen++) {
            const from = last;
            last = await waitFor(() => {
                const now = previewPicture(dialog, "cube");
                assert.notEqual(now, from, "the clip plays in the preview");
                return now;
            });
        }
        await userEvent.click(within(dialog).getByRole("button", { name: "More options" }));
        const speed = within(within(dialog).getByTestId("model-more")).getByRole("textbox", { name: /^Speed/ });
        await userEvent.type(speed, "0.5{Enter}");
        await addModel(dialog);
        await waitFor(() => {
            assert.equal(written(session, "node.modelAnimation"), "spin");
        });
        assert.equal(written(session, "node.modelAnimationSpeed"), 0.5);
    });

    it("draws a textured model in the node color with no pictures, and as wires, live, then writes both", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose folder", [KIT_FOLDER]);
        await previewOf(dialog, "police");
        const own = previewPicture(dialog, "police");
        await userEvent.click(within(dialog).getByRole("combobox", { name: /^Color, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Node color only, no pictures" }));
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "police"), own, "the pictures are gone");
        });
        const flat = previewPicture(dialog, "police");
        await userEvent.click(within(dialog).getByRole("button", { name: "More options" }));
        await userEvent.click(
            within(within(dialog).getByTestId("model-more")).getByRole("combobox", { name: /^Wireframe, / }),
        );
        await userEvent.click(await screen.findByRole("option", { name: "On" }));
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "police"), flat, "drawn as wires");
        });
        await addModel(dialog);
        await waitFor(() => {
            assert.equal(written(session, "node.modelTint"), "replace");
        });
        assert.equal(written(session, "node.wireframe"), true);
    });

    it("has no Main menu row with the experiment off", async () => {
        await openShapes([]);
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await screen.findByRole("menuitem", { name: "Add Shader..." });
        assert.isNull(screen.queryByRole("menuitem", { name: "Add custom model..." }));
        await userEvent.keyboard("{Escape}");
    });
});
