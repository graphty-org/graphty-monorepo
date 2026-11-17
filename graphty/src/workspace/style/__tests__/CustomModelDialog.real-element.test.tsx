/**
 * The Load custom model dialog with the node models experiment on (issue #3396, node-models design
 * 14), on the real graphty-element, by real input: opened from the Main menu (Add only adds the
 * model to the project) or from the Models pop-over's Add custom model... (Add names it on the layer,
 * with the dialog's settings, in one undo step); a folder, a file or an address loads one model
 * whose preview graphty-element draws; a missing picture is answered from the row or with another
 * file of the set; Cancel lets go of what it loaded; Model settings starts closed while Details and Files are plain lists; a load
 * shows its progress and Cancel load stops it; once loaded the model has Name and Details under
 * it, beside Model settings when they are open, and its rotate buttons write Up and Turn. Every assertion reads
 * what the element reports: its layers, its assets and its pictures.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import animatedCubeUrl from "../../../../../babylonjs-models/test/fixtures/variants/gltf-animated/cube.glb?url";
import { withoutFeatures } from "../../../test/features";
import { dragAcross, dragTo } from "../../../test/real-pointer";
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
import { dotPng, quadGlb, withOutsidePicture } from "./quadGlb";

/** babylonjs-models' variant fixtures, as the file chooser reads them (relative to the graphty project). */
const VARIANTS = "../babylonjs-models/test/fixtures/variants";

// These tests drive the Style panel the app shows with file styles off; the panel by part of the
// drawing, which replaces the node tab with them on, is tested in PartsPanel.real-element.test.tsx.
withoutFeatures(["file-styles"]);

/** The car kit's folder, as the file chooser reads it (relative to the graphty project). */
const KIT_FOLDER = "src/workspace/style/__fixtures__/car-kit";

/** A folder of two models, points.ply and damaged.ply (which graphty-element accepts but cannot draw). */
const VARIANTS_FOLDER = "src/workspace/style/__fixtures__/variants";

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

/**
 * Opens the dialog's Model settings, by its button at the end of Name.
 * @param dialog - the dialog.
 * @returns the settings.
 */
async function openSettings(dialog: HTMLElement): Promise<HTMLElement> {
    const button = within(dialog).getByRole("button", { name: "Model settings" });
    if (button.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(button);
    }
    return within(dialog).findByTestId("model-settings");
}

/**
 * The right edges of boxes and field controls, rounded.
 * @param els - the boxes, and elements holding field controls.
 * @returns their right edges.
 */
function rightEdges(els: readonly (Element | null)[]): number[] {
    return els.flatMap((el) => {
        if (el === null) {
            return [];
        }
        const controls = el.querySelectorAll(".ws-field-control");
        const boxes = controls.length === 0 ? [el] : [...controls];
        return boxes.map((box) => Math.round(box.getBoundingClientRect().right));
    });
}

/**
 * Asserts the loaded dialog leaves no blank and cuts nothing off: one column scrolls above the
 * footer, its top (the file's address) in view; settings closed, the model takes the body's width
 * directly under the file and Files; settings open, the model, every Details row and Name stay in
 * view beside them; every Details row shows whole, and the footer is in the dialog.
 * @param dialog - the dialog.
 * @param where - what the dialog shows, for the messages.
 */
