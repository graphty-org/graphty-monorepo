/**
 * What a screen reader hears, on the REAL graphty-element: the analysis card's button names its
 * analysis ("Run Degree"); a color bound to data names each group's color in the box's own name; a
 * key section whose one row says its title is named once; a key swatch shows its color word on
 * hover.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../test/test-utils";
import { createWorkspaceStore } from "../state/store";
import { colorName } from "../style/words";
import { Workspace } from "../Workspace";

/** Three kinds of node, a few of each. */
const KINDS = ["agency", "company", "person"] as const;

/**
 * The workspace on nine nodes of three kinds, linked in a ring.
 * @returns the session.
 */
async function openScene(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Kinds", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    const ids = Array.from({ length: 9 }, (_, i) => `n${String(i)}`);
    await session.data.addNodes(ids.map((id, i) => ({ id, kind: KINDS[i % 3] })));
    await session.data.addEdges(ids.map((id, i) => ({ source: id, target: ids[(i + 1) % ids.length] })));
    await session.config.set({ startingRows: true, editableBase: true });
    await session.styles.settled();
    return session;
}

/**
 * Opens a layer's Style tab from the layer tree.
 * @param name - the layer's name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return screen.findByTestId("style-tab");
}

describe("screen-reader names on the real element", () => {
    it("names the analysis card's button after its analysis", async () => {
        await openScene();
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        await userEvent.click(within(toolbar).getByRole("button", { name: "Analyze" }));
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "Degree");
        await userEvent.click(await screen.findByRole("option", { name: /^Degree/ }));
        const run = await screen.findByRole("button", { name: "Run Degree" });
        // The name begins with what it shows, so a reader who says "click Run" still reaches it.
        assert.equal(run.textContent, "Run");
    });

    it("names each group's color in a box whose color varies by data", async () => {
        const session = await openScene();
        await session.styles.encode({ column: { kind: "node", name: "kind" }, channel: "node.color", name: "Kinds" });
        await session.styles.settled();
        const layer = session.styles.list().find((each) => each.name === "Kinds");
        const block = session.styles.legendOf(layer?.id ?? "").find((b) => b.channel === "node.color");
        const agency = block?.swatches.find((swatch) => swatch.label === "agency");
        assert.isDefined(agency?.color, "the element paints agency a color");
        const tab = await openStyle("Kinds");
        const box = await waitFor(() => within(tab).getByRole("button", { name: /^Node color: kind/ }));
        const name = box.getAttribute("aria-label") ?? "";
        assert.include(name, `agency ${colorName((agency?.color ?? "").slice(0, 7))}`, name);
        for (const kind of KINDS) {
            assert.include(name, kind, "every group is named");
        }
    });

    it("names a key section once, and a key swatch shows its color word on hover", async () => {
        const session = await openScene();
        await session.styles.add({
            name: "Poster",
            target: "node",
            selector: { match: "ids", nodes: ["n0", "n1", "n2"] },
            set: { "node.color": "#e69f00" },
        });
        await session.styles.settled();
        const legend = await screen.findByRole("region", { name: "Legend" });
        await within(legend).findByText("Color: Poster");
        const named = [...legend.querySelectorAll<HTMLElement>("*")].filter(
            (each) =>
                each.getAttribute("aria-label") === "Color: Poster" ||
                (each.childElementCount === 0 &&
                    each.textContent === "Color: Poster" &&
                    each.closest("[aria-hidden=true]") === null),
        );
        assert.lengthOf(named, 1, "one element carries the name");

        const chip = within(legend).getByRole("img", { name: colorName("#e69f00") });
        await userEvent.hover(chip);
        await waitFor(() => {
            assert.include(screen.getByRole("tooltip", { hidden: true }).textContent, colorName("#e69f00"));
        });
    });
});
