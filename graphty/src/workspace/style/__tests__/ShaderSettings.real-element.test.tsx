/**
 * A Shaders row's settings pop-out on the REAL graphty-element, driven by real input: each kind of
 * parameter writes the row's use on the layer (a picture grid, an On/Off list, a choice list, a
 * number scrubbed by its name), the minus takes a value back to its default, a parameter that
 * varies binds to data and its unlink stops it, and Copy code copies the row's values with the
 * text. Every assertion reads the element's layer, or what the panel shows.
 */

import type { ShaderParamAddress } from "@graphty/graphty-element/schema";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { withoutFeatures } from "../../../test/features";
import { dragAcross } from "../../../test/real-pointer";
import { screen, waitFor, within } from "../../../test/test-utils";
import {
    addNodeLayer,
    idOf,
    type Mounted,
    mountElement,
    removeElement,
    renderPanel,
    shaderRows,
    usesOn,
} from "./shaderHarness";

declare module "vitest/browser" {
    interface BrowserCommands {
        grantClipboard: () => Promise<void>;
    }
}

withoutFeatures(["file-styles"]);

afterEach(removeElement);

/**
 * A layer with one shader on it, its Style tab drawn and that row's settings open.
 * @param name - the shader's catalog name.
 * @returns the element, the layer, the shader's id and the open pop-out.
 */
async function openSettings(
    name: string,
    nodes: readonly Record<string, unknown>[] = [],
): Promise<Mounted & { layer: string; shader: string; popout: HTMLElement; store: ReturnType<typeof renderPanel> }> {
    const mounted = await mountElement();
    await mounted.session.data.addNodes(nodes);
    const shader = idOf(mounted.session, name);
    const layer = await addNodeLayer(mounted.session, { "node.shaders": [{ shader }] });
    const store = renderPanel(mounted, [layer]);
    const [row] = await waitFor(() => {
        const rows = shaderRows();
        assert.lengthOf(rows, 1);
        return rows;
    });
    await userEvent.click(within(row).getByRole("button", { name: `${name} settings` }));
    const popout = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(".ws-shader-params");
        assert.isNotNull(found, "the settings are open");
        return found;
    });
    return { ...mounted, layer, shader, popout, store };
}

/**
 * The parameter values the layer's one use sets.
 * @param mounted - the element.
 * @param layer - the layer.
 * @returns its params, or undefined.
 */
function paramsOn(mounted: Mounted, layer: string): Readonly<Record<string, unknown>> | undefined {
    return usesOn(mounted.session, layer)[0]?.params;
}

/**
 * One parameter's row in the open pop-out.
 * @param popout - the pop-out.
 * @param name - the parameter's id.
 * @returns the row.
 */
function paramRow(popout: HTMLElement, name: string): HTMLElement {
    const found = popout.querySelector<HTMLElement>(`[data-option="${name}"]`);
    assert.isNotNull(found, `a ${name} row`);
    return found;
}

/**
 * A list control's input in a row.
 * @param row - the row.
 * @param name - its label.
 * @returns the input.
 */
function selectIn(row: HTMLElement, name: RegExp): HTMLElement {
    const [input] = within(row)
        .getAllByLabelText(name)
        .filter((each) => each.tagName === "INPUT");
    assert.isDefined(input, `a ${String(name)} list`);
    return input;
}

