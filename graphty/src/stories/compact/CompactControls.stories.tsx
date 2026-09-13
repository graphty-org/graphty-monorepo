import { Box, Checkbox, Group, Radio, SegmentedControl, Slider, Stack, Switch, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Compact Control Components
 *
 * These stories demonstrate control components (checkboxes, switches, sliders, etc.)
 * styled with `size="compact"` for dense UI layouts.
 */
const meta: Meta = {
    title: "Compact/Controls",
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <Box p="md" style={{ minWidth: 400, backgroundColor: "var(--mantine-color-body)" }}>
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj;

/**
 * Caption carried by every size comparison in this file.
 *
 * `size="compact"` is this app's legacy size name, and compact-mantine resolves it
 * to the same scale entry as `size="sm"` -- every scale in
 * compact-mantine/src/theme/styles/controls.ts declares `compactSize: "sm"`. The two
 * rows are therefore meant to match, and saying so keeps the comparison from reading
 * as the flattened size axis it exists to disprove (product owner, 2026-09-13:
 * "sizes aren't varying anymore").
 */
const COMPACT_ALIAS_CAPTION =
    'size="compact" is the legacy alias of sm: both resolve to the same entry of the compact scale, so those two rows match by design. xs and md show the axis varying.';

/** The note the compact row of a size comparison carries under its token. */
const COMPACT_ALIAS_NOTE = "legacy alias of sm";

interface SizeLabelProps {
    /** The size token the row renders. */
    readonly token: string;
    /** Why the row may match its neighbour; omitted for rows that stand alone. */
    readonly note?: string;
}

/**
 * The left-hand label of one size-comparison row.
 *
 * Duplicated in CompactButtons.stories.tsx rather than shared: a module exported
 * from a `.stories.tsx` file is picked up by Storybook as a story of its own.
 */
function SizeLabel({ token, note }: SizeLabelProps): React.JSX.Element {
    return (
        <Box w={140}>
            <Text size="xs" c="dimmed">
                {token}
            </Text>
            {note === undefined ? null : (
                <Text size="xs" c="dimmed" fs="italic">
                    {note}
                </Text>
            )}
        </Box>
    );
}

// SegmentedControl Stories
export const SegmentedControlBasic: Story = {
    name: "SegmentedControl - Basic",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Basic
                </Text>
                <SegmentedControl size="compact" data={["Solid", "Gradient", "Radial"]} />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Full Width
                </Text>
                <SegmentedControl size="compact" data={["2D", "3D"]} fullWidth />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    With Values
                </Text>
                <SegmentedControl
                    size="compact"
                    data={[
                        { value: "sphere", label: "Sphere" },
                        { value: "cube", label: "Cube" },
                        { value: "cylinder", label: "Cylinder" },
                    ]}
                    defaultValue="sphere"
                />
            </Box>
        </Stack>
    ),
};

export const SegmentedControlSizeComparison: Story = {
    name: "SegmentedControl - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Text size="xs" c="dimmed">
                {COMPACT_ALIAS_CAPTION}
            </Text>
            <Group gap="md" align="center">
                <SizeLabel token="xs" />
                <SegmentedControl size="xs" data={["A", "B", "C"]} />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="sm" />
                <SegmentedControl size="sm" data={["A", "B", "C"]} />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="compact" note={COMPACT_ALIAS_NOTE} />
                <SegmentedControl size="compact" data={["A", "B", "C"]} />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="md" />
                <SegmentedControl size="md" data={["A", "B", "C"]} />
            </Group>
        </Stack>
    ),
};

// Checkbox Stories
export const CheckboxBasic: Story = {
    name: "Checkbox - Basic",
    render: () => (
        <Stack gap="md">
            <Checkbox size="compact" label="Enable feature" defaultChecked />
            <Checkbox size="compact" label="Disabled option" disabled />
            <Checkbox size="compact" label="Indeterminate" indeterminate />
        </Stack>
    ),
};

export const CheckboxGroup: Story = {
    name: "Checkbox - Group",
    render: () => (
        <Stack gap="md">
            <Text size="xs" c="dimmed">
                Select options:
            </Text>
            <Group gap="lg">
                <Checkbox size="compact" label="Visible" defaultChecked />
                <Checkbox size="compact" label="Selectable" defaultChecked />
                <Checkbox size="compact" label="Draggable" />
            </Group>
        </Stack>
    ),
};

export const CheckboxSizeComparison: Story = {
    name: "Checkbox - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Text size="xs" c="dimmed">
                {COMPACT_ALIAS_CAPTION}
            </Text>
            <Group gap="md" align="center">
                <SizeLabel token="xs" />
                <Checkbox size="xs" label="Size xs" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="sm" />
                <Checkbox size="sm" label="Size sm" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="compact" note={COMPACT_ALIAS_NOTE} />
                <Checkbox size="compact" label="Size compact" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="md" />
                <Checkbox size="md" label="Size md" />
            </Group>
        </Stack>
    ),
};

