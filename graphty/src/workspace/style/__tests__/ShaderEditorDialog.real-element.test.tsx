/**
 * The code dialog (New shader, Edit shader), Copy code, Duplicate and edit, Delete from project
 * and Control+V on the REAL graphty-element, driven by real input (decisions-v2, section 2.2): its
 * first field is the place, preset from the gallery's filter, and the code box starts with that
 * place's template. Every assertion reads what the element reports: the layer stack, the project's
 * shaders, the history.
 */

import { parseShaderText, shaderTemplate, splitShaderText } from "@graphty/graphty-element/catalog";
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
        assert.strictEqual(box.value, bodyOf(shaderTemplate({ target: "node", place: "paint" })));

        // The template follows the field until the reader writes over it.
        await userEvent.click(place);
        await userEvent.click(await screen.findByRole("option", { name: "Behind" }));
        await waitFor(() => {
            assert.strictEqual(box.value, bodyOf(shaderTemplate({ target: "node", place: "behind" })));
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
        assert.strictEqual(box.selectionStart, box.value.indexOf("while"));
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
        assert.strictEqual(again.value, bodyOf(FIXED_TEXT));
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
        assert.strictEqual(box.value, bodyOf(text));
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

    it("a filled row changes what is checked, and Add lists its parameters", async () => {
        const { session } = await mount();
        await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Add to node parameters" }));
        const row = await within(dialog).findByRole("group", { name: "param1" });
        const name = within(row).getByLabelText<HTMLInputElement>(/param1 name/);
        await userEvent.fill(name, "glow");
        await userEvent.tab();
        await within(dialog).findByRole("group", { name: "glow" });
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
        const before = box.value;
        box.setSelectionRange(0, 0);
        await userEvent.click(insert);
        await waitFor(() => {
            assert.strictEqual(box.value, `tint${before}`);
        });
        assert.strictEqual(document.activeElement, box);
    });

    it("pasted full text fills the form and the box holds the body; an unreadable header lands in Full text", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.fill(box, FIXED_TEXT);
        await waitFor(() => {
            assert.strictEqual(box.value, bodyOf(FIXED_TEXT));
        });
        assert.strictEqual(within(dialog).getByLabelText<HTMLInputElement>(/^Name/).value, "Pulse ring");

        const broken = "/* graphty-shader 1\n[1, 2]\n*/\nvec4 shade(NodeInput n) { return n.color; }\n";
        await userEvent.fill(box, broken);
        await waitFor(() => {
            assert.strictEqual(box.value, broken);
            assert.isNull(within(dialog).queryByLabelText(/^Name/), "Full text hides Name");
        });
        assert.strictEqual(
            within(dialog).getByRole("button", { name: "Full text" }).getAttribute("aria-pressed"),
            "true",
        );
    });

    it("a row with min above max marks its gear and survives a Full text round trip", async () => {
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

        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.include(box.value, '"min": 5');
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.isNotNull(
                within(dialog).getByRole("button", { name: "gain settings" }).getAttribute("data-invalid"),
                "still marked with the form shown",
            );
        });
    });

    it("a non-ASCII Name gives a problem row that opens Full text on that line", async () => {
        await mount();
        const box = await openNew();
        const dialog = screen.getByRole("dialog", { name: "New shader" });
        await userEvent.fill(within(dialog).getByLabelText<HTMLInputElement>(/^Name/), "Caf\u00e9");
        const row = await waitFor(() => {
            const found = dialog.querySelector<HTMLElement>('[data-code="shader.not-ascii"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(row);
        await waitFor(() => {
            assert.include(box.value, "graphty-shader 1", "the box shows the whole text");
        });
        assert.strictEqual(document.activeElement, box);
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

    it("a Number row's Starts writes a clock, a Color row's adds range, and both survive Full text", async () => {
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
            const written = splitShaderText(box.value).draft?.params?.[0]?.default as Record<string, unknown>;
            assert.strictEqual(written.by, "since.selected");
            assert.deepEqual(written.domain, [0, 0.3]);
            assert.lengthOf(written.range as string[], 2);
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
            assert.deepEqual(splitShaderText(box.value).draft?.params?.[1]?.default, {
                by: "since.hovered",
                domain: [0, 0.3],
            });
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
            assert.strictEqual(splitShaderText(box.value).draft?.minSize, 12);
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
            assert.strictEqual(box.value, bodyOf(shaderTemplate({ target: "node", place: "around" })));
        });
        assert.strictEqual(name.value, "Sun halo");
    });
});
