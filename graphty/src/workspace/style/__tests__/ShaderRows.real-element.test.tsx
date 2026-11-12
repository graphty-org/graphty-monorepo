/**
 * The Node tab's Shaders section on the REAL graphty-element, driven by real input
 * (decisions-v2, section 2): "+" opens the one gallery with focus in its search, Enter adds the
 * named shader at its own place with focus on the new row, choosing asks no place (a shader draws
 * at its own; the Shape row reads "Hidden" while one draws instead of the node); rows reorder by drag and by Alt+Up; the settings show Minimum
 * size only for a shader that declares it; the tiles are buttons the arrows move through;
 * and the panel never says Effects, Material, On top, On enter or On change. Every assertion reads
 * what the element reports: the layer stack, and what the panel shows.
 */

import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { dragTo } from "../../../test/real-pointer";
import { screen, waitFor, within } from "../../../test/test-utils";
import { hiddenByWords } from "../words";
import {
    addByName,
    addNodeLayer,
    idOf,
    mountElement,
    openGallery,
    removeElement,
    renderPanel,
    section,
    shaderRows,
    usesOn,
} from "./shaderHarness";

afterEach(removeElement);

/**
 * The open settings pop-out's Minimum size row, if it has one.
 * @returns the row, or null.
 */
function minimumSize(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.ws-shader-params [data-option="minSize"]');
}

