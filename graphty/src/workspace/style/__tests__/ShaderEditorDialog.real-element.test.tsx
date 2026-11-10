/**
 * The code dialog (New shader, Edit shader), Copy code, Duplicate and edit, Delete from project
 * and Control+V on the REAL graphty-element, driven by real input (decisions-v2, section 2.2): its
 * first field is the place, preset from the gallery's filter, and the code box starts with that
 * place's template. Every assertion reads what the element reports: the layer stack, the project's
 * shaders, the history.
 */

import { EditorView } from "@codemirror/view";
import { parseShaderText, shaderTemplate, splitShaderText } from "@graphty/graphty-element/catalog";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import {
    addNodeLayer,
    idOf,
    type Mounted,
    mountElement,
    mountWorkspace,
    openGallery,
    removeElement,
    renderPanel,
    section,
    shaderRows,
    treeRow,
    usesOn,
} from "./shaderHarness";

declare module "vitest/browser" {
    interface BrowserCommands {
        grantClipboard: () => Promise<void>;
    }
}

/**
 * What the code box holds of a shader text: its body, as the form holds the header.
 * @param text - the whole text.
 * @returns the body.
 */
function bodyOf(text: string): string {
    return splitShaderText(text).body;
}

/** A node shader whose body has a `while` loop, on line 7 of the text, line 3 of the body. */
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
async function openNew(): Promise<HTMLElement> {
    const gallery = await openGallery();
    await userEvent.click(within(gallery).getByRole("button", { name: "New shader..." }));
    return codeBox();
}

/**
 * The open dialog's code box.
 * @returns the code box.
 */
async function codeBox(): Promise<HTMLElement> {
    const dialog = await screen.findByRole("dialog", { name: DIALOG });
    await waitFor(() => {
        assert.isNotNull(dialog.querySelector('[data-editor="ready"]'), "the code editor has loaded");
    });
    return within(dialog).getByRole("textbox", { name: "Shader code" });
}

/**
 * The code editor behind a code box.
 * @param box - the code box.
 * @returns its editor.
 */
function viewOf(box: HTMLElement): EditorView {
    const view = EditorView.findFromDOM(box);
    assert.isNotNull(view, "the box is a code editor");
    return view;
}

/**
 * What the code box holds.
 * @param box - the code box.
 * @returns its text.
 */
