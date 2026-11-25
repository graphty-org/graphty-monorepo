/**
 * Style panel v2's list things on the REAL graphty-element, driven by real clicks and typing: Stripes, Pie
 * and Chart added from Fill's "+" draw at once (two items, each unlike the other and the node's color, in
 * 3D and 2D), and a layer over a pie the layers beneath draw shows that pie and writes one slice alone.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { readChannelList } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openGroup, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/** How near (by RGB distance) a pixel must be to count as drawn in a color. */
const NEAR = 90;

/**
 * The share of a node's disk drawn near a color.
 * @param image - the picture.
 * @param element - the element, for where the node is.
 * @param node - the node.
 * @param color - the color, as #RRGGBB.
 * @returns the share, 0 to 1.
 */
function shareNear(
    image: ImageData,
    element: HTMLElementTagNameMap["graphty-element"],
    node: string,
    color: string,
): number {
    const at = element.nodeScreenPosition(node);
    assert.isTrue(at?.visible, `${node} is on screen`);
    const scale = image.width / element.clientWidth;
    const cx = (at?.x ?? 0) * scale;
    const cy = (at?.y ?? 0) * scale;
    const r = (at?.radius ?? 0) * scale * 0.9;
    const [tr, tg, tb] = [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16));
    let near = 0;
    let all = 0;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
        for (let x = Math.floor(cx - r); x <= cx + r; x++) {
            if (Math.hypot(x - cx, y - cy) > r || x < 0 || y < 0 || x >= image.width || y >= image.height) {
                continue;
            }
            const i = (y * image.width + x) * 4;
            all++;
            if (Math.hypot(image.data[i] - tr, image.data[i + 1] - tg, image.data[i + 2] - tb) < NEAR) {
                near++;
            }
        }
    }
    return all === 0 ? 0 : near / all;
}

