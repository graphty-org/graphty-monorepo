/**
 * Every themed focusable control shows the 1px ring on keyboard focus (design/figma-spec.md 2.7).
 *
 * The theme sets `focusRing: "never"`, which switches Mantine's 2px ring off everywhere at once;
 * the ring each control shows instead comes from a `cm-focus-*` class (or `cm-field`) its package
 * adds through the theme's `classNames`. This suite is the gate that "never" cannot leave a
 * control with no ring: a control fails here until its package gives it one.
 *
 * The ring may be drawn on the focused element, on its `::before` (cm-focus-pseudo), on the
 * sibling Mantine paints a visually hidden input's state on (Checkbox, Switch, Radio), or on a
 * field wrapper through `:focus-within` -- 1px, in the selected-border colour (#0d99ff, dark #0c8ce9),
 * or the strong one (#007be5, dark #7cc4f8) for the switch and the primary button.
 */
import {
    ActionIcon,
    Anchor,
    Burger,
    Button,
    Checkbox,
    CloseButton,
    NavLink,
    NumberInput,
    Pagination,
    Radio,
    SegmentedControl,
    Select,
    Slider,
    Switch,
    Tabs,
    Textarea,
    TextInput,
} from "@mantine/core";
import { userEvent } from "@vitest/browser/context";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { hex, renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

// border-selected and border-selected-strong, light then dark (tokens.ts).
const RING_COLOURS = new Set(["#0d99ff", "#007be5", "#0c8ce9", "#7cc4f8"]);

/** Describe the 1px ring drawn for the focused element, or null when there is none. */
function ring(focused: Element): string | null {
    const candidates: [Element, string | undefined][] = [
        [focused, undefined],
        [focused, "::before"],
    ];
    if (focused.nextElementSibling) {
        candidates.push([focused.nextElementSibling, undefined]);
    }
    for (let el = focused.parentElement, i = 0; el && i < 4; el = el.parentElement, i++) {
        candidates.push([el, undefined]);
    }
    for (const [el, pseudo] of candidates) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.outlineStyle !== "none" && cs.outlineWidth === "1px" && RING_COLOURS.has(hex(cs.outlineColor))) {
            return `outline on ${el.tagName.toLowerCase()}${pseudo ?? ""}`;
        }
        if (/0px 0px 0px 2px/.test(cs.boxShadow) && [...RING_COLOURS].some((c) => cs.boxShadow.includes(c))) {
            return `double ring on ${el.tagName.toLowerCase()}`;
        }
        const shadowRing = cs.boxShadow.match(/rgb\([^)]*\) 0px 0px 0px 1px/);
        if (shadowRing && RING_COLOURS.has(hex(shadowRing[0].split(" 0px")[0]))) {
            return `shadow ring on ${el.tagName.toLowerCase()}`;
        }
    }
    return null;
}

const CONTROLS: [string, ReactElement][] = [
    ["TextInput", <TextInput key="c" aria-label="Name" />],
    ["NumberInput", <NumberInput key="c" aria-label="Size" />],
    ["Textarea", <Textarea key="c" aria-label="Notes" />],
    ["Select", <Select key="c" aria-label="Kind" data={["One", "Two"]} />],
    ["Button", <Button key="c">Run</Button>],
    ["Button (default variant)", <Button key="c" variant="default">Run</Button>],
    [
        "ActionIcon",
        <ActionIcon key="c" aria-label="Reset">
            <span>x</span>
        </ActionIcon>,
    ],
    ["CloseButton", <CloseButton key="c" aria-label="Close" />],
    ["Checkbox", <Checkbox key="c" label="Visible" />],
    ["Switch", <Switch key="c" label="Enabled" />],
    ["Radio", <Radio key="c" label="One" />],
    ["SegmentedControl", <SegmentedControl key="c" data={["One", "Two"]} />],
    [
        "Tabs",
        <Tabs key="c" defaultValue="a">
            <Tabs.List>
                <Tabs.Tab value="a">A</Tabs.Tab>
                <Tabs.Tab value="b">B</Tabs.Tab>
            </Tabs.List>
        </Tabs>,
    ],
    ["Slider", <Slider key="c" defaultValue={40} />],
    [
        "Anchor",
        <Anchor key="c" href="#x">
            Link
        </Anchor>,
    ],
    ["NavLink", <NavLink key="c" href="#x" label="Page" />],
    ["Pagination", <Pagination key="c" total={3} />],
    ["Burger", <Burger key="c" aria-label="Menu" />],
];

describe.each(["light", "dark"] as const)("keyboard focus draws the 1px ring (%s)", (scheme) => {
    it.each(CONTROLS)("%s", async (_name, ui) => {
        await renderThemed(ui, { scheme });
        await userEvent.tab();
        const focused = document.activeElement;
        expect(focused).not.toBe(document.body);
        expect(ring(focused as Element), "no 1px ring found").not.toBeNull();
    });
});

describe("a pointer click on a button draws no ring (fields ring on any focus)", () => {
    it.each(CONTROLS.filter(([n]) => /^(Button|ActionIcon|CloseButton)/.test(n)))("%s", async (_name, ui) => {
        const { container } = await renderThemed(ui);
        const button = container.querySelector("button");
        expect(button).not.toBeNull();
        await userEvent.click(button as HTMLElement);
        expect(ring(button as Element)).toBeNull();
    });
});
