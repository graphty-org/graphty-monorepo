/**
 * Style panel v2's model varying by data on the REAL graphty-element, by real clicks: the model is bound from the
 * Fallback shape line's link in the model's pop-over; that line is never drawn under the row, and its by-data link has
 * one name; the bound row names as many groups as its group list holds; and each group row of that list reads as
 * words, with no "null" and no stray space.
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
 * Opens the Shape row's "..." pop-over, as a reader does.
 * @param shape - the Shape section, read afresh.
 * @returns the pop-over.
 */
async function openShapeSettings(shape: () => HTMLElement): Promise<HTMLElement> {
    const row = await waitFor(() => {
        const found = shape().querySelector<HTMLElement>('[data-thing="shape"]');
        assert.isNotNull(found, "the Shape row");
        return found;
    });
    const more = within(row).getByRole("button", { name: settingsName("Node shape") });
    await userEvent.hover(more);
    await userEvent.click(more);
    return waitFor(() => {
        const pop = document.getElementById(more.getAttribute("aria-controls") ?? "");
        assert.isNotNull(pop, "the Shape's pop-over");
        return pop;
    });
}

/**
 * The pop-over's Fallback shape line.
 * @param pop - the Shape's pop-over.
 * @returns the line.
 */
function fallbackLine(pop: HTMLElement): HTMLElement {
    const found = pop.querySelector<HTMLElement>('[data-line="node.shape"]');
    assert.isNotNull(found, "the pop-over's Fallback shape line");
    return found;
}

/**
 * Three nodes of two kinds (farm, shop) on a layer with a basic shape, the model bound to their kind from the Shape's
 * by-data link (on the model's pop-over's Fallback shape line), as a reader binds it.
 * @returns the session, the layer and the Shape section.
 */
async function modelByKind(): Promise<{ session: GraphSession; layer: string; shape: () => HTMLElement }> {
    const { session, id } = await openProject();
    await session.data.updateNodes([
        { id: "a", values: { kind: "farm" } },
        { id: "b", values: { kind: "shop" } },
        { id: "c", values: { kind: "farm" } },
    ]);
    await session.styles.update(id, { set: { "node.shape": "box", "node.model": "asset:sample/person" } });
    await session.styles.settled();
    const tab = await openStyle("Key people");
    const shape = (): HTMLElement => sectionOf(tab, "node-shape");
    const fixed = await openShapeSettings(shape);
    const link = await waitFor(() =>
        within(fallbackLine(fixed)).getByRole("button", { name: "Node shape by attribute" }),
    );
    await userEvent.hover(link);
    await userEvent.click(link);
    const which = await screen.findByRole("radiogroup", { name: "Which value" });
    const model = within(which).getByRole("radio", { name: "Model" });
    await userEvent.click(document.querySelector<HTMLElement>(`label[for="${model.id}"]`) ?? model);
    await userEvent.click(await screen.findByText("kind"));
    await waitFor(() => {
        const binding = session.styles.get(id)?.encode?.["node.model"] as Record<string, unknown> | undefined;
        assert.strictEqual(binding?.by, "data.kind");
    });
    await userEvent.keyboard("{Escape}");
    await closeSettings();
    return { session, layer: id, shape };
}

describe("Style panel v2's model by data", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("the Fallback shape line is in the pop-over only, its by-data link named once", async () => {
        const { shape } = await modelByKind();
        // The fallback shape is the model's advanced setting: never a line in the panel (owner, 2026-11-27).
        assert.isNull(within(shape()).queryByText("Fallback shape"), "no Fallback shape line under the row");
        const pop = await openShapeSettings(shape);
        const fallback = await waitFor(() => fallbackLine(pop));
        assert.deepEqual(
            within(fallback)
                .queryAllByRole("button", { name: / by attribute$/ })
                .map((button) => button.getAttribute("aria-label") ?? ""),
            ["Node shape by attribute"],
        );
        await closeSettings();
    });

    it("the bound row names the groups its list holds", async () => {
        const { shape } = await modelByKind();
        await waitFor(() => {
            within(shape()).getByRole("button", { name: /^Node model: kind, 2 groups/ });
        });
    });

    it("each group row of the list reads as words, with no null and no space before a comma", async () => {
        const { shape } = await modelByKind();
        await userEvent.click(await waitFor(() => within(shape()).getByRole("button", { name: /^Node model: kind/ })));
        const pop = await screen.findByRole("dialog", { name: "Model by kind" });
        const rows = await waitFor(() => {
            const found = within(pop).getAllByRole("row").slice(1);
            assert.lengthOf(found, 2);
            return found;
        });
        assert.deepEqual(
            rows.map((row) => row.getAttribute("aria-label")),
            ["farm, 2 nodes", "shop, 1 node"],
        );
        within(rows[0]).getByRole("gridcell", { name: "farm, 2 nodes" });
        within(rows[1]).getByRole("gridcell", { name: "shop, 1 node" });
        await userEvent.keyboard("{Escape}");
    });
});