describe("Style panel v2's list things", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const { name, channel } of [
        { name: "Stripes", channel: "node.stripeColors" },
        { name: "Pie", channel: "node.pieColors" },
    ] as const) {
        it(`${name} starts with two colors unlike the node's, and both draw on the node in 3D and 2D`, async () => {
            const { session, element, nodes } = await openGraph();
            const tab = await openStyle("Key people");
            await session.layout.setDimension("3d");
            const fill = sectionOf(tab, "node-fill");
            await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
            await userEvent.click(await screen.findByRole("menuitem", { name }));
            const colors = await waitFor(() => {
                const found = readChannelList(channel, written(session, nodes, channel)).map(String);
                assert.isAtLeast(found.length, 2, `${name} starts with two items`);
                return found;
            });
            await userEvent.keyboard("{Escape}");
            const node = String(written(session, nodes, "node.color")).toUpperCase();
            assert.notInclude(
                colors.map((color) => color.toUpperCase()),
                node,
                "no item has the node's color",
            );
            assert.notEqual(colors[0].toUpperCase(), colors[1].toUpperCase(), "the two items differ");
            for (const dimension of ["3d", "2d"] as const) {
                await session.layout.setDimension(dimension);
                const image = await picture(element);
                for (const color of colors.slice(0, 2)) {
                    assert.isAbove(shareNear(image, element, "a", color), 0.05, `${color} draws on a in ${dimension}`);
                }
            }
        });
    }

    // E495: a share is a part of the whole graphty-element caps at what is left, so it reads and types as a percent;
    // a share typed as a plain number above 1 took the whole node and hid every item after it.
    it("a stripe's share types as a percent of the node, and the stripe after it keeps the rest", async () => {
        const { session, element, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await session.layout.setDimension("2d");
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Stripes" }));
        const colors = await waitFor(() => {
            const found = readChannelList("node.stripeColors", written(session, nodes, "node.stripeColors")).map(
                String,
            );
            assert.lengthOf(found, 2);
            return found;
        });
        await userEvent.keyboard("{Escape}");
        const row = await waitFor(() => {
            const found = fill.querySelector<HTMLElement>('[data-thing="stripes"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(row).getByRole("button", { name: /^Node stripes settings/ }));
        // A number showing a value is a spin button.
        const share = await screen.findByRole("spinbutton", { name: "Stripe 1 share" });
        // Unset, the share shows the even split drawn (design "Input rules"): typed over.
        await userEvent.click(share);
        await userEvent.keyboard("{Control>}a{/Control}75{Tab}");
        await waitFor(() => {
            assert.deepEqual(
                readChannelList("node.stripeSizes", written(session, nodes, "node.stripeSizes")).map(Number),
                [0.75],
                "75% is three quarters of the node",
            );
        });
        await userEvent.keyboard("{Escape}");
        const image = await picture(element);
        const first = shareNear(image, element, "a", colors[0]);
        const second = shareNear(image, element, "a", colors[1]);
        assert.isAbove(second, 0.1, "the second stripe keeps the quarter left");
        assert.isAbove(first, second * 1.5, "the first stripe is the wider");
    });

    // A band frame is Whole or Rim; each side then writes its own item and leaves the others (stripes design 5).
    it("a band frame's Rim shows four sides, and a side typed writes that side alone", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Stripes" }));
        await waitFor(() => {
            assert.isDefined(written(session, nodes, "node.stripeColors"));
        });
        await userEvent.keyboard("{Escape}");
        const row = await waitFor(() => {
            const found = fill.querySelector<HTMLElement>('[data-thing="stripes"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(row).getByRole("button", { name: /^Node stripes settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        // Fixed has one group, Stripe area, which its "..." opens directly.
        const area = await openGroup(pop);
        assert.isNull(within(area).queryByRole("spinbutton", { name: "Band frame top" }), "Whole shows no sides");
        await userEvent.click(within(area).getByRole("radio", { name: "Rim" }));
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.stripeFrame"), "0.1 0.1 0.1 0.1", "a rim shows at once");
        });
        const top = await within(area).findByRole("spinbutton", { name: "Band frame top" });
        await userEvent.click(top);
        await userEvent.keyboard("{Control>}a{/Control}20{Enter}");
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.stripeFrame"), "0.2 0.1 0.1 0.1", "the other sides stay");
        });
        await userEvent.click(within(area).getByRole("radio", { name: "Whole" }));
        await waitFor(() => {
            assert.isUndefined(written(session, nodes, "node.stripeFrame"), "Whole unsets the frame");
        });
    });

    it("Chart starts drawn: its values and colors change the picture", async () => {
        const { session, element, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        const before = await picture(element);
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Chart" }));
        await waitFor(() => {
            assert.isDefined(written(session, nodes, "node.chartValues"), "values");
            assert.isDefined(written(session, nodes, "node.chartColors"), "colors");
        });
        await userEvent.keyboard("{Escape}");
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the chart draws");
    });

    it("a layer over a pie shows the pie beneath, and a slice changed there writes that slice alone", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.pieColors": "#E69F00 #56B4E9 #009E73" } });
        const { id: top } = await session.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1 },
        });
        await session.styles.settled();
        const tab = await openStyle("Hubs");
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pie" }));
        // The pie beneath shows: three slices, nothing written yet.
        const chip = await waitFor(() => {
            const line = document.querySelector<HTMLElement>('[data-line="node.pieColors:1"]');
            assert.isNotNull(line, "slice 2 of the pie beneath");
            const found = line.querySelector<HTMLElement>('[data-testid="compact-color-input-chip"]');
            assert.isNotNull(found);
            return found;
        });
        assert.isNotNull(document.querySelector('[data-line="node.pieColors:2"]'), "slice 3 too");
        assert.isUndefined(written(session, top, "node.pieColors"), "the pie is not copied");
        await userEvent.click(chip);
        const hex = await screen.findByRole("textbox", { name: "Color value" });
        await userEvent.click(hex);
        await userEvent.keyboard("{Control>}a{/Control}FF0000{Enter}");
        await waitFor(() => {
            const encode = session.styles.get(top)?.encode ?? {};
            assert.deepEqual(
                Object.keys(encode).filter((key) => key.startsWith("node.pieColors")),
                ["node.pieColors.1"],
                "one slice written",
            );
        });
        assert.isUndefined(written(session, top, "node.pieColors"), "the whole pie is still not copied");
        await userEvent.keyboard("{Escape}");
        const image = await picture(element);
        for (const color of ["#E69F00", "#009E73", "#FF0000"]) {
            assert.isAbove(shareNear(image, element, "a", color), 0.03, `${color} draws`);
        }
    });
});
