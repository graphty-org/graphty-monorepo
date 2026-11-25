/**
 * Style panel v2's Stripes on the REAL graphty-element, by real clicks and keys (stripes design): a typed share is
 * written as typed while the later shares give way, Equal makes every share automatic, a reorder carries an item's
 * binding with it, the chip's picker shows a color's own alpha as its Opacity and writes it back folded in, and a
 * column of words picked in the row's entries picker draws one band per category in the same color on every node.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { findValuePicker, screen, waitFor, within } from "../../../test/test-utils";
import { moreButton, openGroup, openProject, openStyle, sectionOf, written } from "./v2Harness";

/**
 * Opens the project with fixed stripes on its layer, and the Stripes pop-over.
 * @param set - what the layer sets beside its color.
 * @param encode - what it binds.
 * @returns the session, the layer and the pop-over.
 */
async function openStripes(
    set: Readonly<Record<string, unknown>>,
    encode: Readonly<Record<string, unknown>> = {},
): Promise<{ session: GraphSession; layer: string; pop: HTMLElement }> {
    const { session, id } = await openProject();
    await session.data.updateNodes([
        { id: "a", values: { tint: "#00FF00", sets: ["setA", "setC"] } },
        { id: "b", values: { tint: "#0000FF", sets: ["setC"] } },
    ]);
    await session.styles.update(id, { set: { "node.color": "#E8590C", ...set }, encode } as never);
    await session.styles.settled();
    const tab = await openStyle("Key people");
    const row = await waitFor(() => {
        const found = sectionOf(tab, "node-fill").querySelector<HTMLElement>('[data-thing="stripes"]');
        assert.isNotNull(found);
        return found;
    });
    await userEvent.click(within(row).getByRole("button", { name: /^Node stripes settings/ }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector("[data-thing-popover]"));
    });
    // The stripes are one line of the pop-over, opening their list beside it (design "Lists in pop-overs").
    await userEvent.click(await screen.findByRole("button", { name: /^Edit stripes/ }));
    const pop = await waitFor(() => {
        const found = document.querySelector<HTMLElement>('[data-beside-pop="Stripes"]');
        assert.isNotNull(found);
        return found;
    });
    return { session, layer: id, pop };
}

/**
 * Types a number into a field, replacing what it holds.
 * @param field - the field.
 * @param text - the number.
 */
async function typeInto(field: HTMLElement, text: string): Promise<void> {
    await userEvent.click(field);
    await userEvent.keyboard(`{Control>}a{/Control}${text}{Enter}`);
}

/**
 * Opens the project with stripes from data on its layer.
 * @param spec - the stripes' data spec.
 * @returns the session, the layer and the Style tab.
 */
async function openDataStripes(
    spec: Readonly<Record<string, unknown>>,
): Promise<{ session: GraphSession; layer: string; tab: HTMLElement }> {
    const { session, id } = await openProject();
    await session.data.updateNodes([
        { id: "a", values: { x1: 3, x2: 5, sets: ["setA", "setC"] } },
        { id: "b", values: { x1: 1, x2: 2, sets: ["setC"] } },
    ]);
    await session.styles.update(id, { set: { "node.color": "#E8590C", "node.stripeData": spec } });
    await session.styles.settled();
    const tab = await openStyle("Key people");
    return { session, layer: id, tab };
}

/**
 * Opens a pop-over from its settings button, hovering its line first as a reader does.
 * @param name - the button's name.
 * @returns the pop-over.
 */
async function openSettings(name: string): Promise<HTMLElement> {
    const button = await screen.findByRole("button", { name });
    await userEvent.hover(button.closest<HTMLElement>(".ws-row") ?? button);
    await userEvent.click(button);
    return waitFor(() => {
        assert.strictEqual(button.getAttribute("aria-expanded"), "true", `${name} is open`);
        const pop = document.getElementById(button.getAttribute("aria-controls") ?? "");
        assert.isNotNull(pop);
        return pop;
    });
}

/**
 * A pop-over opened beside another, by its title.
 * @param title - its title.
 * @returns its content.
 */
