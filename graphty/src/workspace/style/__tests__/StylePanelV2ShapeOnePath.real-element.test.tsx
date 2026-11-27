/**
 * Style panel v2's Shape on the REAL graphty-element, by real clicks (owner, 2026-11-24: "There should only be one
 * path to any control"; design "Input rules", "Nesting"): the Shape list's Model... opens the Models gallery beside
 * the list, with no back button, and the gallery is the one way to the Load custom model dialog; picking the section
 * shown keeps its shapes listed; a model's Fallback shape line, in its pop-over only, sets the shape under it; and the model varies by data
 * from the Shape's one link, each value mapped to a model, never read as a web address.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { closeSettings, openProject, openStyle, sectionOf, settingsName } from "./v2Harness";

/**
 * The project with a basic shape on its layer, and its Style tab open.
 * @param set - more of the layer's values.
 * @returns the session, the layer and the Shape section.
 */
async function withShape(
    set: Readonly<Record<string, unknown>> = {},
): Promise<{ session: GraphSession; layer: string; shape: () => HTMLElement }> {
    const { session, id } = await openProject();
    await session.data.updateNodes([
        { id: "a", values: { kind: "server" } },
        { id: "b", values: { kind: "person" } },
        { id: "c", values: { kind: "server" } },
    ]);
    await session.styles.update(id, { set: { "node.color": "#E8590C", "node.shape": "box", ...set } });
    await session.styles.settled();
    const tab = await openStyle("Key people");
    return { session, layer: id, shape: () => sectionOf(tab, "node-shape") };
}

/**
 * Opens a model's settings pop-over from its row's "...", as a reader does.
 * @param row - the Shape row.
 * @returns the open pop-over, holding the model's own settings.
 */
async function openModelSettings(row: HTMLElement): Promise<HTMLElement> {
    const more = within(row).getByRole("button", { name: settingsName("Node shape") });
    await userEvent.hover(more);
    await userEvent.click(more);
    return waitFor(() => {
        const found = document.getElementById(more.getAttribute("aria-controls") ?? "");
        assert.isNotNull(found);
        assert.isNotNull(found.querySelector('[data-line="node.modelTint"]'), "the model's own settings");
        return found;
    });
}

/**
 * Opens the Shape row's drop-down on one section.
 * @param shape - the Shape section.
 * @param section - the section to show.
 * @returns the list's values.
 */
async function openSection(shape: HTMLElement, section: string): Promise<HTMLElement> {
    const list = await waitFor(() => {
        const found = shape.querySelector<HTMLElement>('[data-value-listbox="node.shape"]');
        assert.isNotNull(found, "the Shape list");
        return found;
    });
    await userEvent.click(list);
    await userEvent.click(await screen.findByRole("combobox", { name: "Node shape section" }));
    await userEvent.click(await screen.findByRole("option", { name: section }));
    return screen.findByRole("group", { name: "Node shape values" });
}

/**
 * The names of a list's options.
 * @param values - the list.
 * @returns the names.
 */
function optionNames(values: HTMLElement): string[] {
    return within(values)
        .queryAllByRole("option")
        .map((each) => each.textContent.trim());
}

