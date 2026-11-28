/**
 * The code dialog's problem rows on the REAL graphty-element, driven by real input: each row goes
 * where its problem belongs -- a header field of the form, a parameter row, the Place field, or
 * Full text for a header key the form has no field for -- and an empty box offers nothing to add.
 * Every problem is one the element's own check reports.
 */

import { EditorView } from "@codemirror/view";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import { addNodeLayer, mountElement, openGallery, removeElement, renderPanel, usesOn } from "./shaderHarness";

/** A node shader with a reach out of its range: a problem with the Reach field. */
const FAR_TEXT = `/* graphty-shader 1
{ "id": "user/far-ring", "name": "Far ring", "place": "around", "reach": 99 }
*/
vec4 shade(NodeInput n) {
    return n.color;
}
`;

/** A header with a key the format does not know, which no field of the form edits. */
const KEY_TEXT = `/* graphty-shader 1
{ "id": "user/odd", "name": "Odd", "place": "around", "bogus": 1 }
*/
vec4 shade(NodeInput n) {
    return n.color;
}
`;

/** A node shader whose header names an edge's place. */
const ALONG_TEXT = `/* graphty-shader 1
{ "id": "user/lost", "name": "Lost", "place": "along" }
*/
vec4 shade(NodeInput n) {
    return n.color;
}
`;

/** A node shader whose one parameter has a default that is not a color. */
const BAD_DEFAULT_TEXT = `/* graphty-shader 1
{ "id": "user/odd", "name": "Odd", "place": "around",
  "params": [ { "name": "tone", "type": "color", "default": "not a color" } ] }
*/
vec4 shade(NodeInput n) { return vec4(tone, 1.0); }
`;

afterEach(removeElement);

/**
 * A real element with a reader's node layer, its Style tab, and the code dialog opened from the
 * gallery's New shader....
 * @returns the session, the layer and the dialog's code box.
 */
async function openNew(): Promise<{
    session: Awaited<ReturnType<typeof mountElement>>["session"];
    id: string;
    box: HTMLElement;
}> {
    const mounted = await mountElement();
    const id = await addNodeLayer(mounted.session);
    renderPanel(mounted, [id]);
    const gallery = await openGallery();
    await userEvent.click(within(gallery).getByRole("button", { name: "New shader..." }));
    const dialog = await screen.findByRole("dialog", { name: "New shader" });
    await waitFor(() => {
        assert.isNotNull(dialog.querySelector('[data-editor="ready"]'), "the code editor has loaded");
    });
    return { session: mounted.session, id, box: within(dialog).getByRole("textbox", { name: "Shader code" }) };
}

/**
 * The open dialog.
 * @returns the dialog.
 */
function dialog(): HTMLElement {
    return screen.getByRole("dialog", { name: "New shader" });
}

/**
 * The open dialog's Add button.
 * @returns the button.
 */
function addButton(): HTMLElement {
    return within(dialog()).getByRole("button", { name: "Add" });
}

/**
 * The one problem row the dialog lists, once the check has listed it.
 * @param code - the problem's code.
 * @returns the row.
 */
async function problemRow(code: string): Promise<HTMLElement> {
    return waitFor(() => {
        const list = within(dialog()).getByRole("list", { name: "Problems" });
        const rows = within(list).getAllByRole("listitem");
        assert.lengthOf(rows, 1, "one problem row");
        const found = rows[0]?.querySelector<HTMLElement>(`[data-code="${code}"]`);
        assert.isNotNull(found, `the row is ${code}`);
        return rows[0];
    });
}

/**
 * What the code box holds.
 * @param box - the code box.
 * @returns its text.
 */
function textOf(box: HTMLElement): string {
    const view = EditorView.findFromDOM(box);
    assert.isNotNull(view, "the box is a code editor");
    return view?.state.doc.toString() ?? "";
}

