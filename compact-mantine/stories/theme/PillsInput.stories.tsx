import { Pill, PillsInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../figma/inputs/StateGrid";

const meta: Meta<typeof PillsInput> = {
    title: "Compact Theme/Mantine Components/PillsInput",
    component: PillsInput,
    args: {
        w: 200,
    },
};

export default meta;
type Story = StoryObj<typeof PillsInput>;

export const Default: Story = {
    render: () => (
        <PillsInput label="Select items" w={200}>
            <Pill.Group>
                <Pill withRemoveButton>Banana</Pill>
                <PillsInput.Field placeholder="Add more" />
            </Pill.Group>
        </PillsInput>
    ),
};

export const MultiplePills: Story = {
    render: () => (
        <PillsInput label="Shopping list" w={200}>
            <Pill.Group>
                <Pill withRemoveButton>Milk</Pill>
                <Pill withRemoveButton>Bread</Pill>
                <Pill withRemoveButton>Eggs</Pill>
                <PillsInput.Field />
            </Pill.Group>
        </PillsInput>
    ),
};

export const Disabled: Story = {
    render: () => (
        <PillsInput label="Select items" disabled w={200}>
            <Pill.Group>
                <Pill>Locked</Pill>
            </Pill.Group>
        </PillsInput>
    ),
};

export const WithError: Story = {
    render: () => (
        <PillsInput label="Select items" error="Invalid selection" w={200}>
            <Pill.Group>
                <Pill withRemoveButton>Oops</Pill>
                <PillsInput.Field />
            </Pill.Group>
        </PillsInput>
    ),
};

export const MultiRow: Story = {
    render: () => (
        <PillsInput label="Shopping list" w={200}>
            <Pill.Group>
                <Pill withRemoveButton>Milk</Pill>
                <Pill withRemoveButton>Bread</Pill>
                <Pill withRemoveButton>Eggs</Pill>
                <Pill withRemoveButton>Cheese</Pill>
                <Pill withRemoveButton>Butter</Pill>
                <PillsInput.Field />
            </Pill.Group>
        </PillsInput>
    ),
};

/** Every state side by side (design/figma-spec.md 6.7), with variable-pill shaped pills. */
export const States: Story = {
    render: () => {
        const field = (props: Record<string, unknown>): React.JSX.Element => (
            <PillsInput aria-label="Tags" w={184} {...props}>
                <Pill.Group>
                    <Pill>Alpha</Pill>
                    <Pill withRemoveButton>Beta</Pill>
                    <PillsInput.Field placeholder="Add" />
                </Pill.Group>
            </PillsInput>
        );
        return (
            <StateGrid
                cells={[
                    { state: "rest", node: field({}) },
                    { state: "hover", node: field({ "data-state": "hover" }) },
                    { state: "focus", node: field({ "data-state": "focus" }) },
                    { state: "disabled", node: field({ disabled: true }) },
                    { state: "invalid", node: field({ error: true }) },
                ]}
            />
        );
    },
};