async function beside(title: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-beside-pop="${title}"]`);
        assert.isNotNull(found, `${title} is open`);
        return found;
    });
}

/**
 * Opens an entry's Format pop-over from its Entry pop-over's Format line, the one way to it.
 * @param entry - the entry's name.
 * @returns the Format pop-over.
 */
async function openFormat(entry: string): Promise<HTMLElement> {
    const pop = await openSettings(`${entry} settings`);
    assert.isNull(within(pop).queryByRole("combobox", { name: "Format" }), "no second set of format presets");
    await userEvent.click(within(pop).getByRole("button", { name: `${entry} format` }));
    return beside("Format");
}

describe("Style panel v2's Stripes", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("writes a typed share as typed, the later shares giving way, and Equal makes every share automatic", async () => {
        const { session, layer, pop } = await openStripes({
            "node.stripeColors": "#E69F00 #56B4E9 #009E73",
            "node.stripeSizes": "0.3 0.3 0.3",
        });
        await typeInto(await within(pop).findByRole("spinbutton", { name: "Stripe 1 share" }), "60");
        await waitFor(() => {
            assert.strictEqual(written(session, layer, "node.stripeSizes"), "0.6 0.3 0.1", "stripe 3 gives way first");
        });
        await typeInto(within(pop).getByRole("spinbutton", { name: "Stripe 3 share" }), "50");
        await waitFor(() => {
            assert.strictEqual(
                written(session, layer, "node.stripeSizes"),
                "0.5 0 0.5",
                "with nothing after it, the nearest earlier share gives way next, then the one before",
            );
        });
        await userEvent.click(within(pop).getByRole("button", { name: "Equal shares" }));
        await waitFor(() => {
            assert.isUndefined(written(session, layer, "node.stripeSizes"), "every share automatic");
        });
        const merged = session.styles.explain({ node: "a" }).merged as Record<string, unknown>;
        assert.strictEqual(merged["node.stripeColors"], "#E69F00 #56B4E9 #009E73", "the colors stay");
    });

    it("moves a stripe with Alt+ArrowUp, its item binding moving with it, in one undo step", async () => {
        const { session, layer, pop } = await openStripes(
            { "node.stripeColors": "#E69F00 #56B4E9 #009E73" },
            { "node.stripeColors.2": { by: "data.tint" } },
        );
        // The bound item shows its sub-line under its stripe.
        await waitFor(() => {
            assert.isNotNull(pop.querySelector('[data-line="node.stripeColors.2:bound"]'), "Color from data");
        });
        const before = session.history.position;
        const grip = within(pop).getByRole("button", { name: /^Stripe 3 of 3/ });
        grip.focus();
        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        await waitFor(() => {
            assert.strictEqual(written(session, layer, "node.stripeColors"), "#E69F00 #009E73 #56B4E9");
            const encode = session.styles.get(layer)?.encode ?? {};
            assert.deepEqual(
                Object.keys(encode).filter((key) => key.startsWith("node.stripeColors")),
                ["node.stripeColors.1"],
                "the binding moved with its stripe",
            );
        });
        assert.strictEqual(session.history.position, before + 1, "one undo step");
        await waitFor(() => {
            assert.match(
                document.activeElement?.getAttribute("aria-label") ?? "",
                /^Stripe 2 of 3/,
                "focus follows the moved stripe",
            );
        });
    });

    it("writes a dragged share once, on release, the later shares giving way", async () => {
        const { session, layer, pop } = await openStripes({ "node.stripeColors": "#E69F00 #56B4E9" });
        const before = session.history.position;
        const line = within(pop).getByRole("slider", { name: "Stripe 1 share" });
        const track = line.closest<HTMLElement>(".mantine-Slider-root");
        assert.isNotNull(track);
        const { width } = track.getBoundingClientRect();
        await userEvent.dragAndDrop(line, track, { targetPosition: { x: width * 0.8, y: 6 } });
        await waitFor(() => {
            const sizes = String(written(session, layer, "node.stripeSizes"))
                .split(" ")
                .map(Number);
            assert.isAbove(sizes[0], 0.6, "stripe 1 takes what it was dragged to");
        });
        assert.strictEqual(session.history.position, before + 1, "one undo step");
        const share = within(pop).getByRole<HTMLInputElement>("spinbutton", { name: "Stripe 2 share" });
        assert.notInclude(share.value, "S", "no letter before the number");
        assert.isAtMost(share.value.split(".")[1]?.length ?? 0, 1, "one decimal at most");
    });

    it("adds Stripes from Fill without opening anything, and a stripe from + scrolls into view", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        await userEvent.click(within(sectionOf(tab, "node-fill")).getByRole("button", { name: /^Add to node fill/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Stripes" }));
        await waitFor(() => {
            assert.isDefined(written(session, id, "node.stripeColors"), "two stripes written");
        });
        assert.isNull(screen.queryByRole("listbox", { name: "Node stripes data" }), "no data picker opened");
        assert.isNull(document.querySelector("[data-thing-popover]"), "no pop-over opened");
        const row = sectionOf(tab, "node-fill").querySelector<HTMLElement>('[data-thing="stripes"]');
        assert.isNotNull(row);
        await userEvent.click(within(row).getByRole("button", { name: /^Node stripes settings/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Edit stripes/ }));
        for (let added = 0; added < 4; added++) {
            await userEvent.click(await screen.findByRole("button", { name: "Add stripe" }));
        }
        const last = await waitFor(() => {
            const found = document.querySelector<HTMLElement>('[data-item-line="5"]');
            assert.isNotNull(found);
            return found;
        });
        const region = last.closest<HTMLElement>(".mantine-ScrollArea-viewport");
        assert.isNotNull(region);
        await waitFor(() => {
            const box = region.getBoundingClientRect();
            const line = last.getBoundingClientRect();
            assert.isAtLeast(line.top, box.top - 1, "stripe 6 is in view");
            assert.isAtMost(line.bottom, box.bottom + 1, "stripe 6 is in view");
        });
        assert.strictEqual(region.scrollWidth, region.clientWidth, "the list never scrolls sideways");
    });

    it("writes one side of a frame a lower layer draws by its own address", async () => {
        const { session, layer } = await openStripes({ "node.stripeColors": "#E69F00 #56B4E9" });
        await session.styles.add(
            {
                name: "Frame",
                target: "node",
                selector: { match: "everything" },
                set: { "node.stripeFrame": "0.1 0.1 0.1 0.1" },
            },
            { below: layer },
        );
        await session.styles.settled();
        await userEvent.keyboard("{Escape}");
        const fixed = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        // Fixed has one group: the header "..." opens Stripe area directly.
        await openGroup(fixed, "Stripe area");
        await typeInto(await screen.findByRole("spinbutton", { name: "Band frame right" }), "30");
        await waitFor(() => {
            const held = session.styles.get(layer);
            const at = { ...(held?.set ?? {}), ...(held?.encode ?? {}) } as Record<string, unknown>;
            assert.isDefined(at["node.stripeFrame.1"], "the right side's own address");
            assert.isUndefined(at["node.stripeFrame"], "the frame stays the lower layer's");
        });
        const merged = session.styles.explain({ node: "a" }).merged as Record<string, unknown>;
        assert.strictEqual(merged["node.stripeFrame"], "0.1 0.3 0.1 0.1");
    });

    it("shows a color's own alpha as the picker's Opacity, and writes it folded into the stripe's opacity", async () => {
        const { session, layer, pop } = await openStripes({ "node.stripeColors": "#FFAAAA80 #56B4E9" });
        const chip = await within(pop).findByRole("button", { name: /^Stripe 1 color/ });
        await userEvent.click(chip);
        const opacity = await screen.findByRole<HTMLInputElement>("textbox", { name: "Opacity" });
        assert.strictEqual(opacity.value, "50", "128 / 255 of the color drawn, as the picker rounds it");
        const hex = await screen.findByRole("textbox", { name: "Color value" });
        await userEvent.click(hex);
        await userEvent.keyboard("{Control>}a{/Control}00FF00{Enter}");
        await waitFor(() => {
            assert.strictEqual(
                written(session, layer, "node.stripeColors"),
                "#00FF00 #56B4E9",
                "no alpha in the color",
            );
            assert.strictEqual(written(session, layer, "node.stripeOpacities"), "0.5", "the drawn opacity kept");
        });
    });

    it("draws one band per category of a column of words, each category the same color on every node", async () => {
        const { session, layer } = await openStripes({ "node.stripeColors": "#E69F00 #56B4E9" });
        await userEvent.keyboard("{Escape}");
        await userEvent.click(await screen.findByRole("combobox", { name: "Node stripes data" }));
        const list = await screen.findByRole("listbox", { name: "Node stripes data" });
        await userEvent.click(within(list).getByRole("option", { name: /^sets\b/ }));
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.deepEqual(written(session, layer, "node.stripeData"), { entries: [{ field: "data.sets" }] });
        });
        assert.isUndefined(written(session, layer, "node.stripeColors"), "the fixed stripes go in the same write");
        await session.styles.settled();
        const bands = (node: string): string[] =>
            String((session.styles.explain({ node }).merged as Record<string, unknown>)["node.stripeColors"]).split(
                " ",
            );
        assert.lengthOf(bands("a"), 2, "setA and setC");
        assert.deepEqual(bands("b"), [bands("a")[1]], "setC is one color on a and on b");
    });
    it("shows a plain entry's drawn color on its chip once an existing layer's stripes are changed to data", async () => {
        const { session, id } = await openProject();
        await session.data.updateNodes([
            { id: "a", values: { x1: 3, x2: 5 } },
            { id: "b", values: { x1: 1, x2: 2 } },
        ]);
        await session.styles.update(id, { set: { "node.color": "#E8590C", "node.stripeColors": "#123456" } });
        await session.styles.settled();
        await openStyle("Key people");
        await userEvent.click(await screen.findByRole("combobox", { name: "Node stripes data" }));
        const list = await screen.findByRole("listbox", { name: "Node stripes data" });
        await userEvent.click(within(list).getByRole("option", { name: /^x1\b/ }));
        await userEvent.click(within(list).getByRole("option", { name: /^x2\b/ }));
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.deepEqual(written(session, id, "node.stripeData"), {
                entries: [{ field: "data.x1" }, { field: "data.x2" }],
            });
        });
        await session.styles.settled();
        const drawn = String(
            (session.styles.explain({ node: "a" }).merged as Record<string, unknown>)["node.stripeColors"],
        ).split(" ")[0];
        const pop = await openSettings("x1 settings");
        // The chip names the color graphty-element draws the stripe in, never the stand-in gray.
        await waitFor(() => {
            assert.strictEqual(
                within(pop)
                    .getByRole("button", { name: /^x1 color/ })
                    .getAttribute("aria-label"),
                `x1 color, ${drawn}`,
            );
        });
    });

    it("takes the list off only from the row's minus, names its two inputs above it, and takes 8-digit hex", async () => {
        const { session, layer, pop } = await openStripes({ "node.stripeColors": "#E69F00 #56B4E9" });
        const line = document.querySelector<HTMLElement>('[data-thing-popover] [data-line="node.stripeColors"]');
        assert.isNotNull(line, "the pop-over's Stripes line");
        assert.isNull(within(line).queryByRole("button", { name: /^Remove/ }), "the row's minus is the one path");
        assert.isNotNull(within(pop).queryByRole("button", { name: "Remove stripe 1" }), "each stripe keeps its own");
        assert.isNull(pop.querySelector(".ws-list-caption"), "no caption row of the app's own");
        assert.isNotNull(within(pop).queryByRole("group", { name: "Color / Share" }), "compact-mantine's name above");
        await userEvent.click(within(pop).getByRole("button", { name: /^Stripe 1 color/ }));
        const hex = await screen.findByRole("textbox", { name: "Color value" });
        await userEvent.click(hex);
        await userEvent.keyboard("{Control>}a{/Control}00FF0080{Enter}");
        await waitFor(() => {
            assert.strictEqual(written(session, layer, "node.stripeColors"), "#00FF00 #56B4E9");
            assert.closeTo(Number(written(session, layer, "node.stripeOpacities")), 0.5, 0.01, "its alpha the opacity");
        });
    });

    it("names each frame side's link for its side, and a side's link binds that side alone", async () => {
        const { session, layer } = await openStripes({ "node.stripeColors": "#E69F00 #56B4E9" });
        await session.data.updateNodes([
            { id: "a", values: { depth: 0.1 } },
            { id: "b", values: { depth: 0.2 } },
        ]);
        await userEvent.keyboard("{Escape}");
        const fixed = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        const area = await openGroup(fixed, "Stripe area");
        await userEvent.click(within(area).getByText("Rim"));
        for (const side of ["top", "right", "bottom", "left"]) {
            await within(area).findByRole("button", { name: `Band frame ${side} by attribute` });
        }
        const link = within(area).getByRole("button", { name: "Band frame right by attribute" });
        await userEvent.hover(link.closest<HTMLElement>(".ws-row") ?? link);
        await userEvent.click(link);
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^depth\b/ }));
        await waitFor(() => {
            const encode = session.styles.get(layer)?.encode ?? {};
            assert.deepEqual(
                Object.keys(encode).filter((key) => key.startsWith("node.stripeFrame")),
                ["node.stripeFrame.1"],
                "the right side alone is bound",
            );
        });
    });

    it("sets a plain entry's look only from its own pop-over, whose Format line is one button", async () => {
        const { tab } = await openDataStripes({ entries: [{ field: "data.x1" }, { field: "data.x2" }] });
        const section = sectionOf(tab, "node-fill");
        // The entry's line holds its source; its "..." is the one way to its Entry pop-over.
        await waitFor(() => {
            assert.lengthOf(within(section).getAllByRole("combobox", { name: "Field" }), 2);
        });
        assert.isNull(within(section).queryByRole("button", { name: /^x1,/ }), "no value button opening it again");
        const format = await openFormat("x1");
        assert.isNotNull(within(format).queryByText("Decimals"));
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        const pop = await openSettings("Node stripes settings");
        const colors = await openGroup(pop, "Colors");
        assert.isNull(within(colors).queryByRole("combobox", { name: "Category" }), "a plain entry is not listed");
        assert.isNull(within(colors).queryByRole("textbox", { name: "Name" }), "its name is its pop-over's");
    });

    it("shows a category's drawn name as its unset Name, and the menu of three groups has no headings", async () => {
        await openDataStripes({ entries: [{ field: "data.sets" }], keep: 5 });
        const pop = await openSettings("Node stripes settings");
        const more = moreButton(pop);
        assert.isNotNull(more);
        await userEvent.click(more);
        const items = await screen.findAllByRole("menuitem");
        assert.isAtMost(items.length, 6);
        assert.isNull(document.querySelector(".mantine-Menu-label"), "a short menu needs no headings");
        await userEvent.keyboard("{Escape}");
        const colors = await openGroup(pop, "Colors");
        const name = within(colors).getByRole<HTMLInputElement>("textbox", { name: "Name" });
        assert.strictEqual(name.value, "setA", "the name the category is drawn under");
    });

    it("picks a currency from a drop-down and gives Notation its own line, its words whole", async () => {
        const { session, layer } = await openDataStripes({ entries: [{ field: "data.x1" }] });
        const format = await openFormat("x1");
        await userEvent.click(within(format).getByText("Money"));
        await userEvent.click(await within(format).findByRole("combobox", { name: "Currency" }));
        await userEvent.click(await screen.findByRole("option", { name: /^EUR\b/ }));
        await waitFor(() => {
            const spec = written(session, layer, "node.stripeData") as {
                entries: { format?: { currency?: string } }[];
            };
            assert.strictEqual(spec.entries[0].format?.currency, "EUR");
        });
        await userEvent.click(within(format).getByText("Number"));
        const notation = await waitFor(() => {
            const found = format.querySelector<HTMLElement>('[data-line="format.notation"]');
            assert.isNotNull(found, "Notation's own line");
            return found;
        });
        assert.isNull(within(notation).queryByRole("combobox", { name: "Decimals" }), "Decimals is on its own line");
        for (const word of ["Plain", "Compact", "Scientific"]) {
            const label = within(notation).getByText(word);
            assert.isAtMost(label.scrollWidth, label.clientWidth, `${word} fits`);
        }
    });

    it("names the Max and How many fields beside Set max and Top N, and No values is a line of the pop-over", async () => {
        const { session, layer } = await openDataStripes({ entries: [{ field: "data.x1" }, { field: "data.x2" }] });
        const pop = await openSettings("Node stripes settings");
        const empty = pop.querySelector<HTMLElement>('[data-line="data.empty"]');
        assert.isNotNull(empty, "No values joins the main pop-over: a group of one line is not a menu entry");
        await userEvent.click(within(empty).getByText("Unknown"));
        await waitFor(() => {
            assert.strictEqual((written(session, layer, "node.stripeData") as { empty?: string }).empty, "band");
        });
        await userEvent.click(within(pop).getByText("Set max"));
        await waitFor(() => {
            assert.include(pop.querySelector('[data-line="data.whole"]')?.textContent, "Whole / Max");
        });
        await userEvent.click(within(pop).getByText("Top N"));
        await waitFor(() => {
            assert.include(pop.querySelector('[data-line="data.keep"]')?.textContent, "Keep / How many");
        });
    });
});
