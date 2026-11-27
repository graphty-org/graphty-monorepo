/**
 * Style panel v2's Find a setting on the REAL graphty-element, typed as a reader types: every result is headed by
 * the section and item the panel holds it in (ia-design section 2, E675), never by a heading the panel no longer
 * draws ("Border - Rings", "Ends - Target end").
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openProject, openStyle, switchView } from "./v2Harness";

/**
 * Types words in Find a setting and reads the result headings, after clearing what was typed before.
 * @param tab - the Style tab.
 * @param words - the words.
 * @returns the headings, in order.
 */
async function find(tab: HTMLElement, words: string): Promise<string[]> {
    const box = within(tab).getByRole("searchbox", { name: "Find a setting" });
    await userEvent.clear(box);
    await userEvent.type(box, words);
    return waitFor(() => {
        // The box is controlled: once it shows the words, the results drawn with it are theirs.
        assert.strictEqual((box as HTMLInputElement).value, words);
        const headings = [...tab.querySelectorAll<HTMLElement>("[data-find-results] [data-find-group]")].map(
            (group) => group.firstElementChild?.textContent ?? "",
        );
        assert.isNotEmpty(headings, `"${words}" finds something`);
        return headings;
    });
}

/**
 * The sections the panel draws while nothing is typed, by id ("node-effects").
 * @param tab - the Style tab.
 * @returns the ids.
 */
function sectionIds(tab: HTMLElement): Set<string> {
    return new Set(
        [...tab.querySelectorAll<HTMLElement>("[data-style-panel-v2] [data-section]")].map(
            (section) => section.dataset.section ?? "",
        ),
    );
}

/**
 * Checks every heading starts with a section the panel draws.
 * @param side - nodes or edges.
 * @param headings - the headings.
 * @param sections - the drawn sections' ids.
 */
function inDrawnSections(side: "node" | "edge", headings: readonly string[], sections: ReadonlySet<string>): void {
    for (const heading of headings) {
        const section = `${side}-${heading.split(" - ")[0].toLowerCase()}`;
        assert.isTrue(sections.has(section), `"${heading}" names a section the panel draws`);
    }
}

describe("Style panel v2's Find a setting", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("heads node results by the section and item the panel holds them in", async () => {
        await openProject();
        // In 2D, where a Plate is drawn: in 3D Find a setting leaves out what is drawn only in 2D.
        await switchView("2D");
        const tab = await openStyle("Key people");
        const sections = await waitFor(() => {
            const ids = sectionIds(tab);
            assert.isTrue(ids.has("node-effects"));
            return ids;
        });
        const highlight = await find(tab, "highlight");
        assert.include(highlight, "Effects - Ring");
        assert.notInclude(highlight, "Border - Rings");
        inDrawnSections("node", highlight, sections);
        const underlay = await find(tab, "underlay");
        assert.include(underlay, "Effects - Plate (Behind)");
        inDrawnSections("node", underlay, sections);
        inDrawnSections("node", await find(tab, "outline"), sections);
    });

    it("heads edge results by the section and item the panel holds them in", async () => {
        const { session } = await openProject();
        await session.data.addEdges([{ source: "a", target: "b" }]);
        await session.styles.add({
            name: "Links",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#228BE6" },
        });
        await session.styles.settled();
        const tab = await openStyle("Links");
        await showKind("edge");
        const sections = await waitFor(() => {
            const ids = sectionIds(tab);
            assert.isTrue(ids.has("edge-arrows"));
            return ids;
        });
        const outline = await find(tab, "outline");
        assert.isTrue(
            outline.some((heading) => heading.startsWith("Line - Outline")),
            `outline finds Line - Outline: ${outline.join(", ")}`,
        );
        assert.isFalse(
            outline.some((heading) => heading.startsWith("Ends")),
            "no result names the old Ends section",
        );
        inDrawnSections("edge", outline, sections);
        // Every band along the line is the Outline (C7): the underlay is its Under line, the overlay its Over line.
        const underlay = await find(tab, "underlay");
        assert.isTrue(
            underlay.some((heading) => heading.startsWith("Line - Outline")),
            `underlay finds Line - Outline: ${underlay.join(", ")}`,
        );
        inDrawnSections("edge", underlay, sections);
        const band = await find(tab, "band");
        assert.isTrue(
            band.some((heading) => heading.startsWith("Line - Outline")),
            `band finds Line - Outline: ${band.join(", ")}`,
        );
        const arrow = await find(tab, "target end");
        assert.include(arrow, "Arrows - Arrow (Target)");
        inDrawnSections("edge", arrow, sections);
        assert.isNull(screen.queryByText(/^Ends - /));
    });
});