// Switch Stories
export const SwitchBasic: Story = {
    name: "Switch - Basic",
    render: () => (
        <Stack gap="md">
            <Switch size="compact" label="Toggle option" defaultChecked />
            <Switch size="compact" label="Disabled" disabled />
            <Switch size="compact" label="With on/off labels" onLabel="ON" offLabel="OFF" />
        </Stack>
    ),
};

export const SwitchSizeComparison: Story = {
    name: "Switch - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Text size="xs" c="dimmed">
                {COMPACT_ALIAS_CAPTION}
            </Text>
            <Group gap="md" align="center">
                <SizeLabel token="xs" />
                <Switch size="xs" label="Size xs" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="sm" />
                <Switch size="sm" label="Size sm" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="compact" note={COMPACT_ALIAS_NOTE} />
                <Switch size="compact" label="Size compact" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="md" />
                <Switch size="md" label="Size md" />
            </Group>
        </Stack>
    ),
};

// Radio Stories
export const RadioBasic: Story = {
    name: "Radio - Basic",
    render: () => (
        <Radio.Group name="demo" defaultValue="option1">
            <Stack gap="xs">
                <Radio size="compact" value="option1" label="Option 1" />
                <Radio size="compact" value="option2" label="Option 2" />
                <Radio size="compact" value="option3" label="Option 3" />
            </Stack>
        </Radio.Group>
    ),
};

export const RadioHorizontal: Story = {
    name: "Radio - Horizontal",
    render: () => (
        <Radio.Group name="horizontal" defaultValue="sphere">
            <Group gap="lg">
                <Radio size="compact" value="sphere" label="Sphere" />
                <Radio size="compact" value="cube" label="Cube" />
                <Radio size="compact" value="cone" label="Cone" />
            </Group>
        </Radio.Group>
    ),
};

export const RadioSizeComparison: Story = {
    name: "Radio - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Text size="xs" c="dimmed">
                {COMPACT_ALIAS_CAPTION}
            </Text>
            <Group gap="md" align="center">
                <SizeLabel token="xs" />
                <Radio size="xs" label="Size xs" value="xs" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="sm" />
                <Radio size="sm" label="Size sm" value="sm" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="compact" note={COMPACT_ALIAS_NOTE} />
                <Radio size="compact" label="Size compact" value="compact" />
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="md" />
                <Radio size="md" label="Size md" value="md" />
            </Group>
        </Stack>
    ),
};

// Slider Stories
export const SliderBasic: Story = {
    name: "Slider - Basic",
    render: () => (
        <Stack gap="lg">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Basic slider
                </Text>
                <Slider size="compact" defaultValue={50} />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    With label
                </Text>
                <Slider size="compact" defaultValue={75} label={(val) => `${val}%`} />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    With marks
                </Text>
                <Slider
                    size="compact"
                    defaultValue={50}
                    marks={[
                        { value: 0, label: "0%" },
                        { value: 50, label: "50%" },
                        { value: 100, label: "100%" },
                    ]}
                />
            </Box>
        </Stack>
    ),
};

export const SliderSizeComparison: Story = {
    name: "Slider - Size Comparison",
    render: () => (
        <Stack gap="lg">
            <Text size="xs" c="dimmed">
                {COMPACT_ALIAS_CAPTION}
            </Text>
            <Stack gap={4}>
                <SizeLabel token="xs" />
                <Slider size="xs" defaultValue={50} />
            </Stack>
            <Stack gap={4}>
                <SizeLabel token="sm" />
                <Slider size="sm" defaultValue={50} />
            </Stack>
            <Stack gap={4}>
                <SizeLabel token="compact" note={COMPACT_ALIAS_NOTE} />
                <Slider size="compact" defaultValue={50} />
            </Stack>
            <Stack gap={4}>
                <SizeLabel token="md" />
                <Slider size="md" defaultValue={50} />
            </Stack>
        </Stack>
    ),
};

// All Controls Combined
export const AllControls: Story = {
    name: "All Controls Overview",
    render: () => (
        <Stack gap="lg">
            <Box>
                <Text fw={500} mb="xs">
                    SegmentedControl
                </Text>
                <SegmentedControl size="compact" data={["Solid", "Gradient", "Radial"]} />
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    Checkboxes
                </Text>
                <Group gap="lg">
                    <Checkbox size="compact" label="Visible" defaultChecked />
                    <Checkbox size="compact" label="Selectable" defaultChecked />
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    Switches
                </Text>
                <Group gap="lg">
                    <Switch size="compact" label="Auto-save" defaultChecked />
                    <Switch size="compact" label="Notifications" />
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    Radio Group
                </Text>
                <Radio.Group name="all-controls" defaultValue="opt1">
                    <Group gap="lg">
                        <Radio size="compact" value="opt1" label="Option 1" />
                        <Radio size="compact" value="opt2" label="Option 2" />
                        <Radio size="compact" value="opt3" label="Option 3" />
                    </Group>
                </Radio.Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    Slider
                </Text>
                <Slider size="compact" defaultValue={75} label={(val) => `${val}%`} />
            </Box>
        </Stack>
    ),
};
