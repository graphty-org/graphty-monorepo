/**
 * Style panel v2's "..." on the REAL graphty-element, driven by real clicks (design/ui/style-panel-v2/design.md,
 * 2.6 "Only when there is more", owner 2026-11-27: "a style setting should only have an advanced button if it has
 * more settings to show"): a row whose pop-over would only repeat its panel lines (Visibility) has no "..." and
 * carries its by-data link on its own line; every row that keeps a "..." opens a pop-over holding something the
 * panel does not show.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { closeSettings, moreButton, openGraph, openStyle, sectionOf, switchView } from "./v2Harness";

/** Each tab's Effects "+" items swept here, in each view: Shader opens its gallery instead of a row. */
const SWEPT = {
    node: {
        "2D": ["Border", "Visibility", "Ring", "Glow", "Drop shadow", "Raised edge", "Plate"],
        "3D": ["Wireframe"],
    },
    edge: { "2D": ["Visibility", "Animation"], "3D": [] },
} as const;

/**
 * The lines an element draws, by channel.
 * @param scope - the row and its lines, or the pop-over.
 * @returns their channels.
 */
function linesIn(scope: Element): string[] {
    return [...scope.querySelectorAll<HTMLElement>(".ws-row[data-line]")].map((line) => line.dataset.line ?? "");
}

/**
 * Adds an Effects "+" item by real clicks and returns its new row.
 * @param tab - the Style tab.
 * @param side - node or edge.
 * @param item - the "+" item.
 * @returns the row, with any pop-over "+" opened closed again.
 */
async function addEffect(tab: HTMLElement, side: "node" | "edge", item: string): Promise<HTMLElement> {
    const effects = sectionOf(tab, `${side}-effects`);
    const before = new Set(effects.querySelectorAll("[data-thing]"));
    await userEvent.click(within(effects).getByRole("button", { name: new RegExp(`^Add to ${side} effects`) }));
    await userEvent.click(await screen.findByRole("menuitem", { name: item }));
    const row = await waitFor(() => {
        const found = [...effects.querySelectorAll<HTMLElement>("[data-thing]")].find((each) => !before.has(each));
        assert.isDefined(found, `${item}'s row`);
        return found;
    });
    if (document.querySelector("[data-thing-popover]") !== null) {
        await closeSettings();
    }
    return row;
}

describe("Style panel v2's '...' only where there is more", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const side of ["node", "edge"] as const) {
        it(`${side} Visibility has no '...' and its link is on its row`, async () => {
            await openGraph();
            const tab = await openStyle(side === "node" ? "Key people" : "Links");
            await showKind(side);
            const row = await addEffect(tab, side, "Visibility");
            const line = await waitFor(() => {
                const found = row.querySelector<HTMLElement>(`.ws-row[data-line="${side}.visible"]`);
                assert.isNotNull(found, "the Visibility line");
                return found;
            });
            assert.isNull(within(row).queryByRole("button", { name: /settings/i }), "no '...'");
            assert.isNotNull(line.querySelector("button svg.lucide-link-2"), "the by-data link is on the row's line");
            assert.isNull(document.querySelector("[data-thing-popover]"), "no pop-over opened");
        });
    }

    it("every Effects row that keeps a '...' opens a pop-over with more than its panel lines", async () => {
        await openGraph();
        for (const view of ["2D", "3D"] as const) {
            await switchView(view);
            for (const side of ["node", "edge"] as const) {
                const tab = await openStyle(side === "node" ? "Key people" : "Links");
                await showKind(side);
                for (const item of SWEPT[side][view]) {
                    const row = await addEffect(tab, side, item);
                    const settings = within(row).queryByRole("button", { name: /settings/i });
                    if (settings === null) {
                        continue;
                    }
                    await userEvent.click(settings);
                    const pop = await waitFor(() => {
                        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
                        assert.isNotNull(found);
                        return found;
                    });
                    const panel = new Set(linesIn(row));
                    const more =
                        linesIn(pop).some((channel) => !panel.has(channel)) ||
                        moreButton(pop) !== null ||
                        pop.querySelector("[data-strip], [data-member-menu], [data-kind-menu]") !== null;
                    assert.isTrue(
                        more,
                        `${view} ${side} ${item}: the pop-over (${linesIn(pop).join(", ")}) only repeats the panel`,
                    );
                    await closeSettings();
                }
            }
        }
    });
});