describe("Style panel v2's Shape, one path to each value", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Model... opens the Models gallery beside the list, which stays open, and only the gallery adds a custom model", async () => {
        const { shape } = await withShape();
        const values = await openSection(shape(), "Models");
        const models = optionNames(values);
        assert.include(models, "Model...");
        assert.notInclude(models, "Custom model...", "the list has no second way to the custom model dialog");
        await userEvent.click(within(values).getByRole("option", { name: "Model..." }));
        const gallery = await screen.findByRole("dialog", { name: "Models" });
        // The list stays open under its own title, beside the gallery, never covered by it.
        const list = screen.getByRole("dialog", { name: "Node shape" });
        const a = list.getBoundingClientRect();
        const b = gallery.getBoundingClientRect();
        assert.isAbove(a.width, 0, "the list is still drawn");
        assert.isTrue(b.right <= a.left + 1 || b.left >= a.right - 1, "the gallery sits beside the list");
        assert.lengthOf(screen.queryAllByRole("button", { name: /^Back to / }), 0, "no back button");
        assert.isNotNull(within(gallery).queryByRole("button", { name: "Add custom model..." }));
        // Escape closes the gallery alone: the list is still there.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Models" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Node shape" }));
        await userEvent.keyboard("{Escape}");
    });

    it("picking the section shown again keeps its shapes listed", async () => {
        const { shape } = await withShape();
        const values = await openSection(shape(), "Models");
        const before = optionNames(values);
        assert.isAbove(before.length, 0);
        await userEvent.click(await screen.findByRole("combobox", { name: "Node shape section" }));
        await userEvent.click(await screen.findByRole("option", { name: "Models" }));
        await waitFor(() => {
            const now = screen.getByRole("group", { name: "Node shape values" });
            assert.deepEqual(optionNames(now), before, "the same shapes, not an empty list");
            assert.strictEqual(
                screen.getByRole<HTMLInputElement>("combobox", { name: "Node shape section" }).value,
                "Models",
            );
        });
        await userEvent.keyboard("{Escape}");
    });

    it("while a model draws, its Fallback shape line sets the shape under it and the model stays", async () => {
        const { session, layer, shape } = await withShape({ "node.model": "asset:sample/person" });
        const row = await waitFor(() => {
            const found = shape().querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found);
            assert.include(
                found.querySelector('[data-value-listbox="node.shape"]')?.getAttribute("aria-label") ?? "",
                "Person",
            );
            return found;
        });
        // The fallback shape is the model's advanced setting: never a line in the panel (owner, 2026-11-27).
        assert.isNull(within(shape()).queryByText("Fallback shape"), "no Fallback shape line under the row");
        const pop = await openModelSettings(row);
        assert.isNull(pop.querySelector('[data-line="node.model"]'), "no Model line repeats the row's drop-down");
        const fallback = pop.querySelector<HTMLElement>('[data-line="node.shape"]');
        assert.isNotNull(fallback, "the Fallback shape line");
        assert.include(fallback.textContent, "Fallback shape");
        await userEvent.click(within(fallback).getByRole("button", { name: /^Node shape,/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Diamond" }));
        await waitFor(() => {
            const set = session.styles.get(layer)?.set;
            assert.strictEqual(set?.["node.shape"], "diamond", "the shape under the model");
            assert.strictEqual(set?.["node.model"], "asset:sample/person", "the model stays");
        });
        await closeSettings();
    });

    it("a fixed model varies by data from the Shape's link, mapped value to model and never read as an address", async () => {
        const { session, layer, shape } = await withShape({ "node.model": "asset:sample/person" });
        const fixed = await waitFor(() => {
            const found = shape().querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found);
            return found;
        });
        // The link is the pop-over's Fallback shape line's: the panel draws no line for it.
        const fallback = (await openModelSettings(fixed)).querySelector<HTMLElement>('[data-line="node.shape"]');
        assert.isNotNull(fallback, "the Fallback shape line");
        const link = within(fallback).getByRole("button", { name: "Node shape by attribute" });
        await userEvent.hover(link);
        await userEvent.click(link);
        const which = await screen.findByRole("radiogroup", { name: "Which value" });
        const model = within(which).getByRole("radio", { name: "Model" });
        await userEvent.click(document.querySelector<HTMLElement>(`label[for="${model.id}"]`) ?? model);
        await userEvent.click(await screen.findByText("kind"));
        await waitFor(() => {
            const binding = session.styles.get(layer)?.encode?.["node.model"] as Record<string, unknown> | undefined;
            assert.strictEqual(binding?.by, "data.kind", "the model varies by kind");
            assert.strictEqual(binding?.unmapped, "skip", "a value draws a model only once it is mapped to one");
        });
        assert.lengthOf(session.network.pending(), 0, "no value of the data is asked about as a web address");
        await userEvent.keyboard("{Escape}");
        await closeSettings();
        const row = await waitFor(() => {
            const found = shape().querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found, "the row stays");
            assert.isNotNull(
                within(found).queryByRole("button", { name: /^Node model: kind/ }),
                "the row names what the model varies by",
            );
            return found;
        });
        // The pop-over holds no Model line repeating the row's binding.
        const pop = await openModelSettings(row);
        assert.isNull(pop.querySelector('[data-line="node.model"]'), "no Model line in the pop-over");
        await closeSettings();
        // Map one kind to a model from the binding's group list.
        await userEvent.click(within(row).getByRole("button", { name: /^Node model: kind/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^kind server model/ }));
        await userEvent.click(
            within(await screen.findByRole("dialog", { name: "Models" })).getByRole("button", { name: "Server" }),
        );
        await waitFor(() => {
            const binding = session.styles.get(layer)?.encode?.["node.model"] as
                { map?: Record<string, unknown> } | undefined;
            assert.deepEqual(binding?.map, { server: "asset:sample/server" });
        });
        assert.lengthOf(session.network.pending(), 0);
    });
});
