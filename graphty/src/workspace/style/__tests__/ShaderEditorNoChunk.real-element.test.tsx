/**
 * The shader dialog on the REAL graphty-element when the code editor's file cannot be loaded, as
 * on a page whose build was replaced under it: the plain text box stays, and everything works
 * without highlighting. Its own file, because a chunk that loaded stays loaded for the whole page.
 */

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";
import { commands, type Locator, page, userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import { addNodeLayer, mountElement, openGallery, removeElement, renderPanel, usesOn } from "./shaderHarness";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Fails every request whose URL holds the fragment with 404, or stops (graphty/vitest.config.ts). */
        failRequests: (fragment: string, failing: boolean) => Promise<void>;
    }
}

const TEXT = `/* graphty-shader 1
{ "id": "user/plain-box", "name": "Plain box", "place": "around", "reach": 2 }
*/
vec4 shade(NodeInput n) {
    return n.color;
}
`;

/** A node shader whose body has a while loop, on line 3 of the body. */
const WHILE_TEXT = `/* graphty-shader 1
{ "id": "user/pulse-ring", "name": "Pulse ring", "place": "around", "reach": 2 }
*/
vec4 shade(NodeInput n) {
    float ring = 0.0;
    while (ring < 0.5) { ring += 0.1; }
    return vec4(n.color.rgb * ring, ring);
}
`;

/**
 * The open dialog's plain text box, as a locator Playwright resolves when it acts.
 * @returns the locator.
 */
function boxLocator(): Locator {
    return page.getByRole("dialog", { name: "New shader" }).getByRole("textbox", { name: "Shader code", exact: true });
}

/**
 * Opens the code dialog from the gallery's New shader... on a fresh element and layer.
 * @returns the session, the layer, the dialog and its plain text box.
 */
async function openNew(): Promise<{
    session: Awaited<ReturnType<typeof mountElement>>["session"];
    id: string;
    dialog: HTMLElement;
    box: HTMLTextAreaElement;
}> {
    const mounted = await mountElement();
    const id = await addNodeLayer(mounted.session);
    renderPanel(mounted, [id]);
    const gallery = await openGallery();
    await userEvent.click(page.elementLocator(gallery).getByRole("button", { name: "New shader...", exact: true }));
    const dialog = await screen.findByRole("dialog", { name: "New shader" });
    const box = within(dialog).getByRole<HTMLTextAreaElement>("textbox", { name: "Shader code" });
    return { session: mounted.session, id, dialog, box };
}

describe("the shader dialog when the code editor cannot be loaded", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
        await commands.failRequests("ShaderCodeEditor", true);
    });

    afterEach(removeElement);

    afterAll(async () => {
        await commands.failRequests("ShaderCodeEditor", false);
    });

    it("keeps the plain text box, which still checks and adds", async () => {
        const { session, id, dialog, box } = await openNew();
        await userEvent.fill(boxLocator(), TEXT);
        const add = within(dialog).getByRole("button", { name: "Add" });
        await waitFor(() => {
            assert.isNull(add.getAttribute("aria-disabled"), "the text passed its checks");
        });
        await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Add", exact: true }));
        await waitFor(() => {
            assert.deepEqual(usesOn(session, id), [{ shader: "user/plain-box" }]);
        });
        assert.strictEqual(box.tagName, "TEXTAREA");
        assert.isNull(dialog.querySelector('[data-editor="ready"]'));
    });

    it("a problem row puts the plain box's caret on its line", async () => {
        const { dialog, box } = await openNew();
        await userEvent.fill(boxLocator(), WHILE_TEXT);
        const row = await waitFor(() => {
            const list = within(dialog).getByRole("list", { name: "Problems" });
            const [found] = within(list).getAllByRole("listitem");
            assert.isDefined(found);
            return found;
        });
        assert.include(row.textContent ?? "", "Line 3:5");
        await userEvent.click(page.elementLocator(row).getByRole("button"));
        assert.strictEqual(document.activeElement, box, "the box has focus");
        const at = box.value.indexOf("while");
        assert.strictEqual(box.selectionStart, at, "the caret is at the loop");
        assert.strictEqual(box.selectionEnd, at);
        assert.strictEqual(box.tagName, "TEXTAREA");
    });

    it("a row's insert writes its name at the plain box's caret and keeps focus there", async () => {
        const { dialog, box } = await openNew();
        const before = box.value;
        await userEvent.click(boxLocator());
        await userEvent.keyboard("{Control>}{Home}{/Control}");
        const row = within(dialog).getByRole("group", { name: "tint" });
        const insert = within(row).getByRole("button", { name: "Insert tint" });
        const insertAt = page.elementLocator(row).getByRole("button", { name: "Insert tint", exact: true });
        await waitFor(() => {
            assert.isNull(insert.getAttribute("aria-disabled"), "insert is enabled once the box had focus");
        });
        await userEvent.click(insertAt);
        await waitFor(() => {
            assert.strictEqual(box.value, `tint${before}`);
        });
        assert.strictEqual(document.activeElement, box, "focus is back in the box");
        assert.strictEqual(box.selectionStart, "tint".length, "the caret is after the name");
        assert.strictEqual(box.tagName, "TEXTAREA");
    });
});
