/**
 * A saved project carries the full text of every shader the app writes, on the REAL
 * graphty-element, driven by real input: a gallery pick on a node layer's Shaders, and the shader
 * editor's Add of an unchanged built-in. The saved style member holds a `graphty-shader 1` text
 * under the very id the layer's use names, so a later build that no longer ships the shader opens
 * the file the same way. The shader is chosen from the live catalog, never by a hand-written id.
 */

import type { ShaderDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import { addNodeLayer, mountElement, openGallery, removeElement, renderPanel, usesOn } from "./shaderHarness";

afterEach(removeElement);

/**
 * A built-in node shader the catalog lists that this page can draw, from the live catalog.
 * @param session - the element's session.
 * @returns its catalog entry.
 */
function builtInNodeShader(session: GraphSession): ShaderDescriptor {
    const found = session.catalog
        .shaders()
        .find(
            (each) => each.origin === "element" && each.target === "node" && session.shaders.availability(each.id).ok,
        );
    assert.isDefined(found, "the catalog lists a built-in node shader this page can draw");
    return found;
}

/**
 * The shaders a saved project's style member carries.
 * @param session - the element's session.
 * @returns each carried shader's id and text.
 */
async function savedShaders(session: GraphSession): Promise<readonly { id: string; text: string }[]> {
    const file = JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] };
    const style = file.members.find((member) => member.kind === "graphty-style");
    return (style?.shaders ?? []) as readonly { id: string; text: string }[];
}

/**
 * Saves the project and checks it carries the full text of the one shader the layer uses, under
 * the id the use names.
 * @param session - the element's session.
 * @param layer - the layer.
 * @param shader - the catalog entry the reader chose.
 */
async function assertCarried(session: GraphSession, layer: string, shader: ShaderDescriptor): Promise<void> {
    const uses = usesOn(session, layer);
    assert.lengthOf(uses, 1, "the layer uses the one shader");
    const [use] = uses;
    const carried = (await savedShaders(session)).find((each) => each.id === use.shader);
    assert.isDefined(carried, "the save carries the text of the shader the use names");
    const text = carried?.text ?? "";
    assert.match(text, /^\/\* graphty-shader 1\n/, "a complete graphty-shader 1 text");
    assert.match(text, /vec4 shade\(/, "with its body");
    assert.strictEqual(session.shaders.describe(use.shader)?.copyOf, shader.id, "the same code the catalog ships");
}

describe("a save carries the text of every shader the app writes", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("a gallery pick on a node layer saves the shader's full text under the id its use names", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);
        const shader = builtInNodeShader(mounted.session);

        const gallery = await openGallery();
        await userEvent.click(await within(gallery).findByRole("button", { name: shader.plainName }));
        await waitFor(() => {
            assert.lengthOf(usesOn(mounted.session, layer), 1);
        });

        await assertCarried(mounted.session, layer, shader);
    });

    it("the editor's Add of an unchanged built-in saves the shader's full text under the id its use names", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);
        const shader = builtInNodeShader(mounted.session);
        const text = await mounted.session.shaders.source(shader.id);

        const gallery = await openGallery();
        await userEvent.click(within(gallery).getByRole("button", { name: "New shader..." }));
        const dialog = await screen.findByRole("dialog", { name: "New shader" });
        await waitFor(() => {
            assert.isNotNull(dialog.querySelector('[data-editor="ready"]'), "the code editor has loaded");
        });
        await userEvent.fill(within(dialog).getByRole("textbox", { name: "Shader code" }), text);
        const add = within(dialog).getByRole("button", { name: "Add" });
        await waitFor(() => {
            assert.isNull(add.getAttribute("aria-disabled"), "Add is enabled");
        });
        await userEvent.click(add);
        await waitFor(() => {
            assert.lengthOf(usesOn(mounted.session, layer), 1);
        });

        await assertCarried(mounted.session, layer, shader);
    });
});