function textOf(box: HTMLElement): string {
    return viewOf(box).state.doc.toString();
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

/**
 * The open gear's Starts select: its input, not the listbox that shares the name.
 * @returns the input.
 */
async function startsField(): Promise<HTMLElement> {
    const named = await screen.findAllByLabelText(/^Starts/);
    const [input] = named.filter((each) => each.tagName === "INPUT");
    return input;
}

/** Waits for the checks to settle with Add enabled, then presses it. */
async function pressAdd(): Promise<void> {
    await waitFor(() => {
        assert.isNull(addButton().getAttribute("aria-disabled"), "Add is enabled");
    });
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
        await waitFor(() => {
            assert.strictEqual(place.value, "Around", "the header's place is where it draws");
        });
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
        assert.strictEqual(textOf(box), bodyOf(shaderTemplate({ target: "node", place: "paint" })));

        // The template follows the field until the reader writes over it.
        await userEvent.click(place);
        await userEvent.click(await screen.findByRole("option", { name: "Behind" }));
        await waitFor(() => {
            assert.strictEqual(textOf(box), bodyOf(shaderTemplate({ target: "node", place: "behind" })));
        });
        assert.strictEqual(place.value, "Behind");
    });

    it("a while loop shows one problem row on its line with Add disabled; fixed, Add puts it in the project and on the layer, and one Undo removes both", async () => {
        const { session, id } = await mount();
        const before = JSON.stringify(session.styles.get(id));
        const steps = session.history.position;

        const box = await openNew();
        await userEvent.fill(box, WHILE_TEXT);
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const rows = await waitFor(() => {
            const list = within(dialog).getByRole("list", { name: "Problems" });
            const found = within(list).getAllByRole("listitem");
            assert.lengthOf(found, 1, "one problem row");
            return found;
        });
        assert.include(rows[0]?.textContent ?? "", "Line 3:5");
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");

        // The row puts the cursor on its line.
        await userEvent.click(within(rows[0]).getByRole("button"));
        assert.strictEqual(document.activeElement, box);
        assert.strictEqual(viewOf(box).state.selection.main.head, textOf(box).indexOf("while"));
        assert.strictEqual(JSON.stringify(session.styles.get(id)), before);
        assert.strictEqual(session.history.position, steps);
        assert.lengthOf(session.shaders.list(), 0);

        await userEvent.fill(box, FIXED_TEXT);
        await pressAdd();
        await waitFor(() => {
            assert.deepEqual(usesOn(session, id), [{ shader: "user/pulse-ring" }]);
        });
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
        await codeBox();
        const name = within(screen.getByRole("dialog", { name: "Edit shader" })).getByLabelText<HTMLInputElement>(
            /^Name/,
        );
        assert.strictEqual(name.value, "Aura copy", "the copy is named apart");
        await pressAdd();

        await waitFor(() => {
            assert.deepEqual(
                usesOn(session, id).map((use) => use.shader),
                ["uncertainty-aura", "user/uncertainty-aura"],
            );
        });
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
        assert.strictEqual(textOf(again), bodyOf(FIXED_TEXT));
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
        assert.strictEqual(textOf(box), bodyOf(text));
        await pressAdd();

        await waitFor(() => {
            assert.deepEqual(usesOn(session, id), [{ shader: "uncertainty-aura" }]);
        });
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

    it("Tab indents; Control+M makes Tab move focus, and the button below the box says so", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}{Home}{/Control}");
        const before = textOf(box);
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.notStrictEqual(textOf(box), before, "Tab indented the line");
        });
        const after = textOf(box);
        assert.strictEqual(document.activeElement, box, "Tab stayed in the box");

        await userEvent.keyboard("{Control>}m{/Control}");
        const toggle = await within(dialog).findByRole("button", { name: /^Tab: Next field/ });
        assert.include(toggle.textContent ?? "", "Ctrl+M");
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.notStrictEqual(document.activeElement, box, "Tab left the box");
        });
        assert.strictEqual(textOf(box), after);

        await userEvent.click(toggle);
        await within(dialog).findByRole("button", { name: /^Tab: Indent/ });
    });

    it("Control+Z and Control+Y undo the box's typing and never reach the project's history", async () => {
        const { session } = await mount();
        const box = await openNew();
        const steps = session.history.position;
        const before = textOf(box);
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}{Home}{/Control}x");
        await waitFor(() => {
            assert.strictEqual(textOf(box), `x${before}`);
        });
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.strictEqual(textOf(box), before);
        });
        // Nothing is left to undo in the box: the key still stops there.
        await userEvent.keyboard("{Control>}z{/Control}");
        await userEvent.keyboard("{Control>}y{/Control}");
        await waitFor(() => {
            assert.strictEqual(textOf(box), `x${before}`);
        });
        assert.strictEqual(session.history.position, steps);
    });

    it("the close button's tooltip shows Esc", async () => {
        await mount();
        await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.hover(within(dialog).getByRole("button", { name: "Close" }));
        const tip = await screen.findByRole("tooltip");
        assert.include(tip.textContent ?? "", "Esc");
    });

    it("Escape in the gear closes only the gear; the next closes the dialog", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(within(dialog).getByRole("button", { name: "tint settings" }));
        const close = await screen.findByRole("button", { name: "Close tint settings" });
        await userEvent.click(
            within(close.closest<HTMLElement>('[role="dialog"]') ?? dialog).getByLabelText(/^Display name/),
        );
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: "Close tint settings" }), "the gear closed");
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "New shader" }), "the dialog stayed");

        await userEvent.click(box);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "New shader" }));
        });
    });

    it("Escape in the color picker closes only the picker", async () => {
        await mount();
        await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const row = within(dialog).getByRole("group", { name: "tint" });
        const swatch = within(row).getByRole("button", { name: "Pick tint default color" });
        await userEvent.click(swatch);
        await waitFor(() => {
            assert.strictEqual(swatch.getAttribute("aria-expanded"), "true", "the picker opened");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(swatch.getAttribute("aria-expanded"), "false", "the picker closed");
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "New shader" }), "the dialog stayed");
    });

    it("the live check finds a compile error before Add, marks the code box invalid and announces it", async () => {
        const { session, id } = await mount();
        const before = JSON.stringify(session.styles.get(id));
        const box = await openNew();
        await userEvent.fill(box, COMPILE_TEXT);
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await waitFor(() => {
            assert.isNotNull(dialog.querySelector('[data-code="shader.compile"]'), "a compile problem row");
        });
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
        const first = await waitFor(async () => {
            const shown = await previewPixels();
            assert.isTrue(
                shown.pixels.some((value, at) => at % 4 === 3 && value > 0),
                "the picture has something drawn",
            );
            return shown;
        });

        // The tint, from orange to blue, through the row's color control.
        const tint = within(dialog).getByRole("group", { name: "tint" });
        const hex = within(tint).getByRole<HTMLInputElement>("textbox", { name: /^tint default/ });
        await userEvent.tripleClick(hex);
        await userEvent.keyboard("0055FF{Enter}");
        const second = await waitFor(async () => {
            const shown = await previewPixels();
            assert.notDeepEqual(shown.pixels, first.pixels, "the picture follows the edit");
            return shown;
        });

        await userEvent.fill(box, COMPILE_TEXT);
        await waitFor(() => {
            assert.isNotNull(dialog.querySelector('[data-code="shader.compile"]'), "the compile problem shows");
        });
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
        const row = await waitFor(() => {
            const found = dialog.querySelector<HTMLElement>('[data-code="shader.header-key"]');
            assert.isNotNull(found);
            return found;
        });
        assert.notStrictEqual(row.tagName, "BUTTON");
        assert.isNull(row.closest("button"));
    });

    it("an edge shader pasted on the Node tab says what it is written for and adds nothing", async () => {
        const { session, id } = await mount();
        const text = shaderTemplate({ target: "edge", place: "along" });
        const box = await openNew();
        await userEvent.fill(box, text);
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await waitFor(() => {
            assert.include(dialog.textContent ?? "", "Written for edges");
        });
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");
        assert.deepEqual(usesOn(session, id), []);
        assert.lengthOf(session.shaders.list(), 0);
    });

    it("a filled row changes the preview, and Add lists its parameters", async () => {
        const { session } = await mount();
        await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const before = (await waitFor(previewPixels)).src;
        await userEvent.click(within(dialog).getByRole("button", { name: "Add to node parameters" }));
        const row = await within(dialog).findByRole("group", { name: "param1" });
        const name = within(row).getByLabelText<HTMLInputElement>(/param1 name/);
        await userEvent.fill(name, "glow");
        await userEvent.tab();
        await within(dialog).findByRole("group", { name: "glow" });
        // The element hands back the same picture for the same text: a new one means the row was checked.
        await waitFor(async () => {
            assert.notStrictEqual((await previewPixels()).src, before);
        });
        await pressAdd();
        await waitFor(() => {
            const id = session.shaders.list().at(0)?.id;
            assert.deepEqual(
                session.catalog
                    .shaders()
                    .find((each) => each.id === id)
                    ?.params.map((param) => param.name),
                ["tint", "glow"],
            );
        });
    });

    it("insert is disabled until the code box has focus, then writes the name at the cursor", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const row = within(dialog).getByRole("group", { name: "tint" });
        const insert = within(row).getByRole("button", { name: "Insert tint" });
        assert.strictEqual(insert.getAttribute("aria-disabled"), "true");
        await userEvent.click(box);
        await waitFor(() => {
            assert.isNull(insert.getAttribute("aria-disabled"));
        });
        const before = textOf(box);
        await userEvent.keyboard("{Control>}{Home}{/Control}");
        await userEvent.click(insert);
        await waitFor(() => {
            assert.strictEqual(textOf(box), `tint${before}`);
        });
        assert.strictEqual(document.activeElement, box);
    });

    it("a Name still being typed when Escape closes the dialog is kept in the draft", async () => {
        await mount();
        await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Add to node parameters" }));
        const row = await within(dialog).findByRole("group", { name: "param1" });
        await userEvent.fill(within(row).getByLabelText<HTMLInputElement>(/param1 name/), "glow");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: DIALOG }));
        });
        await openNew();
        await within(screen.getByRole("dialog", { name: "New shader" })).findByRole("group", { name: "glow" });
    });

    it("a Max typed as 0.50 is written as the number", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Add to node parameters" }));
        await userEvent.click(await within(dialog).findByRole("button", { name: "param1 settings" }));
        const max = await screen.findByLabelText<HTMLInputElement>(/^Max/);
        await userEvent.fill(max, "0.50");
        assert.strictEqual(max.value, "0.50", "the text stays as typed");
        await userEvent.click(screen.getByRole("button", { name: "Close param1 settings" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.strictEqual(splitShaderText(textOf(box)).draft?.params?.[1]?.max, 0.5);
        });
    });

    it("pasted full text fills the form and the box holds the body; an unreadable header lands in Full text", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.fill(box, FIXED_TEXT);
        await waitFor(() => {
            assert.strictEqual(textOf(box), bodyOf(FIXED_TEXT));
        });
        assert.strictEqual(within(dialog).getByLabelText<HTMLInputElement>(/^Name/).value, "Pulse ring");

        const broken = "/* graphty-shader 1\n[1, 2]\n*/\nvec4 shade(NodeInput n) { return n.color; }\n";
        await userEvent.fill(box, broken);
        await waitFor(() => {
            assert.strictEqual(textOf(box), broken);
            assert.isNull(within(dialog).queryByLabelText(/^Name/), "Full text hides Name");
        });
        assert.strictEqual(
            within(dialog).getByRole("button", { name: "Full text" }).getAttribute("aria-pressed"),
            "true",
        );
    });

    it("a row with min above max marks its gear and survives a target switch and a Full text round trip", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const halfTyped = `/* graphty-shader 1
{ "id": "user/odd", "name": "Odd", "place": "around",
  "params": [ { "name": "gain", "type": "number", "default": 1, "min": 5, "max": 2 } ] }
*/
vec4 shade(NodeInput n) { return n.color * gain; }
`;
        await userEvent.fill(box, halfTyped);
        const gear = await within(dialog).findByRole("button", { name: "gain settings" });
        await waitFor(() => {
            assert.isNotNull(gear.getAttribute("data-invalid"), "the row's gear is marked");
        });

        await drawOn("Edge");
        await waitFor(() => {
            assert.include(textOf(box), "EdgeInput");
        });
        await drawOn("Node");
        await waitFor(() => {
            assert.isNotNull(
                within(dialog).getByRole("button", { name: "gain settings" }).getAttribute("data-invalid"),
                "marked again on coming back",
            );
        });

        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.include(textOf(box), '"min": 5');
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.isNotNull(
                within(dialog).getByRole("button", { name: "gain settings" }).getAttribute("data-invalid"),
                "still marked with the form shown",
            );
        });
    });

    it("a non-ASCII Name is written as an escape, so the text stays ASCII and adds", async () => {
        const { session } = await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.fill(within(dialog).getByLabelText<HTMLInputElement>(/^Name/), "Caf\u00e9");
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.include(textOf(box), String.raw`"name": "Caf\u00e9"`);
        });
        await pressAdd();
        await waitFor(() => {
            const id = session.shaders.list().at(0)?.id;
            assert.strictEqual(session.catalog.shaders().find((each) => each.id === id)?.plainName, "Caf\u00e9");
        });
        assert.isNull(dialog.querySelector('[data-code="shader.not-ascii"]'));
    });

    it("an empty Name still adds, under user/shader", async () => {
        const { session } = await mount();
        await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.fill(within(dialog).getByLabelText<HTMLInputElement>(/^Name/), "");
        await pressAdd();
        await waitFor(() => {
            assert.strictEqual(session.shaders.list().at(0)?.id, "user/shader");
        });
    });

    it("a Color row's Starts writes a clock with a range, and it survives a Full text round trip", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(within(dialog).getByRole("button", { name: "tint settings" }));
        await userEvent.click(await startsField());
        await userEvent.click(await screen.findByRole("option", { name: "When selected" }));
        await waitFor(() => {
            assert.isNotNull(within(dialog).queryByText(/^Starts: When selected/));
        });
        await userEvent.click(screen.getByRole("button", { name: "Close tint settings" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            const written = splitShaderText(textOf(box)).draft?.params?.[0]?.default as Record<string, unknown>;
            assert.strictEqual(written.by, "since.selected");
            assert.deepEqual(written.domain, [0, 0.3]);
            assert.lengthOf(written.range as string[], 2);
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await userEvent.click(await within(dialog).findByRole("button", { name: "tint settings" }));
        await waitFor(async () => {
            assert.strictEqual(((await startsField()) as HTMLInputElement).value, "When selected");
        });
    });

    it("a Number row's Starts writes the clock with no range", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Add to node parameters" }));
        await userEvent.click(await within(dialog).findByRole("button", { name: "param1 settings" }));
        await userEvent.click(await startsField());
        await userEvent.click(await screen.findByRole("option", { name: "When hovered" }));
        await waitFor(() => {
            assert.isNotNull(within(dialog).queryByText(/^Starts: When hovered/));
        });
        await userEvent.click(screen.getByRole("button", { name: "Close param1 settings" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.deepEqual(splitShaderText(textOf(box)).draft?.params?.[1]?.default, {
                by: "since.hovered",
                domain: [0, 0.3],
            });
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await userEvent.click(await within(dialog).findByRole("button", { name: "param1 settings" }));
        await waitFor(async () => {
            assert.strictEqual(((await startsField()) as HTMLInputElement).value, "When hovered");
        });
    });

    it("Minimum size writes the key, and its field is absent at a place that cannot use it", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        assert.isNull(within(dialog).queryByLabelText(/^Minimum size/), "On the node has no minimum size");

        const place = within(dialog).getByLabelText<HTMLInputElement>(/^Place/);
        await userEvent.click(place);
        await userEvent.click(await screen.findByRole("option", { name: "Around" }));
        await userEvent.fill(await within(dialog).findByLabelText<HTMLInputElement>(/^Minimum size/), "12");
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.strictEqual(splitShaderText(textOf(box)).draft?.minSize, 12);
        });
    });

    it("Type a Name, choose Around: the box holds the ring starter and the Name stays", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        const name = within(dialog).getByLabelText<HTMLInputElement>(/^Name/);
        await userEvent.fill(name, "Sun halo");
        await userEvent.click(within(dialog).getByLabelText<HTMLInputElement>(/^Place/));
        await userEvent.click(await screen.findByRole("option", { name: "Around" }));
        await waitFor(() => {
            assert.strictEqual(textOf(box), bodyOf(shaderTemplate({ target: "node", place: "around" })));
        });
        assert.strictEqual(name.value, "Sun halo");
    });

    /**
     * Presses a label of the Draws on switch.
     * @param label - Node, Edge or Background.
     */
    async function drawOn(label: string): Promise<void> {
        const dialog = screen.getByRole("dialog", { name: DIALOG });
        await userEvent.click(within(dialog).getByText(label));
    }

    /**
     * Picks an entry of the Start from select.
     * @param name - the entry's words.
     */
    async function startFrom(name: RegExp): Promise<void> {
        const dialog = screen.getByRole("dialog", { name: DIALOG });
        await userEvent.click(within(dialog).getByLabelText(/^Start from/));
        await userEvent.click(await screen.findByRole("option", { name }));
    }

    /**
     * The open dialog's Name field.
     * @returns the field.
     */
    function nameField(): HTMLInputElement {
        return within(screen.getByRole("dialog", { name: DIALOG })).getByLabelText<HTMLInputElement>(/^Name/);
    }

    /**
     * Waits for the open dialog's Add button (named Add, or Add to project) to enable, then presses it.
     * @param name - the button's words.
     */
    async function pressNamed(name: string): Promise<void> {
        const button = within(screen.getByRole("dialog", { name: DIALOG })).getByRole("button", { name });
        await waitFor(() => {
            assert.isNull(button.getAttribute("aria-disabled"), `${name} is enabled`);
        });
        await userEvent.click(button);
    }

    /** Runs the Main menu's Add Shader... */
    async function openFromMenu(): Promise<void> {
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Add Shader..." }));
    }

    it("switching Node to Background shows BackgroundInput and back restores the typed code; Around the group shows GroupInput", async () => {
        await mount();
        const box = await openNew();
        await userEvent.fill(box, "vec4 shade(NodeInput n) {\n    return n.color * 0.5;\n}\n");
        const typed = textOf(box);
        await drawOn("Background");
        await waitFor(() => {
            assert.include(textOf(box), "BackgroundInput");
        });
        await drawOn("Node");
        await waitFor(() => {
            assert.strictEqual(textOf(box), typed);
        });
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(within(dialog).getByLabelText(/^Place/));
        await userEvent.click(await screen.findByRole("option", { name: "Around the group" }));
        await waitFor(() => {
            assert.include(textOf(box), "GroupInput");
        });
    });

    it("from a node list switched to Background, Add to project joins the project and changes no layer", async () => {
        const { session, id } = await mount();
        await openNew();
        await drawOn("Background");
        await pressNamed("Add to project");
        await waitFor(() => {
            assert.lengthOf(session.shaders.list(), 1);
        });
        assert.deepEqual(usesOn(session, id), []);
    });

    it("Control+Z after switching to another target leaves that target's starter alone", async () => {
        await mount();
        const box = await openNew();
        await userEvent.fill(box, "vec4 shade(NodeInput n) {\n    return n.color;\n}\n");
        await drawOn("Edge");
        await waitFor(() => {
            assert.include(textOf(box), "EdgeInput");
        });
        const edge = textOf(box);
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}z{/Control}");
        assert.strictEqual(textOf(box), edge);
    });

    it("Start from loads an example, an unchanged Add applies it, and My code restores the typing", async () => {
        const { session, id } = await mount();
        const box = await openNew();
        await userEvent.fill(box, "vec4 shade(NodeInput n) {\n    return n.color * 0.25;\n}\n");
        const typed = textOf(box);
        await startFrom(/^Pearl/);
        await waitFor(() => {
            assert.strictEqual(nameField().value, "Pearl copy");
        });
        await startFrom(/^My code/);
        await waitFor(() => {
            assert.strictEqual(textOf(box), typed);
        });
        await startFrom(/^Pearl/);
        await waitFor(() => {
            assert.strictEqual(nameField().value, "Pearl copy");
        });
        await pressAdd();
        await waitFor(() => {
            assert.strictEqual(usesOn(session, id)[0]?.shader, idOf(session, "Pearl"));
        });
        assert.lengthOf(session.shaders.list(), 0, "nothing new joined the project");
    });

    it("an example renamed in the form joins as a new shader", async () => {
        const { session, id } = await mount();
        await openNew();
        await startFrom(/^Pearl/);
        await waitFor(() => {
            assert.strictEqual(nameField().value, "Pearl copy");
        });
        await userEvent.fill(nameField(), "My pearl");
        await pressAdd();
        await waitFor(() => {
            assert.strictEqual(usesOn(session, id)[0]?.shader, idOf(session, "My pearl"));
        });
    });

    it("Copy code's text pasted and renamed joins as a new shader", async () => {
        const { session, id } = await mount();
        const box = await openNew();
        // Copy code writes the shader's own id, a preset's bare one included.
        await userEvent.fill(box, await session.shaders.source("pearl"));
        await waitFor(() => {
            assert.notStrictEqual(nameField().value, "");
        });
        await userEvent.fill(nameField(), "Renamed");
        await pressAdd();
        await waitFor(() => {
            assert.strictEqual(usesOn(session, id)[0]?.shader, idOf(session, "Renamed"));
        });
    });

    it("the Main menu's Add Shader... adds to the project in one undo step and Show in Style focuses the Shaders +", async () => {
        const session = await mountWorkspace();
        const layer = await addNodeLayer(session);
        const layers = session.styles.list().map((each) => each.id);
        const { position } = session.history;
        await openFromMenu();
        await codeBox();
        await pressNamed("Add to project");
        await waitFor(() => {
            assert.lengthOf(session.shaders.list(), 1);
        });
        assert.deepEqual(
            session.styles.list().map((each) => each.id),
            layers,
            "no layer changed",
        );
        assert.strictEqual(session.history.position, position + 1, "one undo step");
        await userEvent.click(await screen.findByRole("button", { name: "Show in Style" }));
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "Add to node shaders");
        });
        assert.deepEqual(usesOn(session, layer), [], "showing it wrote nothing");
    });

    it("an unchanged preset's text from the menu says it is already in the gallery", async () => {
        const session = await mountWorkspace();
        await openFromMenu();
        const box = await codeBox();
        await userEvent.fill(box, await session.shaders.source("pearl"));
        await pressNamed("Add to project");
        await waitFor(() => {
            assert.include(document.body.textContent ?? "", "is already in the gallery");
        });
        assert.lengthOf(session.shaders.list(), 0);
    });

    it("an unchanged Start from example from the menu says it is already in the gallery", async () => {
        const session = await mountWorkspace();
        await openFromMenu();
        await codeBox();
        await startFrom(/^Pearl/);
        await waitFor(() => {
            assert.strictEqual(nameField().value, "Pearl copy");
        });
        await pressNamed("Add to project");
        await waitFor(() => {
            assert.include(document.body.textContent ?? "", "is already in the gallery");
        });
        assert.lengthOf(session.shaders.list(), 0);
    });

    /**
     * The open dialog's Place field.
     * @returns the field.
     */
    function placeField(): HTMLInputElement {
        return within(screen.getByRole("dialog", { name: DIALOG })).getByLabelText<HTMLInputElement>(/^Place/);
    }

    it("Place is the first field and holds focus on opening; on Background the code box does", async () => {
        await mountWorkspace();
        await openFromMenu();
        await codeBox();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        assert.strictEqual(dialog.querySelector(".ws-shader-fields input"), placeField(), "Place comes first");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, placeField());
        });

        await drawOn("Background");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: DIALOG }));
        });
        await openFromMenu();
        const box = await codeBox();
        assert.include(textOf(box), "BackgroundInput", "the menu opens on the tab last used");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box);
        });
    });

    it("in Full text Place stays and follows a header's place; a header naming none adds at the visible Place", async () => {
        const { session } = await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.include(textOf(box), "graphty-shader 1");
        });
        await userEvent.fill(box, FIXED_TEXT);
        await waitFor(() => {
            assert.strictEqual(placeField().value, "Around");
        });
        assert.isNull(within(dialog).queryByLabelText(/^Name/), "still in Full text");

        await userEvent.fill(box, FIXED_TEXT.replace(' "place": "around",', ""));
        await userEvent.click(placeField());
        await userEvent.click(await screen.findByRole("option", { name: "Behind" }));
        await waitFor(() => {
            assert.strictEqual(placeField().value, "Behind");
        });
        await pressAdd();
        await waitFor(() => {
            assert.strictEqual(
                session.catalog.shaders().find((each) => each.id === "user/pulse-ring")?.place,
                "behind",
            );
        });
    });

    it("a bad default marks its field", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.fill(
            box,
            `/* graphty-shader 1
{ "id": "user/odd", "name": "Odd", "place": "around",
  "params": [ { "name": "tone", "type": "color", "default": "not a color" } ] }
*/
vec4 shade(NodeInput n) { return vec4(tone, 1.0); }
`,
        );
        const row = await within(dialog).findByRole("group", { name: "tone" });
        await waitFor(() => {
            assert.isNotNull(row.querySelector('[data-field="default"][data-invalid]'), "the default is marked");
        });
    });

    it("Copy code's text parses equal to what was typed, and pasted back fills the form", async () => {
        await commands.grantClipboard();
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.fill(box, FIXED_TEXT);
        await waitFor(() => {
            assert.strictEqual(textOf(box), bodyOf(FIXED_TEXT));
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Copy code" }));
        const copied = await waitFor(async () => {
            const text = await navigator.clipboard.readText();
            assert.include(text, "graphty-shader 1");
            return text;
        });
        assert.deepEqual(parseShaderText(copied), parseShaderText(FIXED_TEXT));

        await userEvent.fill(nameField(), "Other");
        await userEvent.fill(box, copied);
        await waitFor(() => {
            assert.strictEqual(textOf(box), bodyOf(FIXED_TEXT));
            assert.strictEqual(nameField().value, "Pulse ring");
        });
    });

    it("Show in Style opens the inspected layer row, writing nothing", async () => {
        const session = await mountWorkspace();
        const first = await addNodeLayer(session, undefined, "First");
        const second = await addNodeLayer(session, undefined, "Second");
        await userEvent.click(await treeRow("First"));
        await openFromMenu();
        await codeBox();
        await pressNamed("Add to project");
        const show = await screen.findByRole("button", { name: "Show in Style" });
        assert.notStrictEqual(document.activeElement?.getAttribute("aria-label"), "Add to node shaders");
        const { position } = session.history;
        await userEvent.click(show);
        await waitFor(async () => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "Add to node shaders");
            assert.strictEqual((await treeRow("First")).getAttribute("aria-selected"), "true");
        });
        assert.deepEqual(usesOn(session, first), []);
        assert.deepEqual(usesOn(session, second), []);
        assert.strictEqual(session.history.position, position, "showing it is not a step");
    });

    it("Show in Style with nothing inspected opens the topmost row, writing nothing", async () => {
        const session = await mountWorkspace();
        const top = await addNodeLayer(session, undefined, "Top row");
        const layers = session.styles.list().map((each) => each.id);
        await openFromMenu();
        await codeBox();
        await pressNamed("Add to project");
        const show = await screen.findByRole("button", { name: "Show in Style" });
        const { position } = session.history;
        await userEvent.click(show);
        await waitFor(async () => {
            assert.strictEqual((await treeRow("Top row")).getAttribute("aria-selected"), "true");
        });
        assert.deepEqual(
            session.styles.list().map((each) => each.id),
            layers,
        );
        assert.deepEqual(usesOn(session, top), [], "the row it opens gains nothing");
        assert.strictEqual(session.history.position, position, "showing it is not a step");
    });
});
