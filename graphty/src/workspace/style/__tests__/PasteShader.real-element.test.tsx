/**
 * The code dialog (New shader, Edit shader), Copy code, Duplicate and edit, Delete from project
 * and Control+V on the REAL graphty-element, driven by real input (decisions-v2, section 2.2): its
 * first field is the place, preset from the gallery's filter, and the code box starts with that
 * place's template. Every assertion reads what the element reports: the layer stack, the project's
 * shaders, the history.
 */

import { parseShaderText, shaderTemplate } from "@graphty/graphty-element/catalog";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import {
    addNodeLayer,
    type Mounted,
    mountElement,
    openGallery,
    removeElement,
    renderPanel,
    section,
    shaderRows,
    TIMEOUT_MS,
    usesOn,
} from "./shaderHarness";

declare module "vitest/browser" {
    interface BrowserCommands {
        grantClipboard: () => Promise<void>;
    }
}

/** A node shader whose body has a `while` loop, on line 7, column 5. */
const WHILE_TEXT = `/* graphty-shader 1
{ "id": "user/pulse-ring", "name": "Pulse ring", "place": "around", "reach": 2,
  "params": [ { "name": "tint", "type": "color", "default": "#FFAA00" } ] }
*/
vec4 shade(NodeInput n) {
    float ring = 0.0;
    while (ring < 0.5) { ring += 0.1; }
    return vec4(tint * ring, ring);
}
`;

/** The dialog, titled New shader, or Edit shader for Duplicate and edit. */
const DIALOG = /^(New|Edit) shader$/;

/** A node shader that passes the static checks and fails to compile: a vec3 stored in a float. */
const COMPILE_TEXT = `/* graphty-shader 1
{ "id": "user/bad-cast", "name": "Bad cast", "place": "around" }
*/
vec4 shade(NodeInput n) {
    float x = vec3(1.0);
    return vec4(x);
}
`;

/** A header with a key the format does not know: a problem with no line. */
const KEY_TEXT = `/* graphty-shader 1
{ "id": "user/odd", "name": "Odd", "place": "around", "bogus": 1 }
*/
vec4 shade(NodeInput n) {
    return n.color;
}
`;

/** The same shader with the loop in the fixed-count form. */
const FIXED_TEXT = WHILE_TEXT.replace("while (ring < 0.5)", "for (int i = 0; i < 5; i++)");

afterEach(removeElement);

/**
 * A real element with a reader's node layer, and that layer's Style tab.
 * @param set - what the layer sets.
 * @returns the element, its session and the layer.
 */
async function mount(set?: Record<string, unknown>): Promise<Mounted & { id: string }> {
    const mounted = await mountElement();
    const id = await addNodeLayer(mounted.session, set);
    renderPanel(mounted, [id]);
    return { ...mounted, id };
}

/**
 * Opens the code dialog from the gallery's New shader....
 * @returns the code box.
 */
async function openNew(): Promise<HTMLTextAreaElement> {
    const gallery = await openGallery();
    await userEvent.click(within(gallery).getByRole("button", { name: "New shader..." }));
    return codeBox();
}

/**
 * The open dialog's code box.
 * @returns the code box.
 */
async function codeBox(): Promise<HTMLTextAreaElement> {
    const dialog = await screen.findByRole("dialog", { name: DIALOG });
    return within(dialog).getByRole<HTMLTextAreaElement>("textbox", { name: "Shader code" });
}

/**
 * The open dialog's Add button.
 * @returns the button.
 */
function addButton(): HTMLElement {
    return within(screen.getByRole("dialog", { name: DIALOG })).getByRole("button", { name: "Add" });
}

/**
 * The pixels of the dialog's preview picture, once it shows one.
 * @returns the picture's address and its RGBA bytes.
 */
