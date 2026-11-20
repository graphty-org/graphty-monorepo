/**
 * Custom and built-in shaders are one list (owner: "custom shaders shouldn't be separate from built-in shaders"),
 * and a place is chosen only when a shader is created (E368), on the REAL graphty-element and real input: a
 * custom shader at every place the code dialog offers sits in its target's one Shaders list beside the built-ins
 * (a "replace" one is the Shape menu's, never this list's); "New shader..." is first in the list and opens the
 * code dialog, where Place is set; saving at "around" puts it in the list, and adding it draws around the node.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { shaderTemplate } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { DIALOG_PLACES } from "../words";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf } from "./v2Harness";

/**
 * Registers a custom shader for one place, under its own id and name.
 * @param session - the session.
 * @param target - its target.
 * @param place - its place.
 * @returns its id.
 */
async function custom(session: GraphSession, target: "node" | "edge", place: string): Promise<string> {
    const id = `user/test-${target}-${place}`;
    const text = shaderTemplate({ target, place: place as "paint" })
        .replace(/"id": "[^"]*"/, `"id": "${id}"`)
        .replace(/"name": "[^"]*"/, `"name": "Test ${target} ${place}"`);
    const added = await session.shaders.add(text);
    assert.isTrue(added.ok, JSON.stringify(added));
    return id;
}

/**
 * Opens a tab's one Shaders list from its "+".
 * @param kind - nodes or edges.
 * @returns the list.
 */
async function openList(kind: "node" | "edge"): Promise<HTMLElement> {
    const tab = await screen.findByTestId("style-tab");
    await showKind(kind);
    const section = sectionOf(tab, `${kind}-shaders`);
    await userEvent.click(within(section).getByRole("button", { name: new RegExp(`^Add to ${kind} shaders`) }));
    assert.isNull(screen.queryByRole("menu"), "no menu of places: the list opens at once");
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".ws-gallery-grid")?.parentElement;
        assert.isDefined(found ?? undefined);
        if (found === null || found === undefined) {
            throw new Error("no list");
        }
        return found;
    });
}

