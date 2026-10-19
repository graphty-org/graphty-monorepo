import { NavLink } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { UiGlyph } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `NavLink`, redrawn on the panel tokens: a 24px pill in a 32px row, like a page row.
 * Figma has no NavLink, so only the look changes. Every prop is Mantine's: see
 * [NavLink on mantine.dev](https://mantine.dev/core/nav-link/).
 *
 * For a list of pages the reader can rename or reorder, use `PageList`; for the app's left rail of
 * icons, `NavRail` (both in Components).
 *
 * ## Usage
 *
 * ```tsx
 * import { NavLink } from "@mantine/core";
 *
 * <NavLink href="/styles" label="Styles" active={route === "styles"} />
 * ```
 *
 * A native link (or a button without `href`). Keyboard focus draws the 1px ring on the pill.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 32px, holding a 24px pill |
 * | Hover | `--cm-bg-hover` |
 * | Active | `--cm-bg-secondary`, weight 550 |
 * | Label | 11/16 |
 */
const meta: Meta<typeof NavLink> = {
    title: "Themed Mantine/Navigation/NavLink",
    component: NavLink,
    tags: ["autodocs"],
    argTypes: { leftSection: { control: false } },
};

export default meta;
type Story = StoryObj<typeof NavLink>;

/** A link with a leading glyph; toggle `active` and `disabled` in Controls. */
export const Default: Story = {
    args: {
        label: "Settings",
        href: "#settings",
        leftSection: <UiGlyph name="settings" />,
        active: false,
        w: 240,
    },
};

/** Rest, hover (forced with `data-cm-state`), active, keyboard focus and disabled, light and dark side by side. Keyboard focus is on the marked link. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <div style={{ width: 240 }}>
            <StateGrid
                columns={240}
                cells={[
                    ["rest", <NavLink href="#p1" label="Page 1" />],
                    ["hover", <NavLink href="#p2" label="Page 2" data-cm-state="hover" />],
                    ["active", <NavLink href="#p3" label="Page 3" active />],
                    ["focus", <NavLink href="#p4" label="Page 4" data-story-focus />],
                    ["disabled", <NavLink href="#p5" label="Page 5" disabled />],
                ]}
            />
        </div>
    ),
    play: async (context) => {
        await focusMarked(context);
        await expectStatesApply(context.canvasElement);
    },
};
