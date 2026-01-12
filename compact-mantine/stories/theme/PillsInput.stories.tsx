import { Pill, PillsInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof PillsInput> = {
    title: "Theme/PillsInput",
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
