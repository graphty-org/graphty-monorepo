import { Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";

import { FieldRow, PANEL_GRID, PanelLabelsProvider, PopoutManager } from "../../../src";
import {
    type DataField,
    DataFieldPicker,
    type DataFieldPickerProps,
} from "../../../src/components/inputs/DataFieldPicker";

/**
 * A field that picks one data field from a searchable list: a type glyph and a dimmed fact on
 * each row, sections, rows that cannot be picked with their reason, an optional "None" row and
 * rows of your own above the fields ("Fixed size").
 *
 * ## Usage
 *
 * ```tsx
 * import { DataFieldPicker } from "@graphty/compact-mantine";
 *
 * const fields = [
 *     { id: "age", name: "Age", type: "number" },
 *     { id: "city", name: "City", type: "category" },
 * ] as const;
 * const [field, setField] = useState<string | null>(null);
 * <DataFieldPicker label="Size by" fields={fields} value={field} onChange={setField} />
 * ```
 *
 * Put it in a `FieldRow` to get its label as the small caption above it (with
 * `PanelLabelsProvider showLabels`); never beside it. It must sit inside a `PopoutManager`.
 *
 * ## Keyboard and accessibility
 *
 * - The trigger opens on a click, Enter, Space or ArrowDown; focus lands in the search box.
 * - Typing filters by the start of a word of a name or keyword; ArrowUp / ArrowDown move,
 *   Enter picks, Tab takes the row typed toward and closes, Escape closes. Focus returns to the
 *   trigger.
 * - Each row's name carries its type word and fact ("Age, number, 1 to 36"); a row that cannot be
 *   picked is reached by the arrows so its reason is heard, and is never picked.
 */
const meta: Meta<typeof DataFieldPicker> = {
    title: "Components/Data display/DataFieldPicker",
    component: DataFieldPicker,
    decorators: [
        (Story) => (
            <PopoutManager>
                <Box style={{ width: PANEL_GRID.BODY }}>
                    <Story />
                </Box>
            </PopoutManager>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof DataFieldPicker>;

const FIELDS: DataField[] = [
    { id: "age", name: "Age", type: "number", sample: "1 to 36" },
    { id: "name", name: "Name", type: "string", sample: "34 values" },
    { id: "active", name: "Active", type: "boolean", sample: "2 values" },
    { id: "joined", name: "Joined", type: "date", sample: "2019 to 2024" },
    { id: "city", name: "City", type: "category", sample: "6 values" },
    { id: "code", name: "Code", type: "id", keywords: ["member_code"] },
    { id: "notes", name: "Notes", type: "other" },
    { id: "weight", name: "Weight", type: "number", sample: "0.1 to 9" },
];

const GROUPED: DataField[] = [
    { id: "age", name: "Age", type: "number", group: "Data", sample: "1 to 36" },
    { id: "city", name: "City", type: "category", group: "Data", sample: "6 values" },
    { id: "rank", name: "Page rank", type: "number", group: "Results", sample: "0 to 0.2" },
    { id: "community", name: "Community", type: "category", group: "Results", sample: "4 values" },
    { id: "degree", name: "Degree", type: "number", group: "Structure", sample: "1 to 16" },
    { id: "nodeId", name: "Node id", type: "id", group: "Structure" },
];

/**
 * A picker that keeps its own value.
 * @param props - the picker's props, value and onChange aside
 * @returns the picker
 */
function Stateful(
    props: Omit<DataFieldPickerProps, "value" | "onChange"> & { initial?: string | null },
): React.JSX.Element {
    const { initial = null, ...rest } = props;
    const [value, setValue] = useState<string | null>(initial);
    return <DataFieldPicker {...rest} value={value} onChange={setValue} />;
}

export const Default: Story = {
    render: () => <Stateful label="Size by" fields={FIELDS} initial="age" />,
};

export const Grouped: Story = {
    render: () => <Stateful label="Color by" fields={GROUPED} clearable />,
};

export const WithActions: Story = {
    render: function WithActions() {
        const [action, setAction] = useState<string | undefined>("fixed");
        const [value, setValue] = useState<string | null>(null);
        return (
            <DataFieldPicker
                label="Size by"
                fields={FIELDS}
                value={value}
                actions={[{ id: "fixed", label: "Fixed size", description: "One size for all" }]}
                actionValue={action}
                onAction={setAction}
                onChange={(next) => {
                    setAction(undefined);
                    setValue(next);
                }}
            />
        );
    },
};

export const DisabledFields: Story = {
    name: "Disabled fields",
    render: () => (
        <Stateful
            label="Size by"
            fields={[
                ...FIELDS.slice(0, 3),
                { id: "city", name: "City", type: "category", disabledReason: "Holds groups, not amounts" },
                { id: "notes", name: "Notes", type: "other", disabledReason: "Has no values" },
            ]}
        />
    ),
};

export const Empty: Story = {
    render: () => <Stateful label="Size by" fields={[]} emptyText="The nodes carry no values yet. Load data first." />,
};

export const InFieldRow: Story = {
    render: () => (
        <Stack gap={0} style={{ width: 240 }}>
            <PanelLabelsProvider showLabels>
                <FieldRow>
                    <Stateful label="Size by" fields={FIELDS} initial="age" />
                    <Stateful label="Color by" fields={GROUPED} initial="community" />
                </FieldRow>
            </PanelLabelsProvider>
            <Text size="xs" c="dimmed">
                The label is the small caption above each picker.
            </Text>
        </Stack>
    ),
};

export const Disabled: Story = {
    render: () => (
        <Stateful
            label="Size by"
            fields={FIELDS}
            initial="age"
            disabled
            disabledReason="Load data to size nodes by a value."
        />
    ),
};
