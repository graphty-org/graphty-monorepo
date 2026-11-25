/**
 * Style panel v2's model varying by data on the REAL graphty-element, by real clicks: right after the model is bound
 * from the Shape's link, every by-data link of the Fallback shape line has one name; the bound row names as many
 * groups as its group list holds; and each group row of that list reads as words, with no "null" and no stray space.
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
 * Three nodes of two kinds (farm, shop) on a layer with a basic shape, the model bound to their kind from the Shape's
 * by-data link, as a reader binds it.
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
    const link = await waitFor(() => within(shape()).getByRole("button", { name: "Node shape by attribute" }));
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
    return { session, layer: id, shape };
}

describe("Style panel v2's model by data", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("the Fallback shape line's by-data link has the pop-over's name under the row", async () => {
        const { shape } = await modelByKind();
        const under = await waitFor(() => {
            const found = shape().querySelector<HTMLElement>('[data-line="node.shape"]');
            assert.isNotNull(found, "the Fallback shape line under the row");
            return found;
        });
        const names = (root: HTMLElement): string[] =>
            within(root)
                .queryAllByRole("button", { name: / by attribute$/ })
                .map((button) => button.getAttribute("aria-label") ?? "");
        assert.deepEqual(names(under), ["Node shape by attribute"]);
        const row = shape().querySelector<HTMLElement>('[data-thing="shape"]');
        assert.isNotNull(row);
        const more = within(row).getByRole("button", { name: settingsName("Node shape") });
        await userEvent.hover(more);
        await userEvent.click(more);
        const fallback = await waitFor(() => {
            const pop = document.getElementById(more.getAttribute("aria-controls") ?? "");
            const found = pop?.querySelector<HTMLElement>('[data-line="node.shape"]') ?? null;
            assert.isNotNull(found, "the pop-over's Fallback shape line");
            return found;
        });
        assert.deepEqual(names(fallback), names(under), "the line under the row repeats the pop-over's, word for word");
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
