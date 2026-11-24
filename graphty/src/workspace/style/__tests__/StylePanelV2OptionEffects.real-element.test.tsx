/**
 * Style panel v2 on the REAL graphty-element, driven by real clicks (E495: every option of every style works): an
 * option that would change nothing is never offered as if it did. An unset choice shows the value drawn now, so
 * picking it is never mistaken for an option that does nothing; a value graphty-element draws only in the other
 * view (`valueViews`), a Combine over a 2D-only value
 * in 3D and a node depth in 2D (`drawnWhen`) are each dimmed from graphty-element's own facts; and a border's
 * Center and Inside move the ring on a solid drawn at its own proportions (the default icosphere), as on a flat shape.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import {
    openGraph,
    openGroup,
    openProject,
    openStyle,
    picture,
    pixelsApart,
    sectionOf,
    switchView,
    written,
} from "./v2Harness";

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

    it("the Size pop-over shows the drawn choice, names its unit, and dims Pivot and Depth where they draw nothing", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, { set: { "node.color": "#E8590C", "node.size": 2 } });
        await session.styles.settled();
        await switchView("2D");
        const tab = await openStyle("Key people");
        const pop = await openSettings(sectionOf(tab, "node-shape"), "size", "Node size settings");

        // Unset, the mode and the unit show what is drawn: graphty-element's defaults, Scale and Graph.
        const graph = within(
            within(pop).getByRole("radiogroup", { name: "Node size space" }),
        ).getByRole<HTMLInputElement>("radio", {
            name: "Graph",
        });
        assert.isTrue(graph.checked, "Graph, the default, is the unit shown");
        // Words alone say nothing of what they choose: the line's name is shown above them (owner's input rules).
        assert.strictEqual(
            pop.querySelector('[data-line="node.sizeSpace"] .cm-legend-text')?.textContent,
            "Unit",
            "Graph | Pivot | Screen is named",
        );

        // Pivot draws only in 3D (valueViews); the size beneath is 1, so x1 over it is Set.
        assert.equal(optionDim(pop, "Node size space", "Pivot"), "3D only");
        assert.isUndefined(optionDim(pop, "Node size space", "Screen"));
        // What a number does with the value underneath is chosen in the link dialog only (owner, 2026-11-23).
        assert.isNull(within(pop).queryByRole("radiogroup", { name: "Combine" }), "no Combine on a plain size");
        // The mode and the depth are the Extents group's, opened beside from the "..." menu (design "Input rules").
        const advanced = await openGroup(pop, "Extents");
        const scale = within(
            within(advanced).getByRole("radiogroup", { name: "Node size mode" }),
        ).getByRole<HTMLInputElement>("radio", {
            name: "Scale",
        });
        assert.isTrue(scale.checked, "Scale, the default, is the mode shown");
        // Uniform draws the default icosphere at the extent Scale draws it at already (valueDrawn).
        assert.match(optionDim(advanced, "Node size mode", "Uniform") ?? "", /^Only when /);
        assert.isUndefined(optionDim(advanced, "Node size mode", "Diameter"));
        assert.equal(lineDim(advanced, "node.depth"), "3D only");
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");

        await switchView("3D");
        const again = await openSettings(sectionOf(tab, "node-shape"), "size", "Node size settings");
        assert.isUndefined(optionDim(again, "Node size space", "Pivot"), "Pivot draws in 3D");
        assert.isUndefined(lineDim(await openGroup(again, "Extents"), "node.depth"), "so does depth");
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");

        // A box is drawn at its own extent under Scale: Uniform changes it.
        await session.styles.update(id, { set: { "node.color": "#E8590C", "node.size": 2, "node.shape": "box" } });
        await session.styles.settled();
        const box = await openSettings(sectionOf(tab, "node-shape"), "size", "Node size settings");
        assert.isUndefined(
            optionDim(await openGroup(box, "Extents"), "Node size mode", "Uniform"),
            "Uniform draws a box anew",
        );
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
    });

    it("Wireframe and Visibility rows are named, as every input is (owner's input rules)", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, {
            set: { "node.color": "#E8590C", "node.wireframe": true, "node.visible": true },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const effects = sectionOf(tab, "node-effects");
        await waitFor(() => {
            for (const [thing, name] of [
                ["wireframe", "Wireframe"],
                ["visibility", "Visibility"],
            ] as const) {
                const row = effects.querySelector(`[data-thing="${thing}"]`);
                assert.isNotNull(row, thing);
                assert.strictEqual(row?.querySelector(".cm-legend-text")?.textContent, name);
            }
        });
    });

    it("a raised edge's Combine is dimmed in 3D with the raised edge itself", async () => {
        const { session, id } = await openProject();
        // A raised edge is a flat bevel: on a flat shape, drawn in 2D only.
        // Combined with what lies beneath: only a combine already written shows its Combine line.
        await session.styles.update(id, {
            set: { "node.color": "#E8590C", "node.shape": "rectangle" },
            encode: { "node.raisedBorderWidth": { value: 0.2, combine: "add" } },
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

    it("force curves with only a unit set show the Unit scale drawn, and dim the unit once Drawing is picked", async () => {
        const { session, edges } = await openGraph();
        await session.styles.update(edges, {
            set: {
                "edge.color": "#E8590C",
                "edge.curvature": true,
                "edge.supportModel": "barnesHut",
                "edge.supportUnit": 2,
            },
        });
        await session.styles.settled();
        await openStyle("Links");
        await showKind("edge");
        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(await within(tab).findByRole("button", { name: /^Edge force curves settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        // graphty-element draws a unit scale once a unit is set and the scale is not (drawnDefault). The scale and the
        // unit are lines of the pop-over.
        const curve = pop;
        const scale = within(curve).getByRole("radiogroup", { name: "Edge support scale" });
        const unit = within(scale).getByRole<HTMLInputElement>("radio", { name: "Unit" });
        assert.isTrue(unit.checked, "Unit, what is drawn, is the scale shown");
        assert.isUndefined(lineDim(curve, "edge.supportUnit"), "the unit draws");

        const drawing = within(scale).getByRole<HTMLInputElement>("radio", { name: "Drawing" });
        await userEvent.click(drawing.labels?.[0] ?? drawing);
        await waitFor(() => {
            assert.strictEqual(written(session, edges, "edge.supportScale"), "drawing");
        });
        // The unit size draws only for a Unit scale, so it leaves the pop-over (design "Input rules", "Tabs").
        await waitFor(() => {
            assert.isNull(pop.querySelector('.ws-row[data-line="edge.supportUnit"]'));
        });
        await userEvent.keyboard("{Escape}");
    });

    it("Fit to label is dimmed on nodes with no label, and offered once the label varies by data", async () => {
        const { session, id } = await openProject();
        // A Size row, whose settings hold Fit to label.
        await session.styles.update(id, { set: { "node.color": "#E8590C", "node.size": 2 } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        // Fit to label is a group of the "..." menu, its Fit line dimmed while it draws nothing: what it waits on (a
        // label) is not set in this pop-over.
        const fitItem = async (): Promise<string | null> => {
            const pop = await openSettings(sectionOf(tab, "node-shape"), "size", "Node size settings");
            const title = lineDim(await openGroup(pop, "Fit to label"), "node.labelFit") ?? null;
            await userEvent.keyboard("{Escape}");
            await userEvent.keyboard("{Escape}");
            return title;
        };
        assert.match((await fitItem()) ?? "", /^Only when .*Label.* is set$/i, "no label, nothing to fit");

        // A label bound to the node id, picked from the Text "+" as a reader does.
        const text = sectionOf(tab, "node-text");
        const plus = text.querySelector<HTMLElement>("[data-plus]");
        assert.isNotNull(plus);
        await userEvent.click(plus);
        await userEvent.click(await screen.findByRole("menuitem", { name: "Label" }));
        const list = await screen.findByRole("group", { name: "Node label" });
        await userEvent.click(await within(list).findByRole("option", { name: /^Node id(,|$)/ }));
        await waitFor(() => {
            assert.isNotNull(text.querySelector('[data-thing="label"]'));
        });
        await userEvent.keyboard("{Escape}");
        assert.isNull(await fitItem(), "a label bound to data is a label to fit");
    });

    it("a border's Wave line appears once the border is a zigzag or a sinewave", async () => {
        const { session, nodes } = await openGraph();
        const waves = async (): Promise<boolean> => {
            const tab = await openStyle("Key people");
            const pop = await openSettings(sectionOf(tab, "node-effects"), "border", "Node border settings");
            // The Style line is in the same pop-over: a line it rules out appears once it applies.
            await waitFor(() => {
                assert.isNotNull(pop.querySelector('.ws-row[data-line="node.borderStyle"]'), "the pop-over is drawn");
            });
            const shown = pop.querySelector('.ws-row[data-line="node.borderWaveAmplitude"]') !== null;
            await userEvent.keyboard("{Escape}");
            return shown;
        };
        const border = { "node.color": "#E8590C", "node.borderColor": "#000000", "node.borderWidth": 0.4 };
        await session.styles.update(nodes, { set: border });
        await session.styles.settled();
        assert.isFalse(await waves(), "a solid border draws no wave");
        await session.styles.update(nodes, { set: { ...border, "node.borderStyle": "zigzag" } });
        await session.styles.settled();
        assert.isTrue(await waves(), "a zigzag border draws its wave");
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
            const pop = await openSettings(sectionOf(tab, "node-effects"), "border", "Node border settings");
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