describe("the Shaders section", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("'+', typing glass and Enter adds a Glass row at On the node, a static label, with focus on the row", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);

        await addByName("glass");
        await waitFor(() => {
            assert.deepEqual(usesOn(mounted.session, layer), [{ shader: "glass" }]);
        });
        const [row] = shaderRows();
        assert.isDefined(row, "a Glass row");
        assert.include(row.textContent, "Glass");
        assert.include(row.textContent, "On the node");
        assert.isNull(within(row).queryByLabelText(/^Place of/), "one allowed place is a static label, not a dropdown");
        await waitFor(() => {
            assert.isTrue(row.contains(document.activeElement), "focus is on the new row");
        });
    });

    it("choosing a shader asks no place: the gallery has no place filter, and a Sticker row shows its place as words", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session, { "node.shape": "box" });
        renderPanel(mounted, [layer]);
        const sticker = idOf(mounted.session, "Sticker");

        const gallery = await openGallery();
        assert.isNull(within(gallery).queryByRole("radiogroup", { name: "Place" }), "no place filter");
        for (const words of ["Instead of the node", "Behind"]) {
            assert.isNull(within(gallery).queryByRole("radio", { name: words }), `no ${words} choice`);
        }
        await userEvent.click(within(gallery).getByRole("button", { name: "Sticker" }));
        await waitFor(() => {
            assert.deepEqual(usesOn(mounted.session, layer), [{ shader: sticker }]);
        });
        const [row] = shaderRows();
        assert.isDefined(row, "a Sticker row");
        assert.include(row.textContent, "Instead of the node", "its own place, as words");
        assert.isNull(within(row).queryByLabelText(/^Place of/), "no Place dropdown");
        assert.isNull(within(row).queryByRole("combobox"), "no place choice on the row");
        await waitFor(() => {
            assert.isTrue(row.contains(document.activeElement), "focus is on the new row");
        });
        // The shader draws instead of the node: the Shape row says so, and the shape is kept.
        await waitFor(() => {
            const shapeRow = section("node", "shape").querySelector<HTMLElement>('.ws-row[data-line="node.shape"]');
            assert.include(shapeRow?.textContent, hiddenByWords("Sticker"));
        });
        assert.equal(mounted.session.styles.get(layer)?.set?.["node.shape"], "box", "the shape is unchanged");
    });

    it("dragging the second row above the first flips the order; Alt+Up on a row does the same", async () => {
        const mounted = await mountElement();
        const aura = idOf(mounted.session, "Aura");
        const reticle = idOf(mounted.session, "Reticle");
        const layer = await addNodeLayer(mounted.session, { "node.shaders": [{ shader: aura }, { shader: reticle }] });
        const store = renderPanel(mounted, [layer]);
        const order = (): string[] => usesOn(mounted.session, layer).map((use) => use.shader);

        const [first, second] = await waitFor(() => {
            const rows = shaderRows();
            assert.lengthOf(rows, 2);
            return rows;
        });
        const handle = within(second).getByRole("button", { name: /^Move / });
        const top = first.getBoundingClientRect();
        await dragTo(handle, { x: top.left + top.width / 2, y: top.top + 2 });
        await waitFor(() => {
            assert.deepEqual(order(), [reticle, aura]);
        });

        const now = shaderRows()[1];
        within(now)
            .getByRole("button", { name: /^Move / })
            .focus();
        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        await waitFor(() => {
            assert.deepEqual(order(), [aura, reticle]);
        });
        assert.strictEqual(store.get().announcement, "Aura moved to 1 of 2", "a move says where the row went");
        await waitFor(() => {
            assert.match(document.activeElement?.getAttribute("aria-description") ?? "", /^1 of 2\./);
        });
        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        assert.strictEqual(store.get().announcement, "Aura is already first");
        assert.deepEqual(order(), [aura, reticle]);
    });

    it("Move down in a row's right-click menu reorders without dragging; Move up is off on the first row", async () => {
        const mounted = await mountElement();
        const aura = idOf(mounted.session, "Aura");
        const reticle = idOf(mounted.session, "Reticle");
        const layer = await addNodeLayer(mounted.session, { "node.shaders": [{ shader: aura }, { shader: reticle }] });
        renderPanel(mounted, [layer]);
        const [first] = await waitFor(() => {
            const rows = shaderRows();
            assert.lengthOf(rows, 2);
            return rows;
        });
        await userEvent.click(within(first).getByText("Aura"), { button: "right" });
        const up = await screen.findByRole("menuitem", { name: "Move up" });
        assert.isTrue(up.hasAttribute("data-disabled") || up.getAttribute("aria-disabled") === "true");
        await userEvent.click(screen.getByRole("menuitem", { name: "Move down" }));
        await waitFor(() => {
            assert.deepEqual(
                usesOn(mounted.session, layer).map((use) => use.shader),
                [reticle, aura],
            );
        });
    });

    it("Reticle's settings show Minimum size 40; Frost's have no such field", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session, {
            "node.shaders": [{ shader: idOf(mounted.session, "Reticle") }, { shader: idOf(mounted.session, "Frost") }],
        });
        renderPanel(mounted, [layer]);
        const [reticle, frost] = await waitFor(() => {
            const rows = shaderRows();
            assert.lengthOf(rows, 2);
            return rows;
        });

        await userEvent.click(within(reticle).getByRole("button", { name: "Reticle settings" }));
        const minimum = await waitFor(() => minimumSize());
        assert.isNotNull(minimum, "Reticle has a Minimum size row");
        assert.include(minimum?.textContent, "Minimum size");
        assert.equal(minimum?.querySelector("input")?.value, "40");
        assert.isNotNull(document.querySelector('[data-testid="shader-cost"]'), "one cost line");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(document.querySelector(".ws-shader-params"));
        });

        await userEvent.click(within(frost).getByRole("button", { name: "Frost settings" }));
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".ws-shader-params"));
        });
        assert.isNull(minimumSize(), "Frost declares no minimum size");
    });

    it("a shader added through the API shows a row like a built-in: name, its place as words, Minimum size", async () => {
        const mounted = await mountElement();
        const added = await mounted.session.shaders.add(`/* graphty-shader 1
{ "id": "acme/ring", "name": "Ring", "place": "around", "minSize": 40,
  "params": [{ "name": "tint", "type": "color", "default": "#ffcc00" }] }
*/
vec4 shade(NodeInput n) {
    float ring = 1.0 - smoothstep(0.0, 0.1, abs(length(n.uv) - 1.2));
    return vec4(tint, ring);
}
`);
        assert.isTrue(added.ok, JSON.stringify(added));
        const ring = added.ok ? added.descriptor.id : "";
        const layer = await addNodeLayer(mounted.session, { "node.shaders": [{ shader: ring }] }, "Ring on hover");
        renderPanel(mounted, [layer]);
        const [row] = await waitFor(() => {
            const rows = shaderRows();
            assert.lengthOf(rows, 1);
            return rows;
        });
        assert.include(row.textContent, "Ring");
        assert.include(row.textContent, "Around");
        assert.isNull(within(row).queryByLabelText(/^Place of/), "no Place dropdown, as on a built-in");

        await userEvent.click(within(row).getByRole("button", { name: "Ring settings" }));
        const minimum = await waitFor(() => {
            const found = minimumSize();
            assert.isNotNull(found, "a declared minimum size is a setting");
            return found;
        });
        assert.equal(minimum.querySelector("input")?.value, "40");
    });

    it("the gallery's tiles are buttons the arrow keys move through, each describing what it shows", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session, {
            "node.shaders": [{ shader: idOf(mounted.session, "Reticle") }],
        });
        renderPanel(mounted, [layer]);
        await waitFor(() => {
            assert.lengthOf(shaderRows(), 1);
        });
        const gallery = await openGallery();
        const tiles = within(gallery).getByRole("group", { name: "Shaders" });
        const buttons = within(tiles)
            .getAllByRole("button")
            .filter((tile) => !tile.hasAttribute("aria-disabled"));
        assert.isAbove(buttons.length, 2);
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            assert.include(buttons, document.activeElement);
        });
        const first = document.activeElement as HTMLElement;
        const at = buttons.indexOf(first);
        await userEvent.keyboard("{ArrowRight}");
        assert.strictEqual(document.activeElement, buttons[at + 1]);
        await userEvent.keyboard("{ArrowLeft}");
        assert.strictEqual(document.activeElement, first);

        // A screen reader hears the tile's place, facts and whether it is already in use.
        const described = (name: string): string => {
            const tile = within(tiles).getByRole("button", { name });
            return document.getElementById(tile.getAttribute("aria-describedby") ?? "")?.textContent ?? "";
        };
        const reticle = described("Reticle");
        assert.include(reticle, "In use");
        assert.include(reticle, "Around");
        assert.include(reticle, "Animates");
        assert.notInclude(described("Pearl"), "In use");
    });

    it("no element of the panel says On enter, On change, Effects, Material or On top", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session, {
            "node.shaders": [{ shader: idOf(mounted.session, "Reticle") }],
        });
        renderPanel(mounted, [layer]);
        await waitFor(() => {
            assert.lengthOf(shaderRows(), 1);
        });
        await userEvent.click(within(shaderRows()[0]).getByRole("button", { name: "Reticle settings" }));
        await waitFor(() => {
            assert.isNotNull(minimumSize());
        });
        const words = document.body.innerText;
        for (const banned of ["On enter", "On change", "Effects", "Material", "On top"]) {
            assert.notInclude(words, banned);
        }
    });
});
