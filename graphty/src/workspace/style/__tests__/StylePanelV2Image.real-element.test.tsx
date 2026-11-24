/**
 * Style panel v2's Image absorbs the old Fill kind Picture (ia-design 2), on the REAL graphty-element and real
 * clicks: Image's pop-over starts with On node and Wrapped tabs; On node places the picture on the node
 * (`node.image`), Wrapped wraps it over the 3D surface (`node.texture`) and the placing settings leave the pop-over,
 * from graphty-element's own `drawnWhen`; the picture on the canvas changes each way. Fill's tabs list no Picture.
 * A label's image is the same Picture field and pop-over, and graphty-element draws the picked picture.
 * Wrapped needs the node-models experiment (`node.texture` is its channel): review it at
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
    closeSettings,
    openGraph,
    openGroup,
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

    it("the Wrapped tab moves the picture from the node's plate to its 3D surface and back", async () => {
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
        // On node or Wrapped is the pop-over's tab strip, its first row (design "Input rules", "Tabs").
        const stripTab = async (name: string): Promise<HTMLInputElement> => {
            const strip = await waitFor(() => {
                const found = pop.querySelector<HTMLElement>("[data-strip]");
                assert.isNotNull(found, "the tab strip");
                return found;
            });
            return within(strip).getByRole<HTMLInputElement>("radio", { name });
        };
        const click = async (radio: HTMLInputElement): Promise<void> => {
            await userEvent.click(pop.querySelector<HTMLElement>(`label[for="${radio.id}"]`) ?? radio);
        };
        assert.isTrue((await stripTab("On node")).checked, "placed on the node");
        const fitLine = pop.querySelector('.ws-row[data-line="node.imageFit"]');
        assert.isNotNull(fitLine, "Fit");
        assert.isNull(dimmed(fitLine), "Fit draws while the picture is placed");
        await click(await stripTab("Wrapped"));
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.texture"), asset, "Wrapped: the same picture wraps");
            assert.isUndefined(written(session, nodes, "node.image"), "and is no longer placed");
        });
        const wrapped = await picture(element);
        assert.isAbove(pixelsApart(placed, wrapped), 0, "the picture moves from the plate to the surface");
        await waitFor(() => {
            assert.isNull(
                pop.querySelector('.ws-row[data-line="node.imageFit"]'),
                "placing settings leave the Wrapped tab",
            );
        });

        await click(await stripTab("On node"));
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.image"), asset, "On node again: placed");
            assert.isUndefined(written(session, nodes, "node.texture"));
        });
        await closeSettings();

        // The picture's one home is Image: Fill's tabs list no Picture.
        const fillPop = await openSettings(await rowOf(fill, "fill"), "Node fill settings");
        const strip = await waitFor(() => {
            const found = fillPop.querySelector<HTMLElement>("[data-strip]");
            assert.isNotNull(found, "the Fill's tabs");
            return found;
        });
        const members = within(strip)
            .getAllByRole("radio")
            .map((radio) => strip.querySelector(`label[for="${radio.id}"]`)?.textContent.trim() ?? "");
        assert.deepEqual(members, ["Solid", "Linear", "Radial"]);
        await closeSettings();
    });

    it("a label's image is picked from the Picture pop-over, reads None before, and is drawn", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { ...session.styles.get(nodes)?.set, "node.label": "Hi" } });
        await session.styles.settled();
        await switchView("2D");
        const tab = await openStyle("Key people");
        const row = await rowOf(sectionOf(tab, "node-text"), "label");
        const pop = await openSettings(row, "Node label settings");
        const advanced = await openGroup(pop, "Icon and image");
        const field = await waitFor(() => {
            const found = advanced.querySelector<HTMLInputElement>('[data-line="node.labelStyle.image"] input');
            assert.isNotNull(found, "the Label image field");
            return found;
        });
        assert.equal(field.value, "None", "no picture reads None");
        const before = await picture(element);
        await userEvent.click(field);
        const dialog = await screen.findByRole("dialog", { name: "Picture" });
        const file = new File([await (await fetch(colormapUrl)).arrayBuffer()], "colormap.png");
        await choose(dialog, "Choose picture", [file]);
        await waitFor(() => {
            const style = written(session, nodes, "node.labelStyle") as { image?: string } | undefined;
            assert.match(String(style?.image), /^asset:/, "the label's image names the picked picture");
        });
        await session.styles.settled();
        // graphty-element loads an image asset named by a label from its bytes.
        await waitFor(async () => {
            assert.isAbove(pixelsApart(before, await picture(element)), 0, "the label draws its picture");
        });
        // Focus is back on the field, so Escape closes its group pop-over, then the pop-over.
        assert.strictEqual(document.activeElement, field, "focus is back on the Label image field");
        await closeSettings();
    });
});