describe("the code dialog's problem rows on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("a reach out of range is a button to the Reach field, marked; a reach in range clears it and adds", async () => {
        const { session, id, box } = await openNew();
        await userEvent.fill(box, FAR_TEXT);
        const row = await problemRow("shader.header-key");
        assert.include(row.textContent ?? "", 'Header key "reach"');
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");

        await userEvent.click(within(row).getByRole("button"));
        const reach = within(dialog()).getByLabelText<HTMLInputElement>(/^Reach/);
        assert.strictEqual(document.activeElement, reach, "the row put focus in Reach");
        assert.isNotNull(dialog().querySelector('[data-field="reach"][data-invalid]'), "Reach is marked");

        // A number field commits on Enter.
        await userEvent.fill(reach, "2");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(within(dialog()).queryByRole("list", { name: "Problems" }), "no problems left");
            assert.isNull(addButton().getAttribute("aria-disabled"), "Add is enabled");
        });
        assert.isNull(dialog().querySelector('[data-field="reach"][data-invalid]'), "Reach is no longer marked");
        await userEvent.click(addButton());
        await waitFor(() => {
            assert.deepEqual(usesOn(session, id), [{ shader: "user/far-ring" }]);
        });
        assert.strictEqual(session.catalog.shaders().find((each) => each.id === "user/far-ring")?.reach, 2);
    });

    it("a header key the form has no field for offers Full text, which shows the whole text and the key as words", async () => {
        const { session, id, box } = await openNew();
        await userEvent.fill(box, KEY_TEXT);
        const row = await problemRow("shader.header-key");
        assert.include(row.textContent ?? "", 'Header key "bogus"');

        await userEvent.click(within(row).getByRole("button", { name: "Full text" }));
        await waitFor(() => {
            assert.include(textOf(box), "graphty-shader 1", "the box holds the header");
            assert.include(textOf(box), '"bogus"');
        });
        assert.isNull(within(dialog()).queryByLabelText(/^Name/), "the form's fields are gone in Full text");
        const inFull = await problemRow("shader.header-key");
        assert.isNull(inFull.querySelector("button"), "in Full text the key's problem is words alone");
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true");
        assert.deepEqual(usesOn(session, id), []);
        assert.lengthOf(session.shaders.list(), 0);
    });

    it("a node shader naming an edge's place is a button to the Place field", async () => {
        const { session, box } = await openNew();
        await userEvent.fill(box, ALONG_TEXT);
        const row = await problemRow("shader.place-unsupported");
        assert.include(row.textContent ?? "", "Cannot draw");
        // Focus starts elsewhere, so the click is what moves it.
        await userEvent.click(box);
        await userEvent.click(within(row).getByRole("button"));
        const place = within(dialog()).getByLabelText<HTMLInputElement>(/^Place/);
        assert.strictEqual(document.activeElement, place, "the row put focus in Place");
        assert.lengthOf(session.shaders.list(), 0);
    });

    it("a parameter's bad default is a button to that row's Default", async () => {
        const { box } = await openNew();
        await userEvent.fill(box, BAD_DEFAULT_TEXT);
        const row = await problemRow("shader.param-invalid");
        assert.include(row.textContent ?? "", "Parameter tone: bad default");
        await userEvent.click(box);
        await userEvent.click(within(row).getByRole("button"));
        const tone = within(dialog()).getByRole("group", { name: "tone" });
        const field = tone.querySelector('[data-field="default"]');
        assert.isNotNull(field);
        assert.isTrue(field?.contains(document.activeElement), "focus is in the tone row's Default");
    });

    it("an emptied box has nothing to add and lists no problems", async () => {
        const { session, id, box } = await openNew();
        await userEvent.fill(box, FAR_TEXT);
        await problemRow("shader.header-key");
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}a{/Control}{Backspace}");
        await waitFor(() => {
            assert.strictEqual(textOf(box), "");
            assert.isNull(within(dialog()).queryByRole("list", { name: "Problems" }), "no problems listed");
        });
        assert.strictEqual(addButton().getAttribute("aria-disabled"), "true", "Add waits for text");
        assert.deepEqual(usesOn(session, id), []);
        assert.lengthOf(session.shaders.list(), 0);
    });
});
