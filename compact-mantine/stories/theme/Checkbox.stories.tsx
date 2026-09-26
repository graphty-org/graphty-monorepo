import { Checkbox } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { focusMarked, StateGrid } from "../figma/selection/StateGrid";

const meta: Meta<typeof Checkbox> = {
    title: "Compact Theme/Mantine Components/Checkbox",
    component: Checkbox,
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
    args: {
        label: "Enable feature",
    },
};

export const Unchecked: Story = {
    args: {
        label: "Unchecked",
    },
};

export const Checked: Story = {
    args: {
        label: "Checked",
        defaultChecked: true,
    },
};

export const Disabled: Story = {
    args: {
        label: "Disabled",
        disabled: true,
    },
};

export const DisabledChecked: Story = {
    args: {
        label: "Disabled Checked",
        defaultChecked: true,
        disabled: true,
    },
};

export const Indeterminate: Story = {
    args: {
        label: "Indeterminate",
        indeterminate: true,
    },
};

/**
 * Every state of Figma's two checkboxes (design/figma-spec.md 5.4), side by side: the neutral
 * panel checkbox (`variant="neutral"`, grey when checked) and the blue dialog checkbox (the
 * default). Hover and pressed are forced with `data-cm-state`; the play function gives the
 * marked cell real keyboard focus. Switch the toolbar for dark and for the WCAG AA contrast.
 */
export const States: Story = {
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
