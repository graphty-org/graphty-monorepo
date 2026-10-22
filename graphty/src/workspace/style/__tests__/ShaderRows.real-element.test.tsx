/**
 * The Node tab's Shaders section on the REAL graphty-element, driven by real input
 * (decisions-v2, section 2): "+" opens the one gallery with focus in its search, Enter adds the
 * named shader at its own place with focus on the new row, the Place dropdown lists only the
 * places a shader allows and moves it without touching the shape, which reads "Hidden" while the
 * shader draws instead of the node; rows reorder by drag and by Alt+Up; the settings show Minimum
 * size only for a shader that declares it; the tiles are a radio group the arrows move through;
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
    TIMEOUT_MS,
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
        await waitFor(
            () => {
                assert.deepEqual(usesOn(mounted.session, layer), [{ shader: "glass" }]);
            },
            { timeout: TIMEOUT_MS },
        );
        const [row] = shaderRows();
        assert.isDefined(row, "a Glass row");
        assert.include(row.textContent, "Glass");
        assert.include(row.textContent, "On the node");
        assert.isNull(within(row).queryByLabelText(/^Place of/), "one allowed place is a static label, not a dropdown");
        await waitFor(() => {
            assert.isTrue(row.contains(document.activeElement), "focus is on the new row");
        });
    });

    it("Instead of the node hides the Shape row with a caption; Around brings it back with the shape unchanged", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session, { "node.shape": "box" });
        renderPanel(mounted, [layer]);
        const sticker = idOf(mounted.session, "Sticker");

        await addByName("Sticker");
        await waitFor(() => {
            assert.equal(usesOn(mounted.session, layer)[0]?.shader, sticker);
        });
        const place = await within(section("node", "shaders")).findByLabelText<HTMLInputElement>(/^Place of Sticker/);
        // A pick hands focus to the new row's Place dropdown, the second decision.
        await waitFor(() => {
            assert.strictEqual(document.activeElement, place);
        });
        await userEvent.click(place);
        await userEvent.click(await screen.findByRole("option", { name: "Instead of the node" }));
        const shapeRow = (): HTMLElement => {
            const found = section("node", "shape").querySelector<HTMLElement>('.ws-row[data-line="node.shape"]');
            assert.isNotNull(found, "the Shape row stays");
            return found;
        };
        await waitFor(
            () => {
                assert.include(shapeRow().textContent, hiddenByWords("Sticker"));
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.click(place);
        await userEvent.click(await screen.findByRole("option", { name: "Around" }));
        await waitFor(
            () => {
                assert.deepEqual(usesOn(mounted.session, layer), [{ shader: sticker, place: "around" }]);
                assert.notInclude(shapeRow().textContent, "Hidden");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(mounted.session.styles.get(layer)?.set?.["node.shape"], "box", "the shape is unchanged");
    });

    it("dragging the second row above the first flips the order; Alt+Up on a row does the same", async () => {
        const mounted = await mountElement();
        const aura = idOf(mounted.session, "Aura");
        const reticle = idOf(mounted.session, "Reticle");
        const layer = await addNodeLayer(mounted.session, { "node.shaders": [{ shader: aura }, { shader: reticle }] });
        renderPanel(mounted, [layer]);
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

    it("the gallery's tiles are a radio group the arrow keys move through", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);
        const gallery = await openGallery();
        const tiles = within(gallery).getByRole("radiogroup", { name: "Shaders" });
        const radios = within(tiles).getAllByRole("radio");
        assert.isAbove(radios.length, 2);
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, radios[0]);
        });
        await userEvent.keyboard("{ArrowRight}");
        assert.strictEqual(document.activeElement, radios[1]);
        await userEvent.keyboard("{ArrowLeft}");
        assert.strictEqual(document.activeElement, radios[0]);
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

    it("at 768 px wide the Node tab's place chips wrap: no horizontal scroll, no cut chip text", async () => {
        await page.viewport(768, 1024);
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);
        const gallery = await openGallery();
        const chips = gallery.querySelector<HTMLElement>('[data-filter="place"]');
        assert.isNotNull(chips);
        assert.isAtMost(chips.scrollWidth, chips.clientWidth, "the chip row does not scroll sideways");
        for (const label of chips.querySelectorAll<HTMLElement>("label")) {
            assert.isAtMost(label.scrollWidth, label.clientWidth, `"${label.textContent ?? ""}" is not cut`);
        }
        await page.viewport(1024, 768);
    });
});