describe("custom and built-in shaders are one list", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("a custom shader at every place the code dialog offers is in its target's one list, beside the built-ins", async () => {
        const { session } = await openGraph();
        const ids: Record<"node" | "edge", { id: string; place: string }[]> = { node: [], edge: [] };
        for (const kind of ["node", "edge"] as const) {
            for (const place of DIALOG_PLACES[kind]) {
                ids[kind].push({ id: await custom(session, kind, place), place });
            }
        }
        for (const kind of ["node", "edge"] as const) {
            await openStyle(kind === "node" ? "Key people" : "Links");
            const list = await openList(kind);
            const tiles = [...list.querySelectorAll<HTMLElement>(".ws-gallery-tile")].map(
                (tile) => tile.getAttribute("data-shader") ?? "",
            );
            const builtIns = session.catalog
                .shaders({ target: kind })
                .filter((each) => each.origin === "element" && each.place !== "replace");
            assert.isNotEmpty(builtIns);
            for (const builtIn of builtIns) {
                assert.include(tiles, builtIn.id, `${builtIn.id} is in the ${kind} list`);
            }
            // A shader drawn in the node's place is a Shape kind, never in this list (E378).
            for (const replacer of session.catalog.shaders({ target: kind, place: "replace" })) {
                assert.notInclude(tiles, replacer.id, `${replacer.id} is the Shape menu's, not the ${kind} list's`);
            }
            // Choosing names no place, in words or for a screen reader (E368): only New shader... asks one.
            const placed = [...list.querySelectorAll<HTMLElement>(".ws-gallery-tile")].filter((tile) =>
                /\b(on the node|around|on the line|along the line)\b/i.test(`${tile.textContent} ${tile.title}`),
            );
            assert.deepEqual(
                placed.map((tile) => tile.getAttribute("data-shader")),
                [],
                `no ${kind} tile names a place`,
            );
            for (const { id, place } of ids[kind]) {
                if (place === "replace") {
                    assert.notInclude(tiles, id, "a replace shader is the Shape menu's");
                } else {
                    assert.include(tiles, id, `the custom ${place} shader is in the same ${kind} list`);
                }
            }
            await userEvent.keyboard("{Escape}");
        }
        // The custom replace shader is in the node Shape menu, beside the built-in shapes.
        const replacing = ids.node.find((each) => each.place === "replace");
        assert.isDefined(replacing, "the code dialog offers replace for a node");
        const tab = await openStyle("Key people");
        await showKind("node");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        const picker = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(picker);
        const menu = await screen.findByRole("group", { name: /values$/ });
        const search = within(menu).getByRole("combobox", { name: "Search" });
        // The menu narrowed to a name: what its options say once it settles.
        const found = async (name: string): Promise<string[]> => {
            await userEvent.clear(search);
            await userEvent.type(search, name);
            return waitFor(() => {
                const shown = within(menu)
                    .queryAllByRole("option")
                    .map((option) => option.textContent);
                assert.isTrue(
                    shown.some((text) => text.startsWith(name)),
                    `${name} is in the Shape menu`,
                );
                return shown;
            });
        };
        await found("Sphere");
        await found("Mandala");
        await found("Sticker");
        // A shader drawn around or over the node is the Shaders list's only (E368): searched, it lists nothing.
        await userEvent.clear(search);
        await userEvent.type(search, "Test node around");
        await waitFor(() => {
            assert.deepEqual(within(menu).queryAllByRole("option"), [], "an around shader is not a shape");
        });
        const options = await found("Test node replace");
        assert.include(options, "Test node replace");
        // Picked from the Shape menu, the custom shader draws in the node's place, as a built-in one does.
        await userEvent.click(within(menu).getByRole("option", { name: /^Test node replace/ }));
        await waitFor(() => {
            const layer = session.styles.list().find((each) => each.name === "Key people" && each.target === "node");
            const uses = session.styles.get(layer?.id ?? "")?.set?.["node.shaders"];
            assert.deepInclude(
                Array.isArray(uses) ? uses : [],
                { shader: replacing?.id ?? "" },
                "the replace shader is the layer's",
            );
        });
    });

    it("the Shape menu has a Shaders section, New shader... first, whose New shader... opens the code dialog", async () => {
        await openGraph();
        const tab = await openStyle("Key people");
        await showKind("node");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add to node shape" }));
        const picker = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(picker);
        await userEvent.click(await screen.findByRole("combobox", { name: "Node shape section" }));
        await userEvent.click(await screen.findByRole("option", { name: "Shaders" }));
        const list = await screen.findByRole("group", { name: /values$/ });
        const shown = await waitFor(() => {
            const options = within(list)
                .queryAllByRole("option")
                .map((option) => option.textContent);
            assert.isAbove(options.length, 1);
            return options;
        });
        // After the shapes this graph draws (listed first in every section), New shader... leads the shaders.
        assert.include(shown, "Mandala");
        assert.isBelow(shown.indexOf("New shader..."), shown.indexOf("Mandala"), "New shader... is first");
        assert.isAtLeast(shown.indexOf("New shader..."), 0);
        assert.notInclude(shown, "Torus", "another section's shapes are not listed");
        assert.notInclude(shown, "Custom shader...", "no Custom shader item (E381)");
        await userEvent.click(within(list).getByRole("option", { name: "New shader..." }));
        const dialog = await screen.findByRole("dialog", { name: "New shader" });
        assert.isNotNull(dialog);
        await userEvent.keyboard("{Escape}");
    });

    it("'New shader...' is first; Place is set in the code dialog; saving at around puts it in the list, and it draws", async () => {
        const { session, element, nodes } = await openGraph();
        await openStyle("Key people");
        const list = await openList("node");
        const first = list.querySelector("button, [role='button']");
        assert.equal(first?.textContent.trim(), "New shader...", "New shader... is at the top");
        const before = new Set(session.shaders.list().map((each) => each.id));
        await userEvent.click(within(list).getByRole("button", { name: "New shader..." }));
        const dialog = await screen.findByRole("dialog", { name: /^(New|Edit) shader$/ });
        await userEvent.click(within(dialog).getByRole("combobox", { name: /^Place/ }));
        await userEvent.click(await screen.findByRole("option", { name: /^Around/ }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));
        const id = await waitFor(() => {
            const found = session.shaders.list().find((each) => !before.has(each.id));
            assert.isDefined(found, "the shader is saved to the project");
            return found?.id ?? "";
        });
        // Saving from "+" may add it at once; take it off so the list adds it again.
        await session.styles.update(nodes, { set: { "node.color": "#E8590C" } });
        await session.styles.settled();
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: /^(New|Edit) shader$/ }));
        });
        const plain = await picture(element);
        const again = await openList("node");
        const tile = await waitFor(() => {
            const found = again.querySelector<HTMLElement>(`.ws-gallery-tile[data-shader="${CSS.escape(id)}"]`);
            assert.isNotNull(found, "the new shader is in the one list");
            return found;
        });
        await userEvent.click(tile);
        await waitFor(() => {
            const uses = session.styles.get(nodes)?.set?.["node.shaders"] as { shader: string }[] | undefined;
            assert.isTrue(uses?.some((use) => use.shader === id) ?? false, "it is added");
        });
        await session.styles.settled();
        assert.isAbove(pixelsApart(plain, await picture(element)), 0, "it draws around the node");
    });
});