function assertNoBlank(dialog: HTMLElement, where: string): void {
    const body = within(dialog).getByTestId("custom-model");
    assert.equal(body.dataset.alone, "true", `one column (${where})`);
    const { width } = body.getBoundingClientRect();
    const column = (body.querySelector(".ws-model-main") as HTMLElement).getBoundingClientRect();
    const top = body.querySelector(".ws-model-top") as HTMLElement;
    const rest = body.querySelector(".ws-model-rest");
    const settings = within(dialog).queryByTestId("model-settings");
    const content = (rest ?? top).getBoundingClientRect();
    const preview = within(dialog).getByTestId("model-preview").getBoundingClientRect();
    const details = within(dialog).getByTestId("model-details");
    const nameRow = body.querySelector(".ws-model-name") as HTMLElement;
    const name = nameRow.getBoundingClientRect();
    const footer = (body.querySelector(".ws-model-footer") as HTMLElement).getBoundingClientRect();
    const modal = (dialog.closest(".mantine-Modal-content") ?? dialog).getBoundingClientRect();
    assert.isAtMost(
        footer.bottom,
        Math.min(modal.bottom, window.innerHeight) + 0.5,
        `the footer is in view (${where})`,
    );
    assert.isAtMost(column.bottom, footer.top + 0.5, `the column ends above the footer (${where})`);
    assert.isAbove(column.height, 150, `the column has room (${where})`);
    // The address whole at the column's top, never scrolled under the header by a focus (#8604).
    const address = (top.firstElementChild as HTMLElement).getBoundingClientRect();
    assert.isAtLeast(address.top, column.top - 0.5, `the address shows from its top (${where})`);
    assert.isAtLeast(preview.height, 150, `drawn at a size to see (${where})`);
    if (settings === null) {
        assert.isBelow(preview.top - content.bottom, 16, `the model directly under the top (${where})`);
        assert.isAbove(preview.width, width * 0.9, `the model takes the body's width (${where})`);
    } else {
        // Beside the settings, the model, Details and Name fit the column together, held in view
        // while the settings scroll (#8610): its top in view now, and all of it once scrolled.
        const settingsBox = settings.getBoundingClientRect();
        assert.isAtLeast(preview.left, settingsBox.right, `the model beside the settings (${where})`);
        const side = (body.querySelector(".ws-model-side") as HTMLElement).getBoundingClientRect();
        assert.isAtLeast(side.top, column.top - 0.5, `the model shows from its top (${where})`);
        assert.isAtMost(side.height, column.height + 0.5, `the model, Details and Name fit together (${where})`);
        assert.isAtMost(
            Math.max(...rightEdges([settings])),
            settingsBox.right + 0.5,
            `the settings in their column (${where})`,
        );
    }
    assert.isAtMost(details.scrollHeight, details.clientHeight + 1, `every Details row shows (${where})`);
    // Each row, its name and its whole value, inside the list and inside the model's column.
    const side = (body.querySelector(".ws-model-side") as HTMLElement).getBoundingClientRect();
    const list = details.getBoundingClientRect();
    for (const row of details.children) {
        for (const part of [row, ...row.querySelectorAll("*")]) {
            const at = part.getBoundingClientRect();
            if (at.width === 0 && at.height === 0) {
                continue;
            }
            const what = `${row.textContent} (${where})`;
            assert.isAtLeast(at.top, Math.max(list.top, side.top) - 0.5, `${what} shows from its top`);
            assert.isAtMost(at.bottom, Math.min(list.bottom, side.bottom) + 0.5, `${what} shows to its bottom`);
            assert.isAtMost(at.right, list.right + 0.5, `${what} shows to its end`);
            assert.isAtMost(part.scrollWidth, part.clientWidth + 1, `${what} is not cut`);
        }
    }
    if (settings === null) {
        assert.isAbove(name.bottom, footer.top - 24, `Name ends at the footer (${where})`);
    }
    // One right edge for each column: every box and every field's control (a setting's Turn, Fit
    // or Sides as much as Files and the model), with a field's minus or gear hung beyond it.
    const files = within(dialog).queryByTestId("model-files");
    const model = [top.firstElementChild, within(dialog).getByTestId("model-preview"), details, nameRow];
    const columns = settings === null ? [[...model, settings, files]] : [model, [settings, files]];
    for (const els of columns) {
        const edges = rightEdges(els);
        assert.isAtMost(Math.max(...edges) - Math.min(...edges), 1, `one right edge: ${edges.join(", ")} (${where})`);
    }
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

/**
 * Serves police.glb at an address at once, and its picture as a download that never arrives:
 * the model is shown while its picture still downloads, until Add or Cancel load stops it.
 * @param base - the folder's address, ending in a slash.
 * @returns whether the picture's download was stopped.
 */
async function policeWaitingForPicture(base: string): Promise<{ stopped: boolean }> {
    const police = new Uint8Array(await (await fetch(policeUrl)).arrayBuffer());
    return waitingForPicture(`${base}police.glb`, police, `${base}Textures/colormap.png`);
}

/**
 * Serves a model at an address at once, and its picture as a download that never arrives.
 * @param url - the model's address.
 * @param model - the model's bytes.
 * @param picture - the picture's address.
 * @returns whether the picture's download was stopped.
 */
function waitingForPicture(url: string, model: Uint8Array, picture: string): { stopped: boolean } {
    const original = globalThis.fetch.bind(globalThis);
    const state = { stopped: false };
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const to = input instanceof Request ? input.url : String(input);
        if (to === url) {
            return Promise.resolve(new Response(model as Uint8Array<ArrayBuffer>, { status: 200 }));
        }
        if (to === picture) {
            init?.signal?.addEventListener("abort", () => {
                state.stopped = true;
            });
            return Promise.resolve(new Response(new ReadableStream<Uint8Array>(), { status: 200 }));
        }
        return original(input, init);
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
        assert.isNull(
            within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"),
            "a missing picture does not block Add",
        );
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
        assert.isTrue(within(dialog).getByTestId("model-preview").contains(label), "the name sits on the box");
        // Details sit directly under the box (#8606); the arrows that step it come next, above Name.
        const box = within(dialog).getByTestId("model-preview");
        const steps = position.closest(".ws-model-steps");
        assert.isNotNull(steps);
        const under = box.nextElementSibling;
        assert.isTrue(under?.classList.contains("ws-model-details-box"), "Details is the box's next sibling");
        assert.equal(under?.nextElementSibling, steps, "and the arrows come after Details");
        assert.isAtLeast(steps.getBoundingClientRect().top, box.getBoundingClientRect().bottom, "under the box");

        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await previewOf(dialog, "quad");
        assert.equal(position.textContent, "2 of 3");
        assert.equal(label.textContent, "quad");
        const preview = within(dialog).getByTestId("model-preview");
        assert.isNull(preview.getAttribute("data-skipped"));
        await userEvent.click(within(dialog).getByRole("checkbox", { name: "Load this model" }));
        assert.isNotNull(within(dialog).getByRole("button", { name: "Add 2 models" }));
        assert.equal(preview.getAttribute("data-skipped"), "true", "an unchecked model looks left out");
        assert.include(getComputedStyle(label).textDecorationLine, "line-through");
        assert.isBelow(Number(getComputedStyle(preview.querySelector(".ws-model-live") as Element).opacity), 1);

        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await previewOf(dialog, "wall");
        assert.isTrue(within(dialog).getByRole<HTMLInputElement>("checkbox", { name: "Load this model" }).checked);
        assert.isNull(preview.getAttribute("data-skipped"), "a checked model is drawn as usual");
        // The box, its name and Reset view stay in view: the right column fits the dialog, and
        // Details, in the left column, ends above the footer.
        const side = dialog.querySelector<HTMLElement>(".ws-model-side");
        assert.isAtMost(side?.scrollHeight ?? 0, side?.clientHeight ?? 0, "the model's column does not scroll");
        assertNoBlank(dialog, "a set");
        await openSettings(dialog);
        assertNoBlank(dialog, "a set with Model settings open");
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

    it("chooses a folder of two models, and keeps Add blocked by the one it cannot draw", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose folder", [VARIANTS_FOLDER]);
        const position = await within(dialog).findByTestId("model-position");
        assert.equal(position.textContent, "1 of 2");
        const preview = within(dialog).getByTestId("model-preview");
        assert.isNotNull(await within(preview).findByText("Not loaded"), "damaged.ply cannot be drawn");
        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await previewOf(dialog, "points");
        const add = within(dialog).getByRole("button", { name: "Add 2 models" });
        assert.equal(add.getAttribute("aria-disabled"), "true", "the model not on screen still blocks Add");

        await userEvent.click(within(dialog).getByRole("button", { name: "Previous model" }));
        await within(preview).findByText("Not loaded");
        await userEvent.click(within(dialog).getByRole("checkbox", { name: "Load this model" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await previewOf(dialog, "points");
        await addModel(dialog);
        await waitFor(() => {
            assert.deepEqual(models(session), ["points.ply"], "damaged.ply is let go");
        });
    });

    it("keeps Add blocked by a model it cannot draw that the reader never steps to", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        // The damaged model second, so it is never on screen.
        dropOn(within(dialog).getByTestId("custom-model"), [
            await fixture(pointsPlyUrl, "points.ply"),
            await fixture(damagedPlyUrl, "zz-damaged.ply"),
        ]);
        await previewOf(dialog, "points");
        assert.equal(within(dialog).getByTestId("model-position").textContent, "1 of 2");
        const add = within(dialog).getByRole("button", { name: "Add 2 models" });
        assert.equal(add.getAttribute("aria-disabled"), "true", "the model never shown blocks Add");
        await userEvent.hover(add);
        // Not "Loading zz-damaged" while it is checked: the reason it cannot be drawn.
        await screen.findByRole("tooltip", { name: /^zz-damaged: / });
        // Said on screen too, without stepping to it.
        const line = await within(dialog).findByTestId("model-undrawable");
        assert.match(line.textContent, /^zz-damaged: Not loaded/);
        assert.isTrue(line.checkVisibility(), "visible");
        assert.equal(within(dialog).getByTestId("model-position").textContent, "1 of 2", "never stepped to");
    });

    it("lets Add take a set dropped again after the x took it out", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        const files = (): File[] => [quadFile(), new File([quadGlb()], "wall.glb", { type: "model/gltf-binary" })];
        dropOn(within(dialog).getByTestId("custom-model"), files());
        await previewOf(dialog, "quad");
        await userEvent.click(within(dialog).getByRole("button", { name: "Remove 2 models" }));
        dropOn(within(dialog).getByTestId("custom-model"), files());
        await previewOf(dialog, "quad");
        const add = within(dialog).getByRole("button", { name: "Add 2 models" });
        // The same files take the same ids: the model not on screen is drawn off screen again.
        await waitFor(() => {
            assert.notEqual(add.getAttribute("aria-disabled"), "true");
        });
    });

    it("says which models of a drop were refused", async () => {
        const { store, tab } = await openShapes();
        const dialog = await openCustom(tab);
        const wall = new File([quadGlb()], "wall.glb", { type: "model/gltf-binary" });
        const broken = new File([new Uint8Array([1, 2, 3, 4])], "broken.glb", { type: "model/gltf-binary" });
        dropOn(within(dialog).getByTestId("custom-model"), [quadFile(), wall, broken]);
        const refused = await within(dialog).findByTestId("model-refused");
        assert.match(refused.textContent, /^broken\.glb: /);
        assert.equal(within(dialog).getByTestId("model-position").textContent, "1 of 2");
        assert.include(store.get().announcement, "broken.glb: ");
        // The line saying so sits over the model, which takes the body's width: no column beside
        // the model is left blank under one line.
        await previewOf(dialog, "quad");
        const body = within(dialog).getByTestId("custom-model").getBoundingClientRect();
        const box = within(dialog).getByTestId("model-preview").getBoundingClientRect();
        assert.isAtLeast(box.top, refused.getBoundingClientRect().bottom, "the model is under the line");
        assert.isAbove(box.width, body.width * 0.8, "the model takes the body's width");
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
        const folder = within(dialog).getByRole("button", { name: "Choose folder" });
        assert.equal(folder.querySelector("svg")?.getAttribute("data-glyph"), "folderUpload");
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
        await userEvent.click(within(dialog).getByRole("button", { name: "Model settings" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Remove quad.glb" }));

        await within(dialog).findByRole("button", { name: "Choose file" });
        assert.equal(
            document.activeElement,
            within(dialog).getByRole("textbox", { name: "Model address" }),
            "focus goes to the address that comes back",
        );
        assert.isNull(within(dialog).queryByRole("textbox", { name: "Name" }), "no Name");
        assert.isNull(within(dialog).queryByRole("button", { name: "Model settings" }), "no Model settings");
        assert.isNull(dialog.querySelector(".cm-file-loaded"), "no file line");
        const blank = within(dialog).getByTestId("model-preview");
        assert.isNull(blank.querySelector("canvas"), "no model drawn");
        assert.include(blank.textContent, "Drop a model file", "the empty drop area again");
        assert.equal(store.get().announcement, "quad.glb removed");
        await waitFor(() => {
            assert.deepEqual(models(session), [], "what nothing uses is let go");
        });
        assert.equal(within(dialog).getByRole("button", { name: "Add model" }).getAttribute("aria-disabled"), "true");

        // Loading again starts fresh: the file's own name, Model settings closed.
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        assert.equal(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value, "quad");
        assert.equal(
            within(dialog).getByRole("button", { name: "Model settings" }).getAttribute("aria-expanded"),
            "false",
        );
    });

    it("draws a model waiting for a picture or a material, while Files still asks for it", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [await fixture(policeUrl, "police.glb")]);
        await previewOf(dialog, "police");
        assert.isNotNull(within(dialog).getByRole("group", { name: "colormap.png" }), "the picture is still asked for");

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
        // The project's quad is never the dialog's to change: it loads a second model of it.
        await previewOf(dialog, "quad 2");
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

    it("keeps Model settings closed, then keeps Up and Turn with the model from the Main menu, in one undo step", async () => {
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        assert.isNull(within(dialog).queryByTestId("model-settings"), "closed until asked for");
        const before = previewPicture(dialog, "quad");
        const rows = await openSettings(dialog);
        for (const row of [/^Color, /, /^Up, /, /^Fit, /, /^Center, /, /^Sides, /]) {
            assert.isNotNull(within(rows).getByRole("combobox", { name: row }));
        }
        assert.isNotNull(within(rows).getByRole("group", { name: "Rotate" }));
        assert.isNull(
            within(rows).queryByRole("combobox", { name: /^Wireframe, / }),
            "a layer's own rows need a layer",
        );
        await userEvent.click(within(rows).getByRole("combobox", { name: /^Up, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Z" }));
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "quad"), before);
        });
        await userEvent.type(within(rows).getByRole("textbox", { name: /^Turn/ }), "90");
        await userEvent.tab();
        await addModel(dialog, "Add to project");
        const ref = await waitFor(() => {
            const record = session.assets.list().find((r) => r.path === "quad.glb" && r.state === "accepted");
            assert.isDefined(record);
            assert.equal(record.defaults?.style["node.modelTurn"], 90);
            return record.id;
        });
        assert.equal(session.assets.find(ref)?.defaults?.style["node.modelSourceUp"], "z");
        assert.isUndefined(written(session, "node.modelTurn"), "no layer takes it");
        await session.undo();
        await waitFor(() => {
            assert.isUndefined(session.assets.find(ref)?.defaults?.style["node.modelTurn"], "one step takes both back");
        });
        assert.isUndefined(session.assets.find(ref)?.defaults?.style["node.modelSourceUp"]);
    });

    it("takes a picture for the model in Model settings, draws it, and writes it with the model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        // A model with texture coordinates, so the picture shows (the test quad has none).
        await choose(dialog, "Choose file", [await fixture(policeUrl, "police.glb")]);
        await previewOf(dialog, "police");
        const before = previewPicture(dialog, "police");
        const rows = await openSettings(dialog);
        await userEvent.click(within(rows).getByLabelText("Model picture, Choose"));
        const picture = await screen.findByRole("dialog", { name: "Picture" });
        await choose(picture, "Choose picture", [new File([dotPng()], "dot.png", { type: "image/png" })]);
        assert.isNotNull(await within(rows).findByLabelText("Model picture, dot"));
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "police"), before, "the preview draws the picture");
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
        await userEvent.click(within(await openSettings(dialog)).getByLabelText("Model picture, Choose"));
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

    it("takes a real click on the loaded file's x with Model settings open", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        const rows = await openSettings(dialog);
        // Hovered, the column draws its scrollbar when it overflows: the x stays clear of where the
        // thumb takes clicks (checked with a short window in a browser; this test's window is tall).
        await userEvent.hover(rows);
        const x = within(dialog).getByRole("button", { name: "Remove quad.glb" });
        const box = x.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        assert.isTrue(x.contains(hit), `the x is on top, not ${String(hit?.className)}`);
        await userEvent.click(x);
        await within(dialog).findByRole("button", { name: "Choose file" });
    });

    it("shows the model's Details as table rows at once, every row in view with no scrolling (#8606)", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        assert.isNull(within(dialog).queryByRole("button", { name: "Details" }), "Details is no disclosure");
        const table = within(dialog).getByRole("region", { name: "Details" });
        assert.isAtMost(table.scrollHeight, table.clientHeight + 1, "as tall as its rows: nothing to scroll");
        assert.equal(table.tabIndex, -1, "so it is no tab stop");
        assert.include(within(table).getByRole("group", { name: "Format" }).textContent, "GLB");
        assert.include(within(table).getByRole("group", { name: "Triangles" }).textContent, "4");
        assert.isNull(within(table).queryByRole("group", { name: "Animations" }), "only what the file has");
    });

    it("draws Details directly under the model and Name under Details, with no blank column beside them (#8606)", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        const preview = within(dialog).getByTestId("model-preview");
        const body = within(dialog).getByTestId("custom-model").getBoundingClientRect();
        const footer = within(dialog).getByRole("button", { name: "Add model" }).getBoundingClientRect();
        const details = within(dialog).getByTestId("model-details-line").closest(".ws-model-details-box");
        assert.isNotNull(details);
        assert.isNull(within(dialog).queryByTestId("model-variant"), "no file type line");
        const nameRow = within(dialog).getByRole("textbox", { name: "Name" }).closest(".ws-model-name");
        assert.isNotNull(nameRow);
        assert.equal(preview.nextElementSibling, details, "Details is the model's next sibling");
        assert.equal(details.nextElementSibling, nameRow, "and Name comes next");
        /**
         * Where the file, the model, Name and Details are drawn now.
         * @returns their boxes.
         */
        const boxes = (): Record<"file" | "box" | "name" | "under", DOMRect> => ({
            file: within(dialog).getByRole("button", { name: "Remove quad.glb" }).getBoundingClientRect(),
            box: preview.getBoundingClientRect(),
            name: nameRow.getBoundingClientRect(),
            under: details.getBoundingClientRect(),
        });
        const assertStacked = ({ box, name, under }: ReturnType<typeof boxes>, where: string): void => {
            assert.isAtLeast(under.top, box.bottom, `Details is below the model (${where})`);
            assert.isBelow(under.top - box.bottom, 12, `directly below it (${where})`);
            assert.isAtLeast(under.left, box.left - 1, `in the model's column (${where})`);
            assert.isAtLeast(name.top, under.bottom, `Name is below Details (${where})`);
            assert.isAtLeast(name.left, box.left - 1, `in the model's column (${where})`);
        };
        // Settings closed and one file: nothing sits beside the model, so it takes the whole width
        // under the file rather than leaving a blank column.
        const closed = boxes();
        assertStacked(closed, "settings closed");
        assert.isAtLeast(closed.box.top, closed.file.bottom, "the model is under the file");
        assert.isAbove(closed.box.width, body.width * 0.8, "the model takes the body's width");
        const drawing = preview.querySelector(".ws-model-live")?.getBoundingClientRect();
        assert.isAtLeast(drawing?.height ?? 0, 238, "drawn no smaller than in the side column");
        assert.isBelow(Math.abs((drawing?.width ?? 0) - (drawing?.height ?? 0)), 2, "and square");
        assert.isAbove(closed.name.bottom - body.top, (footer.top - body.top) * 0.8, "it fills the body");
        assertNoBlank(dialog, "settings closed");
        // Settings open: they sit under the file, and the model, Details and Name beside them, in
        // view while the reader sets the model up (#8610).
        const rows = await openSettings(dialog);
        const open = boxes();
        assertStacked(open, "settings open");
        assert.isAtLeast(open.box.left, rows.getBoundingClientRect().right, "the model is beside the settings");
        assert.isAtLeast(open.box.top, open.file.bottom, "under the file");
        assertNoBlank(dialog, "settings open");
        const side = dialog.querySelector<HTMLElement>(".ws-model-side");
        assert.isAtMost(side?.scrollHeight ?? 0, side?.clientHeight ?? 0, "the model's column does not scroll");
        const header =
            dialog.querySelector(".mantine-Modal-header") ??
            dialog.closest(".mantine-Modal-content")?.querySelector(".mantine-Modal-header");
        assert.isNotNull(header);
        assert.isAtLeast(open.box.top, header?.getBoundingClientRect().bottom ?? 0, "the model's top is in view");
        await userEvent.click(within(rows).getByRole("button", { name: "Tip forward" }));
        await userEvent.click(within(rows).getByRole("button", { name: "Turn left" }));
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
        const record = session.assets.find(String(written(session, "node.model")));
        assert.equal(record?.defaults?.style["node.modelSourceUp"], "-z", "the model keeps its rotation");
        assert.equal(record?.defaults?.style["node.modelTurn"], 90);
        assert.isUndefined(written(session, "node.modelTurn"), "the layer starts from the model's");
    });

    for (const [width, height] of [
        [1024, 640],
        [1280, 720],
    ] as const) {
        it(`shows Model settings whole and keeps Cancel and Add in a ${width} x ${height} window (#8611, #8606)`, async () => {
            // openShapes sizes the window itself: this one is set after it.
            await openShapes();
            await page.viewport(width, height);
            try {
                const dialog = await fromMenu();
                await choose(dialog, "Choose file", ["../graphty-element/test/fixtures/models/Fox.glb"]);
                await previewOf(dialog, "Fox");
                assertNoBlank(dialog, "settings closed");
                const rows = await openSettings(dialog);
                assertNoBlank(dialog, "settings open");
                const column = (dialog.querySelector(".ws-model-main") as HTMLElement).getBoundingClientRect();
                for (const label of ["Up", "Color", "Animation", "Speed", "Sides"]) {
                    const at = within(rows).getByText(label).getBoundingClientRect();
                    assert.isAtLeast(at.top, column.top - 0.5, `${label} shows once settings open`);
                    assert.isAtMost(at.bottom, column.bottom + 0.5, `${label} shows once settings open`);
                }
                for (const button of ["Cancel", "Add to project"]) {
                    const at = within(dialog).getByRole("button", { name: button }).getBoundingClientRect();
                    assert.isAtMost(at.bottom, window.innerHeight, `${button} is in the window`);
                }
            } finally {
                await page.viewport(1440, 900);
            }
        });
    }

    it("adds a file the project already holds as a second model, set up apart, leaving the first as it was (#8609, #8610)", async () => {
        const { session } = await openShapes();
        const first = await session.assets.add(quadFile());
        await session.assets.setDefaults(first.id, { style: { "node.modelTurn": 90 } });
        const dialog = await fromMenu();
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad 2");
        assert.include(within(dialog).getByTestId("model-again").textContent, "quad", "the dialog says so");
        assert.equal(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value, "quad 2");
        const rows = await openSettings(dialog);
        await userEvent.click(within(rows).getByRole("button", { name: "Tip forward" }));
        await addModel(dialog, "Add to project");
        const accepted = session.assets.list().filter((r) => r.kind === "model" && r.state === "accepted");
        assert.equal(accepted.length, 2, "two models of one file");
        assert.deepEqual(
            session.assets.get(first.id)?.defaults?.style,
            { "node.modelTurn": 90 },
            "the first unchanged",
        );
        const second = accepted.find((r) => r.id !== first.id);
        assert.equal(second?.plainName, "quad 2");
        assert.equal(second?.defaults?.style["node.modelSourceUp"], "-z", "the second keeps its own settings");
        assert.notEqual(second?.defaults?.style["node.modelTurn"], 90, "none of the first one's");
    });

    it("shows every Details row of an animated Fox whole with Model settings open, and keeps the model's size (#8606)", async () => {
        await openShapes();
        const dialog = await fromMenu();
        await choose(dialog, "Choose file", ["../graphty-element/test/fixtures/models/Fox.glb"]);
        await previewOf(dialog, "Fox");
        assertNoBlank(dialog, "settings closed");
        await openSettings(dialog);
        assertNoBlank(dialog, "settings open");
        const size = within(within(dialog).getByTestId("model-details")).getByRole("group", { name: "Size" });
        assert.isNotNull(size, "the Size row is there");
    });

    it("leaves no blank under Model settings for the second model of a .zip of two", async () => {
        await openShapes();
        const dialog = await fromMenu();
        await choose(dialog, "Choose file", [`${VARIANTS}/zip-two-models/two.zip`]);
        await within(dialog).findByTestId("model-position");
        await userEvent.click(within(dialog).getByRole("button", { name: "Next model" }));
        await waitFor(() => {
            assert.equal(within(dialog).getByTestId("model-position").textContent, "2 of 2");
        });
        await within(dialog).findByTestId("model-details");
        assertNoBlank(dialog, "settings closed");
        const rows = await openSettings(dialog);
        assertNoBlank(dialog, "settings open");
        const preview = within(dialog).getByTestId("model-preview").getBoundingClientRect();
        assert.isBelow(Math.abs(preview.top - rows.getBoundingClientRect().top), 2, "the model beside the settings");
    });

    it("plays an animated model's first clip from the Main menu, and keeps a Pose dragged with the mouse", async () => {
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await choose(dialog, "Choose file", [`${VARIANTS}/gltf-animated/cube.glb`]);
        await previewOf(dialog, "cube");
        // Playing at once: the picture moves on by itself, again and again.
        for (let seen = 0, last = previewPicture(dialog, "cube"); seen < 2; seen++) {
            const from = last;
            last = await waitFor(() => {
                const now = previewPicture(dialog, "cube");
                assert.notEqual(now, from, "the first clip plays in the preview");
                return now;
            });
        }
        await userEvent.hover(within(within(dialog).getByTestId("model-details-line")).getByText("Animated"));
        await screen.findByRole("tooltip", { name: /open Model settings/ });
        const rows = await openSettings(dialog);
        assert.isNotNull(within(rows).getByRole("combobox", { name: /^Animation, spin, / }), "the first clip");
        const pose = within(rows).getByRole("slider", { name: "Pose" });
        await dragAcross(pose, 60);
        await waitFor(() => {
            assert.isAbove(Number(pose.getAttribute("aria-valuenow")), 0, "dragged into the clip");
        });
        await addModel(dialog, "Add to project");
        const style = await waitFor(() => {
            const record = session.assets.list().find((r) => r.path === "cube.glb" && r.state === "accepted");
            assert.isDefined(record?.defaults);
            return record?.defaults?.style ?? {};
        });
        assert.equal(style["node.modelAnimation"], "spin");
        assert.equal(style["node.modelAnimationSpeed"], 0, "the pose is held");
        assert.isAbove(Number(style["node.modelAnimationOffset"]), 0);
    });

    it("keeps an animated model still when the reader chooses Still", async () => {
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await choose(dialog, "Choose file", [`${VARIANTS}/gltf-animated/cube.glb`]);
        await previewOf(dialog, "cube");
        const rows = await openSettings(dialog);
        await userEvent.click(within(rows).getByRole("combobox", { name: /^Animation, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Still" }));
        assert.isNull(within(rows).queryByRole("slider", { name: "Pose" }), "no pose without a clip");
        await addModel(dialog, "Add to project");
        await waitFor(() => {
            const record = session.assets.list().find((r) => r.path === "cube.glb" && r.state === "accepted");
            assert.equal(record?.defaults?.style["node.modelAnimation"], "");
        });
    });

    it("draws a model without its pictures when All textures is cleared, and keeps that with the model", async () => {
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await choose(dialog, "Choose folder", [KIT_FOLDER]);
        await previewOf(dialog, "police");
        const own = previewPicture(dialog, "police");
        const rows = await openSettings(dialog);
        const textures = within(rows).getByRole("group", { name: "Textures" });
        const all = within(textures).getByRole("checkbox", { name: "All textures" });
        assert.isTrue((all as HTMLInputElement).checked);
        await userEvent.click(all);
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "police"), own, "drawn without its pictures");
        });
        await previewOf(dialog, "police");
        await addModel(dialog, "Add to project");
        const record = await waitFor(() => {
            const found = session.assets.list().find((r) => r.path === "police.glb" && r.state === "accepted");
            assert.isDefined(found);
            assert.isNotEmpty(found.defaults?.hiddenTextures ?? []);
            return found;
        });
        assert.deepEqual(
            record.defaults?.hiddenTextures,
            session.assets.inspect(record.id).pictures.map((p) => p.name),
            "every picture is hidden",
        );
    });

    it("keeps a layer's own Turn over the model's, and says so in Model settings", async () => {
        const { tab } = await openShapes(["node-models"], { "node.shape": "cylinder", "node.modelTurn": 45 });
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        const rows = await openSettings(dialog);
        assert.include(within(rows).getByTestId("model-layer-own").textContent, "Turn");
        assert.isNotNull(
            within(rows).getByRole("combobox", { name: /^Wireframe, / }),
            "a layer's own rows, from a layer",
        );
    });

    it("adds a model whose picture is missing, without it, and keeps it in the project from the Main menu", async () => {
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await choose(dialog, "Choose file", [await fixture(policeUrl, "police.glb")]);
        await previewOf(dialog, "police");
        assert.isNotNull(within(dialog).getByRole("group", { name: "colormap.png" }), "the picture is asked for");
        await addModel(dialog, "Add to project");
        const record = await waitFor(() => {
            const found = session.assets.list().find((r) => r.path === "police.glb" && r.state === "accepted");
            assert.isDefined(found);
            return found;
        });
        assert.include(record?.skipped ?? [], "Textures/colormap.png", "added without its picture");
        assert.include(models(session), "police.glb", "still in the project once the dialog is gone");
    });

    it("refuses Add for a model missing its geometry, saying why, and keeps the dialog", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [`${VARIANTS}/gltf-bin/cube.gltf`]);
        await within(dialog).findByRole("group", { name: "cube.bin" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Add model" }));
        assert.isNotNull(await within(dialog).findByTestId("model-refusal"));
        assert.isTrue(dialog.isConnected, "the dialog stays");
    });

    it("refuses Add for a model graphty-element will not hold once its missing picture is skipped", async () => {
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await choose(dialog, "Choose file", [await fixture(policeUrl, "police.glb")]);
        await previewOf(dialog, "police");
        session.assets.setLimits({ sessionBytes: 1 });
        await userEvent.click(within(dialog).getByRole("button", { name: "Add to project" }));
        assert.isNotNull(await within(dialog).findByTestId("model-refusal"));
        assert.isTrue(dialog.isConnected, "the dialog stays");
        assert.notInclude(models(session), "police.glb");
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
        const bar = within(dialog).getByRole("progressbar");
        const field = within(dialog).getByRole("textbox", { name: "Model address" });
        const gap = bar.getBoundingClientRect().top - field.getBoundingClientRect().bottom;
        assert.isTrue(gap >= 0 && gap <= 6, `the bar sits directly under the address (gap ${gap}px)`);
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

    it("loads a typed address when the reader leaves the field, and not again for the same one", async () => {
        const url = "https://models.example.com/slow/blur.glb";
        const slow = slowFetch(url, quadGlb());
        const fetches = vi.mocked(globalThis.fetch);
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        const field = within(dialog).getByRole("textbox", { name: "Model address" });
        await userEvent.type(field, url);
        await userEvent.tab();
        assert.isNotNull(await within(dialog).findByText("Downloading"), "Tab out of the field loads it");
        await waitFor(() => {
            assert.isDefined(slow.push);
        });
        const asked = fetches.mock.calls.filter(
            ([input]) => String(input instanceof Request ? input.url : input) === url,
        );
        assert.lengthOf(asked, 1, "one download");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel load" }));
        await waitFor(() => {
            assert.isTrue(slow.cancelled, "the download stopped");
        });
    });

    it("shows, sets up and adds a model by address while its picture still downloads (#8614)", async () => {
        const base = "https://models.example.com/kit/";
        // The model arrives at once; its picture never does, until Add stops it.
        const served = await policeWaitingForPicture(base);
        const { session } = await openShapes();
        const dialog = await fromMenu();
        // Every text the preview box shows on the way, so a picture still downloading is never
        // shown as missing (#8605).
        const shown = new Set<string>();
        const watch = new MutationObserver(() => {
            shown.add(dialog.querySelector("[data-testid=model-preview]")?.textContent ?? "");
        });
        watch.observe(dialog, { subtree: true, childList: true, characterData: true });
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${base}police.glb`);
        await userEvent.tab();
        await previewOf(dialog, "police");
        watch.disconnect();
        assert.notMatch([...shown].join(" | "), /missing/, "the downloading picture is never said to be missing");
        const files = within(dialog).getByRole("region", { name: "Files" });
        assert.isNotNull(within(files).getByText("Downloading"), "the picture is said to be downloading");
        assert.isNotNull(within(dialog).getByRole("button", { name: "Cancel load" }), "and can still be stopped");
        const details = within(dialog).getByRole("region", { name: "Details" });
        const size = within(details).getByRole("group", { name: "File size" }).textContent;
        assert.notMatch(size, /(^|[^\d.,])0 KB/, "the size of what has arrived, not 0");
        assert.include(
            within(details).getByRole("group", { name: "Textures" }).textContent,
            "1 downloading",
            "no size for a picture still on its way",
        );
        const rows = await openSettings(dialog);
        await userEvent.click(within(rows).getByRole("button", { name: "Turn left" }));
        const add = within(dialog).getByRole("button", { name: "Add to project" });
        assert.isNull(add.getAttribute("aria-disabled"), "Add takes it before its picture arrives");
        await addModel(dialog, "Add to project");
        await waitFor(() => {
            assert.include(models(session), "police.glb");
            assert.isTrue(served.stopped, "the picture's download stopped");
        });
        const record = session.assets.list().find((r) => r.path === "police.glb" && r.state === "accepted");
        assert.equal(record?.defaults?.style["node.modelTurn"], 90, "with what the reader set meanwhile");
    });

    it("adds an animated model by address while its picture downloads with the clip it plays, as once it arrived (#8614)", async () => {
        const base = "https://models.example.com/spin/";
        const cube = new Uint8Array(await (await fetch(animatedCubeUrl)).arrayBuffer());
        const served = waitingForPicture(`${base}cube.glb`, withOutsidePicture(cube, "pic.png"), `${base}pic.png`);
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${base}cube.glb`);
        await userEvent.tab();
        await previewOf(dialog, "cube");
        assert.isNotNull(within(dialog).getByRole("button", { name: "Cancel load" }), "its picture still downloads");
        await addModel(dialog, "Add to project");
        const record = await waitFor(() => {
            const found = session.assets.list().find((r) => r.state === "accepted" && r.path === "cube.glb");
            assert.isDefined(found);
            return found;
        });
        assert.isTrue(served.stopped, "added without the picture");
        assert.equal(record.defaults?.style["node.modelAnimation"], "spin", "the clip the dialog played");
    });

    it("keeps a model by address when Cancel load stops only its pictures, and adds it without them", async () => {
        const base = "https://models.example.com/stop/";
        const served = await policeWaitingForPicture(base);
        const { session, store } = await openShapes();
        const dialog = await fromMenu();
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${base}police.glb`);
        await userEvent.tab();
        await previewOf(dialog, "police");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel load" }));
        await waitFor(() => {
            assert.isTrue(served.stopped, "the picture's download stopped");
            assert.isNull(within(dialog).queryByRole("button", { name: "Cancel load" }), "nothing loads now");
        });
        assert.match(store.get().announcement, /^Stopped loading/);
        assert.match(within(dialog).getByTestId("model-stopped").textContent, /^Stopped loading police/, "and shown");
        await previewOf(dialog, "police");
        const files = within(dialog).getByRole("region", { name: "Files" });
        assert.isNull(within(files).queryByText("Downloading"), "the picture is no longer downloading");
        assert.isNotNull(within(dialog).getByRole("group", { name: "colormap.png" }), "and is asked for");
        await addModel(dialog, "Add to project");
        await waitFor(() => {
            const record = session.assets.list().find((r) => r.path === "police.glb" && r.state === "accepted");
            assert.include(record?.skipped ?? [], "Textures/colormap.png", "added without its picture");
        });
    });

    it("replaces a load still under way with a model chosen through Choose file, and tips Choose folder", async () => {
        const url = "https://models.example.com/slow/first.glb";
        const slow = slowFetch(url, quadGlb());
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        // The browser's own tip on hover: the button's title.
        const folderButton = within(dialog).getByRole("button", { name: "Choose folder" });
        await userEvent.hover(folderButton);
        assert.match(
            String(folderButton.getAttribute("title")),
            /for a model exported with its textures and parts in a folder/,
        );
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${url}{Enter}`);
        assert.isNotNull(await within(dialog).findByText("Downloading"));
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        await waitFor(() => {
            assert.isTrue(slow.cancelled, "the download stopped");
        });
    });

    it("takes one part handed over back out with the x on its line, set up before Add", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [`${VARIANTS}/obj-mtl-png/cube.obj`]);
        const row = await within(dialog).findByRole("group", { name: "cube.mtl" });
        await choose(row, "Choose cube.mtl", [`${VARIANTS}/obj-mtl-png/cube.mtl`]);
        await within(dialog).findByRole("group", { name: "cube.png" });
        const files = within(dialog).getByRole("region", { name: "Files" });
        const remove = await within(files).findByRole("button", { name: "Remove cube.mtl" });
        assert.isNotNull(remove.querySelector("svg.lucide-x"), "an x, as the loaded file's own line has");
        // While its picture is missing, the model can still be set up before Add.
        assert.isNotNull(within(dialog).getByRole("button", { name: "Model settings" }));
        assert.isNotNull(within(dialog).getByTestId("model-details"));
        await userEvent.click(remove);
        assert.isNotNull(await within(dialog).findByRole("group", { name: "cube.mtl" }), "asked for again");
        assert.isNull(within(files).queryByRole("button", { name: "Remove cube.mtl" }));
    });

    it("takes back out a part that finished the model, with the x on its line", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [`${VARIANTS}/obj-mtl/cube.obj`]);
        const row = await within(dialog).findByRole("group", { name: "cube.mtl" });
        await choose(row, "Choose cube.mtl", [`${VARIANTS}/obj-mtl/cube.mtl`]);
        const files = within(dialog).getByRole("region", { name: "Files" });
        await userEvent.click(await within(files).findByRole("button", { name: "Remove cube.mtl" }));
        assert.isNotNull(await within(dialog).findByRole("group", { name: "cube.mtl" }), "asked for again");
        assert.isNull(within(files).queryByRole("button", { name: "Remove cube.mtl" }));
        const finished = session.assets.list().filter((r) => r.path === "cube.obj" && r.state === "accepted");
        assert.lengthOf(finished, 0, "the model with cube.mtl is let go");
    });

    it("takes both pictures of a model by address out with their x's, pressed at once, and adds one model without them (#8613)", async () => {
        const base = "https://models.example.com/two/";
        const site = new Map<string, Uint8Array<ArrayBuffer>>([
            [
                `${base}pair.obj`,
                new TextEncoder().encode(
                    "mtllib pair.mtl\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nusemtl a\nf 1 2 3\nusemtl b\nf 1 3 4\n",
                ),
            ],
            [`${base}pair.mtl`, new TextEncoder().encode("newmtl a\nmap_Kd a.png\nnewmtl b\nmap_Kd b.png\n")],
            [`${base}a.png`, dotPng()],
            [`${base}b.png`, dotPng()],
        ]);
        const original = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const to = input instanceof Request ? input.url : String(input);
            const body = site.get(to);
            return body === undefined ? original(input, init) : Promise.resolve(new Response(body, { status: 200 }));
        });
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${base}pair.obj`);
        await userEvent.tab();
        await previewOf(dialog, "pair");
        const textured = session.assets.list().find((r) => r.path === "pair.obj" && r.state === "accepted");
        assert.isDefined(textured);
        const files = within(dialog).getByRole("region", { name: "Files" });
        // Settings closed: Files above the model, as tall as its few lines, and the model under it
        // at the body's width, so no blank sits under the list or beside the model.
        const preview = within(dialog).getByTestId("model-preview").getBoundingClientRect();
        assert.isAtLeast(preview.top, files.getBoundingClientRect().bottom, "Files above the model");
        assert.isAtMost(files.scrollHeight, files.clientHeight + 1, "the list as tall as its lines");
        assertNoBlank(dialog, "a model with Files");
        // Both x's pressed one after the other, the second while graphty-element still takes the
        // first file out: each answer is held until both clicks are in (the real dropPart runs).
        let release = (): void => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const realDrop = session.assets.dropPart.bind(session.assets);
        vi.spyOn(session.assets, "dropPart").mockImplementation(async (ref, part) => {
            const out = await realDrop(ref, part);
            await gate;
            return out;
        });
        await userEvent.click(within(files).getByRole("button", { name: "Remove a.png" }));
        await userEvent.click(within(files).getByRole("button", { name: "Remove b.png" }));
        release();
        await within(dialog).findByRole("group", { name: "a.png" });
        await within(dialog).findByRole("group", { name: "b.png" });
        assert.isNull(within(dialog).queryByTestId("model-refusal"), "no model lost on the way");
        for (const name of ["a.png", "b.png"]) {
            const row = within(dialog).getByRole("group", { name });
            await userEvent.click(within(row).getByRole("button", { name: `Load without ${name}` }));
        }
        const details = within(dialog).getByRole("region", { name: "Details" });
        await waitFor(() => {
            assert.include(
                within(details).getByRole("group", { name: "Textures" }).textContent,
                "2 skipped",
                "no size for pictures drawn without",
            );
        });
        await addModel(dialog, "Add to project");
        const kept = session.assets.list().filter((r) => r.path === "pair.obj");
        assert.lengthOf(kept, 1, "one model, not the textured one beside it");
        assert.notEqual(kept[0].id, textured.id);
        assert.sameMembers([...(kept[0].skipped ?? [])], ["a.png", "b.png"], "added without both pictures");
    });

    it("adds a model once for a double click on Add, in one undo step", async () => {
        // police.glb by address, its picture never arriving: Add stops the picture and takes the model
        // without it (a real wait), and a Turn set in the dialog makes Add write one undo step. A
        // second click while the first is taking the model must write no second one.
        const base = "https://models.example.com/twice/";
        await policeWaitingForPicture(base);
        const { session } = await openShapes();
        const dialog = await fromMenu();
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Model address" }), `${base}police.glb`);
        await userEvent.tab();
        await previewOf(dialog, "police");
        const rows = await openSettings(dialog);
        await userEvent.click(within(rows).getByRole("button", { name: "Turn left" }));
        const before = session.history.steps.length;
        const add = within(dialog).getByRole("button", { name: "Add to project" });
        await waitFor(() => {
            assert.isNull(add.getAttribute("aria-disabled"));
        });
        const adds = vi.spyOn(session.assets, "accept");
        await userEvent.dblClick(add);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Load custom model" }));
            const record = session.assets.list().find((r) => r.path === "police.glb" && r.state === "accepted");
            assert.equal(record?.defaults?.style["node.modelTurn"], 90);
            assert.isAbove(session.history.steps.length, before);
        });
        assert.strictEqual(adds.mock.calls.length, 1, "the model is taken once");
        assert.strictEqual(session.history.steps.length, before + 1, "one undo step");
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

    it("names a point cloud's variant in Details and flags it Approximated on the Details line", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [await fixture(pointsPlyUrl, "points.ply")]);
        await previewOf(dialog, "points");
        const table = within(dialog).getByRole("region", { name: "Details" });
        assert.include(within(table).getByRole("group", { name: "Format" }).textContent, "PLY, binary, point cloud");
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
        // The box is drawn anew once the model is loaded, in the column that scrolls as one.
        const said = await within(dialog).findByText("Not loaded");
        const preview = within(dialog).getByTestId("model-preview");
        assert.isTrue(preview.contains(said), "said in the model's box");
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

    it("selects nothing, and paints nothing in the selection color, for a drag across the dialog (#8612)", async () => {
        const { tab } = await openShapes();
        const dialog = await openCustom(tab);
        // Across the empty dialog, from its title out past its edge.
        await dragTo(within(dialog).getByText("Load custom model"), { x: 4, y: 4 });
        assert.equal(document.getSelection()?.toString(), "", "the empty dialog");
        const address = within(dialog).getByRole("textbox", { name: "Model address" });
        assert.equal(getComputedStyle(address).userSelect, "text", "what the reader types stays selectable");
        await choose(dialog, "Choose file", [`${VARIANTS}/gltf-animated/cube.glb`]);
        const canvas = await previewOf(dialog, "cube");
        // From Details, across the preview, and out of the dialog.
        const preview = canvas.getBoundingClientRect();
        await dragTo(within(dialog).getByTestId("model-details"), { x: preview.right + 40, y: preview.top + 10 });
        assert.equal(document.getSelection()?.toString(), "", "Details and the preview");
        await dragTo(within(dialog).getByTestId("model-details"), { x: 4, y: window.innerHeight - 4 });
        assert.equal(document.getSelection()?.toString(), "", "out of the dialog");
        assert.equal(getComputedStyle(canvas).userSelect, "none", "the preview is never selected");
        assert.equal(getComputedStyle(dialog).userSelect, "none");
    });

    it("turns the live preview with a drag and Reset view, changing no setting", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        // A model with no clip, so only the drag and Reset view move the picture.
        await choose(dialog, "Choose file", [`${VARIANTS}/glb-textured/cube.glb`]);
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

    it("draws a textured model in the node color, keeps that with the model, and writes Wireframe to the layer", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose folder", [KIT_FOLDER]);
        await previewOf(dialog, "police");
        const own = previewPicture(dialog, "police");
        const rows = await openSettings(dialog);
        await userEvent.click(within(rows).getByRole("combobox", { name: /^Color, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Node color only, no pictures" }));
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "police"), own, "the pictures are gone");
        });
        const flat = previewPicture(dialog, "police");
        await userEvent.click(within(rows).getByRole("combobox", { name: /^Wireframe, / }));
        await userEvent.click(await screen.findByRole("option", { name: "On" }));
        await waitFor(() => {
            assert.notEqual(previewPicture(dialog, "police"), flat, "drawn as wires");
        });
        await addModel(dialog);
        await waitFor(() => {
            assert.equal(written(session, "node.wireframe"), true);
        });
        const ref = String(written(session, "node.model"));
        assert.equal(session.assets.find(ref)?.defaults?.style["node.modelTint"], "replace", "the model's own");
        assert.isUndefined(written(session, "node.modelTint"), "not the layer's");
        await session.undo();
        await waitFor(() => {
            assert.isUndefined(written(session, "node.model"), "one step takes the model back");
        });
        assert.isUndefined(session.assets.find(ref)?.defaults?.style["node.modelTint"], "and its settings");
    });

    it("has no Main menu row with the experiment off", async () => {
        await openShapes([]);
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await screen.findByRole("menuitem", { name: "Add Shader..." });
        assert.isNull(screen.queryByRole("menuitem", { name: "Add custom model..." }));
        await userEvent.keyboard("{Escape}");
    });
});
