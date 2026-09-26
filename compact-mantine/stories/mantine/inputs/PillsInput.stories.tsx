import { Pill, PillsInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `PillsInput`, themed as Figma's filled field holding variable-pill shaped pills. It is
 * the building block under `MultiSelect` and `TagsInput`; use it directly only when you manage the
 * pills yourself. Every prop is Mantine's: see
 * [PillsInput on mantine.dev](https://mantine.dev/core/pills-input/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Pill, PillsInput } from "@mantine/core";
 *
 * <PillsInput label="Tags" w={184}>
 *     <Pill.Group>
 *         {tags.map((t) => <Pill key={t} withRemoveButton onRemove={() => remove(t)}>{t}</Pill>)}
 *         <PillsInput.Field placeholder="Add" />
 *     </Pill.Group>
 * </PillsInput>
 * ```
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | 24px per row, radius 5px |
 * | Pill | 20px tall, 1px `--cm-border`, radius 5px |
 */
const meta: Meta<typeof PillsInput> = {
    title: "Themed Mantine/Inputs/PillsInput",
    component: PillsInput,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PillsInput>;

/** A labelled field with one removable pill and room to type. */
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

/**
 * Every state: rest, hover and focus (forced with `data-state`), disabled and invalid. Light and
 * dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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

/** More pills than fit on one line wrap onto further rows. */
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