async function previewPixels(): Promise<{ src: string; pixels: number[] }> {
    const picture = within(screen.getByRole("dialog", { name: DIALOG })).getByRole<HTMLImageElement>("img", {
        name: "Preview",
    });
    const bitmap = await createImageBitmap(await (await fetch(picture.src)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context?.drawImage(bitmap, 0, 0);
    return { src: picture.src, pixels: [...(context?.getImageData(0, 0, bitmap.width, bitmap.height).data ?? [])] };
}

/** Waits for the checks to settle with Add enabled, then presses it. */
async function pressAdd(): Promise<void> {
    await waitFor(
        () => {
            assert.isNull(addButton().getAttribute("aria-disabled"), "Add is enabled");
        },
        { timeout: TIMEOUT_MS },
    );
    await userEvent.click(addButton());
}

describe("the code dialog on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("pasted text whose header names Around turns the place field to Around; the guide is linked", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const place = within(dialog).getByLabelText<HTMLInputElement>(/^Place/);
        assert.strictEqual(place.value, "On the node");
        await userEvent.fill(box, FIXED_TEXT);
        await waitFor(
            () => {
                assert.strictEqual(place.value, "Around", "the header's place is where it draws");
            },
            { timeout: TIMEOUT_MS },
        );
        const guide = within(dialog).getByRole("link", { name: "How to write one" });
        assert.strictEqual(guide.getAttribute("href"), "https://graphty.app/docs/graphty-element/guide/shaders");
    });

    it("New shader... is the gallery's first item and opens with a place field; Behind gives the behind template", async () => {
        await mount();
        const gallery = await openGallery();
        const items = [...gallery.querySelectorAll<HTMLElement>("button, input")];
        assert.strictEqual(items[0]?.textContent, "New shader...", "New shader... is at the top of the box");
        await userEvent.click(within(gallery).getByRole("button", { name: "New shader..." }));
        const box = await codeBox();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const place = within(dialog).getByLabelText<HTMLInputElement>(/^Place/);
        assert.strictEqual(place.value, "On the node");
        assert.strictEqual(box.value, shaderTemplate({ target: "node", place: "paint" }));

        // The template follows the field until the reader writes over it.
        await userEvent.click(place);
        await userEvent.click(await screen.findByRole("option", { name: "Behind" }));
        await waitFor(() => {
            assert.strictEqual(box.value, shaderTemplate({ target: "node", place: "behind" }));
        });
        const read = parseShaderText(box.value);
        assert.isTrue(read.ok);
        assert.strictEqual(read.ok ? read.registration.descriptor.place : undefined, "behind");
    });

    it("a while loop shows one problem row on its line with Add disabled; fixed, Add puts it in the project and on the layer, and one Undo removes both", async () => {
        const { session, id } = await mount();
        const before = JSON.stringify(session.styles.get(id));
        const steps = session.history.position;

        const box = await openNew();
        await userEvent.fill(box, WHILE_TEXT);
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const rows = await waitFor(
            () => {
                const list = within(dialog).getByRole("list", { name: "Problems" });
                const found = within(list).getAllByRole("listitem");
                assert.lengthOf(found, 1, "one problem row");
                return found;
            },
            { timeout: TIMEOUT_MS },
        );
        assert.include(rows[0]?.textContent ?? "", "Line 7:5");
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");

        // The row puts the cursor on its line.
        await userEvent.click(within(rows[0]).getByRole("button"));
        assert.strictEqual(document.activeElement, box);
        assert.strictEqual(box.selectionStart, WHILE_TEXT.indexOf("while"));
        assert.strictEqual(JSON.stringify(session.styles.get(id)), before);
        assert.strictEqual(session.history.position, steps);
        assert.lengthOf(session.shaders.list(), 0);

        await userEvent.fill(box, FIXED_TEXT);
        await pressAdd();
        await waitFor(
            () => {
                assert.deepEqual(usesOn(session, id), [{ shader: "user/pulse-ring" }]);
            },
            { timeout: TIMEOUT_MS },
        );
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: DIALOG }), "the dialog closed");
        });
        assert.deepEqual(
            session.shaders.list().map((each) => each.id),
            ["user/pulse-ring"],
        );
        assert.strictEqual(session.history.position, steps + 1, "one step");

        await session.undo();
        await waitFor(() => {
            assert.deepEqual(usesOn(session, id), []);
        });
        assert.lengthOf(session.shaders.list(), 0);
    });

    it("Duplicate and edit on a preset, then Add, gives an equal shader under a user/ id", async () => {
        const { session, id } = await mount({ "node.shaders": [{ shader: "uncertainty-aura" }] });
        const [row] = await waitFor(() => {
            const rows = shaderRows();
            assert.lengthOf(rows, 1);
            return rows;
        });

        await userEvent.click(row, { button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: "Duplicate and edit" }));
        await screen.findByRole("dialog", { name: "Edit shader" });
        const box = await codeBox();
        assert.include(box.value, '"user/uncertainty-aura"');
        assert.include(box.value, '"Aura copy"', "the copy is named apart");
        await pressAdd();

        await waitFor(
            () => {
                assert.deepEqual(
                    usesOn(session, id).map((use) => use.shader),
                    ["uncertainty-aura", "user/uncertainty-aura"],
                );
            },
            { timeout: TIMEOUT_MS },
        );
        const body = async (shader: string): Promise<string> => {
            const parsed = parseShaderText(await session.shaders.source(shader, { duplicate: true }));
            assert.isTrue(parsed.ok);
            return parsed.ok ? parsed.registration.glsl : "";
        };
        assert.strictEqual(await body("user/uncertainty-aura"), await body("uncertainty-aura"));
    });

    it("Escape closes the dialog from the code box and keeps the text as a draft", async () => {
        await mount();
        const box = await openNew();
        await userEvent.fill(box, FIXED_TEXT);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: DIALOG }));
        });

        const again = await openNew();
        assert.strictEqual(again.value, FIXED_TEXT);
    });

    it("Copy code puts its text on the clipboard; Control+V on the section opens it, and Add applies the preset instead of a copy", async () => {
        await commands.grantClipboard();
        const { session, id } = await mount({ "node.shaders": [{ shader: "uncertainty-aura" }] });
        const [row] = await waitFor(() => {
            const rows = shaderRows();
            assert.lengthOf(rows, 1);
            return rows;
        });
        await userEvent.click(row, { button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: "Copy code" }));
        const text = await session.shaders.source("uncertainty-aura");
        await waitFor(async () => {
            assert.strictEqual(await navigator.clipboard.readText(), text);
        });

        // Take it off with its minus, then paste it back with Control+V on the section's "+".
        await userEvent.click(within(row).getByRole("button", { name: "Remove aura" }));
        await waitFor(() => {
            assert.deepEqual(usesOn(session, id), []);
        });
        within(section("node", "shaders")).getByRole("button", { name: "Add to node shaders" }).focus();
        await userEvent.keyboard("{Control>}v{/Control}");
        const box = await codeBox();
        assert.strictEqual(box.value, text);
        await pressAdd();

        await waitFor(
            () => {
                assert.deepEqual(usesOn(session, id), [{ shader: "uncertainty-aura" }]);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.lengthOf(session.shaders.list(), 0, "no copy was added");
    });

    it("Delete from project on a project tile removes it, undoably", async () => {
        const { session } = await mount();
        const added = await session.shaders.add(FIXED_TEXT);
        assert.isTrue(added.ok);

        const gallery = await openGallery();
        await userEvent.click(
            within(within(gallery).getByRole("radiogroup", { name: "Origin" })).getByText("This project"),
        );
        const tile = await within(gallery).findByRole("button", { name: "Pulse ring" });
        await userEvent.click(tile, { button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Delete from project/ }));
        await waitFor(() => {
            assert.lengthOf(session.shaders.list(), 0);
        });

        await session.undo();
        await waitFor(() => {
            assert.lengthOf(session.shaders.list(), 1);
        });
    });

    it("Shift+F10 on a focused project tile opens its menu with Delete from project ready for Enter", async () => {
        const { session } = await mount();
        const added = await session.shaders.add(FIXED_TEXT);
        assert.isTrue(added.ok);

        const gallery = await openGallery();
        await userEvent.click(
            within(within(gallery).getByRole("radiogroup", { name: "Origin" })).getByText("This project"),
        );
        const tile = await within(gallery).findByRole("button", { name: "Pulse ring" });
        tile.focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await screen.findByRole("menuitem", { name: /^Delete from project/ });
        // Opened from the keyboard, the first row is highlighted, so Enter acts on it at once.
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.lengthOf(session.shaders.list(), 0);
        });
    });

    it("the live check finds a compile error before Add, marks the code box invalid and announces it", async () => {
        const { session, id } = await mount();
        const before = JSON.stringify(session.styles.get(id));
        const box = await openNew();
        await userEvent.fill(box, COMPILE_TEXT);
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await waitFor(
            () => {
                assert.isNotNull(dialog.querySelector('[data-code="shader.compile"]'), "a compile problem row");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(box.getAttribute("aria-invalid"), "true");
        const problems = within(dialog).getByRole("list", { name: "Problems" });
        assert.include(box.getAttribute("aria-describedby") ?? "", problems.id);
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");
        assert.strictEqual(JSON.stringify(session.styles.get(id)), before);
        assert.lengthOf(session.shaders.list(), 0);
    });

    it("the preview draws the text as the element would and follows edits; broken text shows its error and leaves the preview and the graph alone", async () => {
        const { session, id } = await mount();
        const before = JSON.stringify(session.styles.get(id));
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.fill(box, FIXED_TEXT);
        const first = await waitFor(
            async () => {
                const shown = await previewPixels();
                assert.isTrue(
                    shown.pixels.some((value, at) => at % 4 === 3 && value > 0),
                    "the picture has something drawn",
                );
                return shown;
            },
            { timeout: TIMEOUT_MS },
        );

        // A change typed into the box: the tint, from orange to blue.
        const tint = box.value.indexOf("#FFAA00") + 1;
        box.setSelectionRange(tint, tint + 6);
        await userEvent.keyboard("0055FF");
        const second = await waitFor(
            async () => {
                const shown = await previewPixels();
                assert.notDeepEqual(shown.pixels, first.pixels, "the picture follows the edit");
                return shown;
            },
            { timeout: TIMEOUT_MS },
        );
        assert.include(box.value, '"#0055FF"', "the typed change is in the box");

        await userEvent.fill(box, COMPILE_TEXT);
        await waitFor(
            () => {
                assert.isNotNull(dialog.querySelector('[data-code="shader.compile"]'), "the compile problem shows");
            },
            { timeout: TIMEOUT_MS },
        );
        const third = await previewPixels();
        assert.strictEqual(third.src, second.src, "the preview is unchanged");
        assert.deepEqual(third.pixels, second.pixels);
        assert.strictEqual(JSON.stringify(session.styles.get(id)), before, "the graph's layer is untouched");
        assert.lengthOf(session.shaders.list(), 0, "nothing joined the project");
    });

    it("a problem with no line is words, not a button", async () => {
        await mount();
        const box = await openNew();
        await userEvent.fill(box, KEY_TEXT);
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const row = await waitFor(
            () => {
                const found = dialog.querySelector<HTMLElement>('[data-code="shader.header-key"]');
                assert.isNotNull(found);
                return found;
            },
            { timeout: TIMEOUT_MS },
        );
        assert.notStrictEqual(row.tagName, "BUTTON");
        assert.isNull(row.closest("button"));
    });

    it("an edge shader pasted on the Node tab says what it is written for and adds nothing", async () => {
        const { session, id } = await mount();
        const text = shaderTemplate({ target: "edge", place: "along" });
        const box = await openNew();
        await userEvent.fill(box, text);
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await waitFor(
            () => {
                assert.include(dialog.textContent ?? "", "Written for edges");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");
        assert.deepEqual(usesOn(session, id), []);
        assert.lengthOf(session.shaders.list(), 0);
    });
});
