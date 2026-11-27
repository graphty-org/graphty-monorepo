/**
 * Style panel v2's "+" on the REAL graphty-element, driven by real clicks: every thing whose main channel
 * graphty-element says needs other values to draw (`needs`), or starts on a value of its own (`start`), is
 * added from its section's "+", and the layer holds those values in the same step and the graph's picture
 * changes, in 3D and in 2D wherever graphty-element says the channel draws there; a thing drawn only in 2D is
 * offered only there, so it is added in 2D. The table is built from
 * graphty-element's descriptors, so a channel that gains a need is tested without a new row here.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type Channel, channelDescriptor, channelDrawn, type ChannelNeed } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { SECTIONS, type ThingSpec } from "../v2/things";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/** The channel a thing's "+" starts. */
function mainChannel(thing: ThingSpec): Channel {
    return thing.start ?? thing.main[0] ?? "node.color";
}

/**
 * What graphty-element says a channel needs to draw: its own needs, else its part's.
 * @param channel - the channel.
 * @returns the needs.
 */
function needsOf(channel: Channel): readonly ChannelNeed[] {
    const descriptor = channelDescriptor(channel);
    const head = descriptor?.modifies === undefined ? undefined : channelDescriptor(descriptor.modifies);
    return descriptor?.needs ?? head?.needs ?? [];
}

/** Every thing that needs values beside its own or starts on one of its own, with its kind and section. */
const ADDS = (["node", "edge"] as const).flatMap((side) =>
    SECTIONS[side].flatMap((section) =>
        section.groups
            .flat()
            .filter(
                (thing) =>
                    thing.shader !== true &&
                    (needsOf(mainChannel(thing)).length > 0 ||
                        channelDescriptor(mainChannel(thing))?.start !== undefined),
            )
            .map((thing) => ({ side, part: section.id ?? section.part, thing })),
    ),
);

/** Clicks the Undo button once. */
async function undo(): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
}

describe('Style panel v2\'s "+" writes what a style needs to draw', () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("the table covers the things whose styles need a partner", () => {
        const ids = ADDS.map(({ side, thing }) => `${side}.${thing.id}`);
        for (const id of ["node.border", "node.rings", "node.shadow", "node.plate", "edge.outline", "edge.arrow"]) {
            assert.include(ids, id);
        }
    });

    for (const { side, part, thing } of ADDS) {
        it(`${side} ${thing.name}: "+" writes its needs, and the picture changes in 3D and 2D`, async () => {
            const { session, element, nodes, edges } = await openGraph();
            const layer = side === "node" ? nodes : edges;
            await openStyle(side === "node" ? "Key people" : "Links");
            await showKind(side);
            const main = mainChannel(thing);
            const read = (channel: Channel): unknown => written(session, layer, channel);
            const drawnIn = (dimension: "2d" | "3d"): boolean => channelDrawn(main, read, dimension).drawn;
            // A thing graphty-element draws only in 2D (Raised edge, Plate) is offered only there, so it is added in 2D.
            const only2d =
                channelDescriptor(main)?.drawnWhen?.some((each) => "dimension" in each && each.dimension === "2d") ===
                true;
            await session.layout.setDimension(only2d ? "2d" : "3d");
            const before3d = await picture(element);

            const section = sectionOf(await screen.findByTestId("style-tab"), `${side}-${part}`);
            const plus = section.querySelector<HTMLElement>("[data-plus]");
            assert.isNotNull(plus, `${part}'s "+"`);
            await userEvent.click(plus);
            const item = screen.queryByRole("menuitem", { name: thing.name });
            if (item !== null) {
                await userEvent.click(item);
            }
            await waitFor(() => {
                assert.isDefined(read(main), `${thing.name} writes ${main}`);
            });
            await userEvent.keyboard("{Escape}");
            const start = channelDescriptor(main)?.start;
            if (start !== undefined) {
                assert.equal(read(main), start, `${main} starts on graphty-element's start`);
            }
            for (const need of needsOf(main)) {
                // Written with it, unless a layer beneath already draws the value it needs (Edge defaults' solid line).
                const drawn = session.styles.drawnValues(need.channel).map((each) => each.value);
                const held = read(need.channel) ?? (drawn.length === 1 ? drawn[0] : undefined);
                assert.equal(held, need.value, `${main} needs ${need.channel}`);
            }
            // A start graphty-element already draws with nothing set (a directed graph's target arrow) changes nothing.
            const shows = start === undefined || session.styles.defaultValue(main) !== start;
            const in3d = shows && drawnIn("3d");
            const in2d = shows && drawnIn("2d");
            const after3d = await picture(element);
            if (only2d) {
                // Added in 2D: the pictures before and after are the 2D view's.
                if (in2d) {
                    assert.isAbove(pixelsApart(before3d, after3d), 0, `${thing.name} changes the 2D picture`);
                }
                await undo();
                await waitFor(() => {
                    assert.isUndefined(read(main), "one Undo takes it off");
                });
                for (const need of needsOf(main)) {
                    assert.isUndefined(read(need.channel), `and ${need.channel} with it`);
                }
                return;
            }
            if (in3d) {
                assert.isAbove(pixelsApart(before3d, after3d), 0, `${thing.name} changes the 3D picture`);
            }

            await session.layout.setDimension("2d");
            const after2d = await picture(element);
            // The first Undo takes back the switch to 2D, the next the "+".
            await undo();
            await undo();
            await waitFor(() => {
                assert.isUndefined(read(main), "one Undo takes it off");
            });
            await session.layout.setDimension("2d");
            for (const need of needsOf(main)) {
                assert.isUndefined(read(need.channel), `and ${need.channel} with it`);
            }
            const before2d = await picture(element);
            if (in2d) {
                assert.isAbove(pixelsApart(before2d, after2d), 0, `${thing.name} changes the 2D picture`);
            }
        });
    }

    it("Wireframe added from Effects' + writes the low mesh detail it needs in the same step", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        const effects = sectionOf(tab, "node-effects");
        const steps = session.history.position;
        await userEvent.click(within(effects).getByRole("button", { name: /^Add to node effects/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Wireframe" }));
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.wireframe"), true);
            assert.strictEqual(written(session, nodes, "node.meshDetail"), "low");
        });
        assert.strictEqual(session.history.position, steps + 1, "one step");
        // Its row reads On, and the Shape section holds no wireframe line.
        const row = await waitFor(() => {
            const found = effects.querySelector<HTMLElement>('[data-thing="wireframe"]');
            assert.isNotNull(found);
            return found;
        });
        assert.isTrue(within(row).getByRole<HTMLInputElement>("radio", { name: "On" }).checked);
        assert.isNull(sectionOf(tab, "node-shape").querySelector('[data-line="node.wireframe"]'));
    });
});
