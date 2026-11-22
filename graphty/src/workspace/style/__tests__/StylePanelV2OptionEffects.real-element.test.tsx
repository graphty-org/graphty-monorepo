/**
 * Style panel v2 on the REAL graphty-element, driven by real clicks (E495: every option of every style works): an
 * option that would change nothing is never offered as if it did. An unset choice shows the value drawn now, so
 * picking it is never mistaken for an option that does nothing; a value graphty-element draws only in the other
 * view (`valueViews`), a Combine mode that paints what Replace does (`combineDrawn`), a Combine over a 2D-only value
 * in 3D and a node depth in 2D (`drawnWhen`) are each dimmed from graphty-element's own facts; and a border's
 * Center and Inside move the ring on a solid drawn at its own proportions (the default icosphere), as on a flat shape.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openProject, openStyle, picture, pixelsApart, sectionOf, switchView } from "./v2Harness";

/**
 * Waits for a thing's row in a section and opens its settings pop-over.
 * @param section - the section.
 * @param thing - the thing's id.
 * @param name - the settings button's name.
 * @returns the pop-over.
 */
async function openSettings(section: HTMLElement, thing: string, name: string): Promise<HTMLElement> {
    const row = await waitFor(() => {
        const found = section.querySelector<HTMLElement>(`[data-thing="${thing}"]`);
        assert.isNotNull(found, thing);
        return found;
    });
    // A pop-over closed with Escape just before is gone first, so the one found is the one opened here.
    await waitFor(() => {
        assert.isNull(document.querySelector("[data-thing-popover]"));
    });
    await userEvent.click(within(row).getByRole("button", { name: new RegExp(`^${name}`) }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Why a segment is dimmed: its label's tooltip, or undefined when it is not.
 * @param pop - the pop-over.
 * @param group - the segments' name.
 * @param option - the option's name.
 * @returns the tooltip words.
 */
function optionDim(pop: HTMLElement, group: string, option: string): string | undefined {
    const radio = within(within(pop).getByRole("radiogroup", { name: group })).getByRole("radio", { name: option });
    const label = (radio as HTMLInputElement).labels?.[0];
    return label?.querySelector("[data-dimmed]")?.getAttribute("title") ?? undefined;
}

/**
 * Why a line is dimmed: its tooltip, or undefined when it is not.
 * @param pop - the pop-over.
 * @param line - the line's `data-line`.
 * @returns the tooltip words.
 */
function lineDim(pop: HTMLElement, line: string): string | undefined {
    const found = pop.querySelector<HTMLElement>(`[data-line="${line}"]`);
    assert.isNotNull(found, line);
    return found.closest("[data-dimmed]")?.getAttribute("title") ?? undefined;
}

describe("Style panel v2: options that would change nothing", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("the Size pop-over shows the drawn choice and dims Pivot, Multiply and Depth where they draw nothing", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, { set: { "node.color": "#E8590C", "node.size": 2 } });
        await session.styles.settled();
        await switchView("2D");
        const tab = await openStyle("Key people");
        const pop = await openSettings(sectionOf(tab, "node-shape"), "size", "Node size settings");

        // Unset, the mode and the unit show what is drawn: graphty-element's defaults, Scale and Graph.
        const scale = within(
            within(pop).getByRole("radiogroup", { name: "Node size mode" }),
        ).getByRole<HTMLInputElement>("radio", {
            name: "Scale",
        });
        assert.isTrue(scale.checked, "Scale, the default, is the mode shown");
        const graph = within(
            within(pop).getByRole("radiogroup", { name: "Node size space" }),
        ).getByRole<HTMLInputElement>("radio", {
            name: "Graph",
        });
        assert.isTrue(graph.checked, "Graph, the default, is the unit shown");

        // Pivot draws only in 3D (valueViews); the size beneath is 1, so x1 over it is Replace.
        assert.equal(optionDim(pop, "Node size space", "Pivot"), "3D only");
        assert.isUndefined(optionDim(pop, "Node size space", "Screen"));
        assert.match(optionDim(pop, "Combine", "Multiply") ?? "", /^Same as Replace over a .+ of 1$/);
        assert.isUndefined(optionDim(pop, "Combine", "Add"), "Add adds to the size beneath");
        assert.equal(lineDim(pop, "node.depth"), "3D only");
        await userEvent.keyboard("{Escape}");

        await switchView("3D");
        const again = await openSettings(sectionOf(tab, "node-shape"), "size", "Node size settings");
        assert.isUndefined(optionDim(again, "Node size space", "Pivot"), "Pivot draws in 3D");
        assert.isUndefined(lineDim(again, "node.depth"), "so does depth");
        await userEvent.keyboard("{Escape}");
    });

    it("a raised edge's Combine is dimmed in 3D with the raised edge itself", async () => {
        const { session, id } = await openProject();
        // A raised edge is a flat bevel: on a flat shape, drawn in 2D only.
        await session.styles.update(id, {
            set: { "node.color": "#E8590C", "node.shape": "rectangle", "node.raisedBorderWidth": 0.2 },
        });
        await session.styles.settled();
        await switchView("3D");
        const tab = await openStyle("Key people");
        const pop = await openSettings(sectionOf(tab, "node-effects"), "raised", "Node raised edge settings");
        assert.equal(lineDim(pop, "combine:node.raisedBorderWidth"), "2D only");
        await userEvent.keyboard("{Escape}");
        await switchView("2D");
        const again = await openSettings(sectionOf(tab, "node-effects"), "raised", "Node raised edge settings");
        assert.isUndefined(lineDim(again, "combine:node.raisedBorderWidth"), "drawn in 2D");
        await userEvent.keyboard("{Escape}");
        assert.isNull(screen.queryByRole("menu"));
    });

    for (const view of ["2D", "3D"] as const) {
        it(`a border's Center and Inside each move the ring on the default sphere in ${view}`, async () => {
            const { session, element, nodes } = await openGraph();
            await session.styles.update(nodes, {
                set: {
                    "node.color": "#E8590C",
                    "node.size": 3,
                    "node.borderColor": "#000000",
                    "node.borderWidth": 0.4,
                },
            });
            await session.styles.settled();
            await switchView(view);
            const tab = await openStyle("Key people");
            const pop = await openSettings(sectionOf(tab, "node-border"), "border", "Node border settings");
            const group = within(pop).getByRole("radiogroup", { name: "Node border position" });
            let before = await picture(element);
            for (const option of ["Center", "Inside"]) {
                const radio = within(group).getByRole<HTMLInputElement>("radio", { name: option });
                const label = radio.labels?.[0];
                assert.isDefined(label, option);
                await userEvent.click(label ?? radio);
                await session.styles.settled();
                const after = await picture(element);
                assert.isAbove(pixelsApart(before, after), 50, `${option} moves the ring in ${view}`);
                before = after;
            }
            await userEvent.keyboard("{Escape}");
        });
    }
});
