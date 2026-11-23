/**
 * Style panel v2's Image absorbs the old Fill kind Picture (ia-design 2), on the REAL graphty-element and real
 * clicks: Image's settings hold "Wrap around shape"; off, the picture is placed on the node (`node.image`), on, it
 * wraps over the 3D surface (`node.texture`) and the placing settings are dimmed, from graphty-element's own
 * `drawnWhen`; the picture on the canvas changes each way. Fill's Kind select lists no Picture.
 * Wrap around shape needs the node-models experiment (`node.texture` is its channel): review it at
 * ?features=file-styles,style-panel-v2,node-models.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import { choose } from "./modelHarness";
import {
    openAdvanced,
    openGraph,
    openKind,
    openStyle,
    picture,
    pixelsApart,
    sectionOf,
    switchView,
    written,
} from "./v2Harness";

/**
 * Waits for a thing's row in a section.
 * @param section - the section.
 * @param thing - the thing's id.
 * @returns the row.
 */
async function rowOf(section: HTMLElement, thing: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = section.querySelector<HTMLElement>(`[data-thing="${thing}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Opens a row's settings pop-over.
 * @param row - the row.
 * @param name - its settings button's name.
 * @returns the pop-over.
 */
async function openSettings(row: HTMLElement, name: string): Promise<HTMLElement> {
    await userEvent.click(within(row).getByRole("button", { name: new RegExp(`^${name}`) }));
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>("[data-thing-popover]");
        assert.isNotNull(found);
        return found;
    });
}

/**
 * The tooltip of a dimmed line (or of the dimmed row around it), or null when it is not dimmed.
 * @param element - the line.
 * @returns its tooltip words.
 */
function dimmed(element: Element): string | null {
    return element.closest("[data-dimmed]")?.getAttribute("title") ?? null;
}

describe("Style panel v2's Image wraps around the shape", () => {
    withFeatures(["file-styles", "style-panel-v2", "node-models"]);

    // E495: "+ Image" writes the chosen picture as an asset id, and graphty-element loaded `node.image` only from a
    // URL, so the placed picture never drew (E_IMAGE_LOAD) in either view.
    for (const view of ["2D", "3D"] as const) {
        it(`a picture chosen for "+ Image" draws on the node in ${view}`, async () => {
            const { session, element, nodes } = await openGraph();
            await session.styles.update(nodes, { set: { "node.color": "#E8590C", "node.size": 3 } });
            await session.styles.settled();
            await switchView(view);
            const tab = await openStyle("Key people");
            const before = await picture(element);
            const fill = sectionOf(tab, "node-fill");
            await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Image" }));
            const dialog = await screen.findByRole("dialog", { name: "Picture" });
            const file = new File([await (await fetch(colormapUrl)).arrayBuffer()], "colormap.png");
            await choose(dialog, "Choose picture", [file]);
            await waitFor(() => {
                assert.match(String(written(session, nodes, "node.image")), /^asset:/);
            });
            await userEvent.keyboard("{Escape}");
            await waitFor(async () => {
                assert.isAbove(pixelsApart(before, await picture(element)), 100, "the picture is drawn on the node");
            });
        });
    }

    it("Wrap around shape moves the picture from the node's plate to its 3D surface and back", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.color": "#E8590C", "node.shape": "box", "node.size": 3 } });
        await session.styles.settled();
        await switchView("3D");
        const tab = await openStyle("Key people");
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Image" }));
        const dialog = await screen.findByRole("dialog", { name: "Picture" });
        const file = new File([await (await fetch(colormapUrl)).arrayBuffer()], "colormap.png");
        await choose(dialog, "Choose picture", [file]);
        await waitFor(() => {
            assert.match(String(written(session, nodes, "node.image")), /^asset:/);
        });
        const asset = written(session, nodes, "node.image");
        const placed = await picture(element);

        const row = await rowOf(fill, "image");
        const pop = await openSettings(row, "Node image settings");
        // Wrap around shape is a rare setting: the pop-over's Advanced dialog's (design "Input rules").
        const wrap = await within(await openAdvanced(pop)).findByRole("checkbox", { name: "Wrap around shape" });
        assert.isFalse((wrap as HTMLInputElement).checked, "off: placed on the node");
        const fitLine = pop.querySelector('.ws-row[data-line="node.imageFit"]');
        assert.isNotNull(fitLine, "Fit");
        assert.isNull(dimmed(fitLine), "Fit draws while the picture is placed");
        await userEvent.click(wrap);
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.texture"), asset, "on: the same picture wraps");
            assert.isUndefined(written(session, nodes, "node.image"), "and is no longer placed");
        });
        const wrapped = await picture(element);
        assert.isAbove(pixelsApart(placed, wrapped), 0, "the picture moves from the plate to the surface");
        await waitFor(() => {
            const fit = pop.querySelector('.ws-row[data-line="node.imageFit"]');
            assert.isNotNull(fit);
            assert.equal(dimmed(fit), "Only when Wrap around shape is off", "placing settings dim while wrapped");
        });

        await userEvent.click(within(await openAdvanced(pop)).getByRole("checkbox", { name: "Wrap around shape" }));
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.image"), asset, "off again: placed");
            assert.isUndefined(written(session, nodes, "node.texture"));
        });
        // Escape closes the Advanced dialog, then the pop-over.
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");

        // The picture's one home is Image: Fill's Kind select lists no Picture.
        const list = await openKind(await rowOf(fill, "fill"), "Node fill");
        const members = within(list)
            .getAllByRole("option")
            .map((item) => item.textContent.trim());
        assert.deepEqual(members, ["Solid", "Gradient"]);
        await userEvent.keyboard("{Escape}");
    });
});
