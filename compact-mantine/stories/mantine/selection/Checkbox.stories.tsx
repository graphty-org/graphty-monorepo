import { Checkbox } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `Checkbox`, themed as Figma's two checkboxes: the blue dialog checkbox (the default,
 * `variant="filled"`) and the gray panel checkbox (`variant="neutral"`), which stays gray when
 * checked. Every prop is Mantine's: see [Checkbox on mantine.dev](https://mantine.dev/core/checkbox/).
 *
 * In a panel, prefer `ToggleRow` (Components/Selection): it lays the neutral checkbox out on the
 * 32px row grid and names it. Use the bare Checkbox in dialogs, popovers and table headers.
 *
 * ## Usage
 *
 * ```tsx
 * import { Checkbox } from "@mantine/core";
 *
 * <Checkbox label="Clip content" checked={clip} onChange={(e) => setClip(e.currentTarget.checked)} />
 * <Checkbox variant="neutral" label="Clip content" />
 * ```
 *
 * A native checkbox: Space toggles it, `indeterminate` draws the mixed dash. Keyboard focus draws
 * a 1px ring outside the box.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Box | 16 x 16, radius 2px, 1px `--cm-border-translucent-strong` edge |
 * | Label | 11/16, weight 450, 8px after the box |
 * | Row | 24px (32px in a panel `ToggleRow`) |
 */
const meta: Meta<typeof Checkbox> = {
    title: "Themed Mantine/Selection/Checkbox",
    component: Checkbox,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

/** A labeled checkbox; use Controls to switch `variant`, `checked`, `indeterminate` or `disabled`. */
export const Default: Story = {
    args: {
        label: "Enable feature",
        variant: "filled",
    },
};

/**
 * Every state of both checkboxes: unchecked, checked and mixed, each at rest, hovered and pressed
 * (forced with `data-cm-state`), then focus and disabled. Light and dark side by side. The play
 * function gives the marked cell real keyboard focus.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {(["neutral", "filled"] as const).map((variant) => (
                <StateGrid
                    key={variant}
                    cells={[
                        [`${variant}: unchecked`, <Checkbox variant={variant} label="Clip content" />],
                        [`${variant}: hover`, <Checkbox variant={variant} label="Clip content" data-cm-state="hover" />],
                        [`${variant}: pressed`, <Checkbox variant={variant} label="Clip content" data-cm-state="pressed" />],
                        [`${variant}: checked`, <Checkbox variant={variant} label="Clip content" defaultChecked />],
                        [`${variant}: checked hover`, <Checkbox variant={variant} label="Clip content" defaultChecked data-cm-state="hover" />],
                        [`${variant}: checked pressed`, <Checkbox variant={variant} label="Clip content" defaultChecked data-cm-state="pressed" />],
                        [`${variant}: mixed`, <Checkbox variant={variant} label="Clip content" indeterminate />],
                        [
                            `${variant}: focus`,
                            <Checkbox
                                variant={variant}
                                label="Clip content"
                                defaultChecked
                                data-story-focus={variant === "neutral" ? true : undefined}
                            />,
                        ],
                        [`${variant}: disabled`, <Checkbox variant={variant} label="Clip content" disabled />],
                        [`${variant}: disabled checked`, <Checkbox variant={variant} label="Clip content" disabled defaultChecked />],
                        [`${variant}: disabled mixed`, <Checkbox variant={variant} label="Clip content" disabled indeterminate />],
                    ]}
                />
            ))}
        </div>
    ),
    play: focusMarked,
};