describe("a shader row's settings", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("Sticker's icon pictures, Outline and Foil each write the use; the minus resets Outline", async () => {
        const mounted = await openSettings("Sticker");
        const { popout, layer } = mounted;

        const icons = within(popout).getByRole("group", { name: "Icon" });
        const [first, second] = within(icons).getAllByRole("button");
        assert.strictEqual(first.getAttribute("aria-pressed"), "true", "the default picture is pressed");
        await userEvent.click(second);
        await waitFor(() => {
            assert.strictEqual(paramsOn(mounted, layer)?.icon, Number(second.getAttribute("data-choice")));
        });
        await waitFor(() => {
            assert.strictEqual(
                within(
                    within(document.querySelector<HTMLElement>(".ws-shader-params") ?? popout).getByRole("group", {
                        name: "Icon",
                    }),
                )
                    .getAllByRole("button")[1]
                    ?.getAttribute("aria-pressed"),
                "true",
            );
        });

        await userEvent.click(selectIn(paramRow(popout, "outline"), /^Outline/));
        await userEvent.click(await screen.findByRole("option", { name: "On" }));
        await waitFor(() => {
            assert.strictEqual(paramsOn(mounted, layer)?.outline, true);
        });

        await userEvent.click(selectIn(paramRow(popout, "finish"), /^Foil/));
        await userEvent.click(await screen.findByRole("option", { name: "Shiny" }));
        await waitFor(() => {
            assert.strictEqual(paramsOn(mounted, layer)?.finish, "shiny");
        });

        await userEvent.click(within(paramRow(popout, "outline")).getByRole("button", { name: "Reset outline" }));
        await waitFor(() => {
            assert.notProperty(paramsOn(mounted, layer) ?? {}, "outline", "Outline is back to its default");
        });
        assert.strictEqual(paramsOn(mounted, layer)?.finish, "shiny", "the other values stay");
        await waitFor(() => {
            assert.isNull(paramRow(popout, "outline").getAttribute("data-set"), "the row no longer reads as set");
        });
    });

    it("dragging Foil strength's name scrubs it and writes once on release, inside its range", async () => {
        const mounted = await openSettings("Sticker");
        const { popout, layer, session } = mounted;
        const label = paramRow(popout, "foil").querySelector<HTMLElement>("[data-scrub]");
        assert.isNotNull(label, "a number's name scrubs");
        const steps = session.history.position;

        await dragAcross(label, -60);
        await waitFor(() => {
            const foil = paramsOn(mounted, layer)?.foil;
            assert.isNumber(foil);
            assert.isBelow(foil as number, 0.85, "dragged left lowers it");
            assert.isAtLeast(foil as number, 0, "inside its range");
        });
        assert.strictEqual(session.history.position, steps + 1, "one undo step for the whole drag");
    });

    it("a varying parameter binds to an attribute; its unlink stops the varying", async () => {
        // Two more nodes carrying a number, so the vary list has an amount to offer.
        const mounted = await openSettings("Patterns", [
            { id: "4", group: "b", weight: 2 },
            { id: "5", group: "b", weight: 5 },
        ]);
        const { popout, layer, shader, session } = mounted;
        const key = `node.shaders.${shader}.pattern` as ShaderParamAddress;

        await userEvent.hover(paramRow(popout, "pattern"));
        await userEvent.click(
            within(paramRow(popout, "pattern")).getByRole("button", { name: "Pattern by attribute" }),
        );
        await userEvent.click(await screen.findByRole("option", { name: /^weight/i }));
        await waitFor(() => {
            const binding = session.styles.get(layer)?.encode?.[key];
            assert.isDefined(binding, "the parameter is bound");
        });

        const bound = await waitFor(() => {
            const row = document.querySelector<HTMLElement>('.ws-shader-params [data-option="pattern"]');
            assert.isNotNull(row);
            assert.isNotNull(row.querySelector("[data-param-bound]"), "the row names its source");
            return row;
        });
        assert.isNull(within(bound).queryByRole("button", { name: "Reset pattern" }), "no reset while bound");
        await userEvent.click(within(bound).getByRole("button", { name: "Stop varying pattern by data" }));
        await waitFor(() => {
            assert.isUndefined(session.styles.get(layer)?.encode?.[key], "the binding is gone");
        });
        assert.deepEqual(usesOn(session, layer), [{ shader }], "the use itself is unchanged");
    });

    it("Copy code copies the text with the row's values as its defaults and says so", async () => {
        await commands.grantClipboard();
        const mounted = await openSettings("Sticker");
        const { popout, layer, store } = mounted;
        await userEvent.click(selectIn(paramRow(popout, "outline"), /^Outline/));
        await userEvent.click(await screen.findByRole("option", { name: "On" }));
        await waitFor(() => {
            assert.strictEqual(paramsOn(mounted, layer)?.outline, true);
        });

        await userEvent.click(screen.getByRole("button", { name: "Copy code" }));
        await waitFor(() => {
            assert.strictEqual(store.get().announcement, "Sticker copied");
        });
        const copied = await navigator.clipboard.readText();
        assert.match(copied, /"name": "outline"[^}]*"default": true/, "the copy's Outline defaults to the row's On");
    });
});
