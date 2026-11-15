/**
 * The shader dialog on the REAL graphty-element when the code editor's file cannot be loaded, as
 * on a page whose build was replaced under it: the plain text box stays, and everything works
 * without highlighting. Its own file, because a chunk that loaded stays loaded for the whole page.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

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

describe("the shader dialog when the code editor cannot be loaded", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
        await commands.failRequests("ShaderCodeEditor", true);
    });

    afterAll(async () => {
        await commands.failRequests("ShaderCodeEditor", false);
        removeElement();
    });

    it("keeps the plain text box, which still checks and adds", async () => {
        const mounted = await mountElement();
        const id = await addNodeLayer(mounted.session);
        renderPanel(mounted, [id]);
        const gallery = await openGallery();
        await userEvent.click(within(gallery).getByRole("button", { name: "New shader..." }));
        const dialog = await screen.findByRole("dialog", { name: "New shader" });
        const box = within(dialog).getByRole<HTMLTextAreaElement>("textbox", { name: "Shader code" });
        await userEvent.fill(box, TEXT);
        const add = within(dialog).getByRole("button", { name: "Add" });
        await waitFor(() => {
            assert.isNull(add.getAttribute("aria-disabled"), "the text passed its checks");
        });
        await userEvent.click(add);
        await waitFor(() => {
            assert.deepEqual(usesOn(mounted.session, id), [{ shader: "user/plain-box" }]);
        });
        assert.strictEqual(box.tagName, "TEXTAREA");
        assert.isNull(dialog.querySelector('[data-editor="ready"]'));
    });
});
