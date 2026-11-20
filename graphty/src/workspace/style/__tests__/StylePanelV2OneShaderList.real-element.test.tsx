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
                .filter((each) => each.origin === "element" && each.place !== "replace" && each.place !== "group");
            assert.isNotEmpty(builtIns);
            for (const builtIn of builtIns) {
                assert.include(tiles, builtIn.id, `${builtIn.id} is in the ${kind} list`);
            }
            for (const { id, place } of ids[kind]) {
                if (place === "replace") {
                    assert.notInclude(tiles, id, "a replace shader is the Shape menu's");
                } else {
                    assert.include(tiles, id, `the custom ${place} shader is in the same ${kind} list`);
                }
            }
            await userEvent.keyboard("{Escape}");
        }
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
