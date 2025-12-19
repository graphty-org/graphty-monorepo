import {
    Box,
    Checkbox,
    Group,
    Radio,
    SegmentedControl,
    Slider,
    Stack,
    Switch,
    Text,
} from "@mantine/core";
import type {Meta, StoryObj} from "@storybook/react";

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
            <Box p="md" style={{minWidth: 400, backgroundColor: "var(--mantine-color-body)"}}>
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj;

// SegmentedControl Stories
export const SegmentedControlBasic: Story = {
    name: "SegmentedControl - Basic",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>Basic</Text>
                <SegmentedControl
                    size="compact"
                    data={["Solid", "Gradient", "Radial"]}
                />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>Full Width</Text>
                <SegmentedControl
                    size="compact"
                    data={["2D", "3D"]}
                    fullWidth
                />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>With Values</Text>
                <SegmentedControl
                    size="compact"
                    data={[
                        {value: "sphere", label: "Sphere"},
                        {value: "cube", label: "Cube"},
                        {value: "cylinder", label: "Cylinder"},
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
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">xs</Text></Box>
                <SegmentedControl size="xs" data={["A", "B", "C"]} />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">compact</Text></Box>
                <SegmentedControl size="compact" data={["A", "B", "C"]} />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">sm</Text></Box>
                <SegmentedControl size="sm" data={["A", "B", "C"]} />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">md</Text></Box>
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
            <Text size="xs" c="dimmed">Select options:</Text>
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
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">xs</Text></Box>
                <Checkbox size="xs" label="Size xs" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">compact</Text></Box>
                <Checkbox size="compact" label="Size compact" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">sm</Text></Box>
                <Checkbox size="sm" label="Size sm" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">md</Text></Box>
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
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">xs</Text></Box>
                <Switch size="xs" label="Size xs" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">compact</Text></Box>
                <Switch size="compact" label="Size compact" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">sm</Text></Box>
                <Switch size="sm" label="Size sm" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">md</Text></Box>
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
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">xs</Text></Box>
                <Radio size="xs" label="Size xs" value="xs" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">compact</Text></Box>
                <Radio size="compact" label="Size compact" value="compact" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">sm</Text></Box>
                <Radio size="sm" label="Size sm" value="sm" />
            </Group>
            <Group gap="md" align="center">
                <Box w={80}><Text size="xs" c="dimmed">md</Text></Box>
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
                <Text size="xs" c="dimmed" mb={4}>Basic slider</Text>
                <Slider size="compact" defaultValue={50} />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>With label</Text>
                <Slider
                    size="compact"
                    defaultValue={75}
                    label={(val) => `${val}%`}
                />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>With marks</Text>
                <Slider
                    size="compact"
                    defaultValue={50}
                    marks={[
                        {value: 0, label: "0%"},
                        {value: 50, label: "50%"},
                        {value: 100, label: "100%"},
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
            <Box>
                <Text size="xs" c="dimmed" mb={4}>xs</Text>
                <Slider size="xs" defaultValue={50} />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>compact</Text>
                <Slider size="compact" defaultValue={50} />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>sm</Text>
                <Slider size="sm" defaultValue={50} />
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>md</Text>
                <Slider size="md" defaultValue={50} />
            </Box>
        </Stack>
    ),
};

// All Controls Combined
export const AllControls: Story = {
    name: "All Controls Overview",
    render: () => (
        <Stack gap="lg">
            <Box>
                <Text fw={500} mb="xs">SegmentedControl</Text>
                <SegmentedControl
                    size="compact"
                    data={["Solid", "Gradient", "Radial"]}
                />
            </Box>

            <Box>
                <Text fw={500} mb="xs">Checkboxes</Text>
                <Group gap="lg">
                    <Checkbox size="compact" label="Visible" defaultChecked />
                    <Checkbox size="compact" label="Selectable" defaultChecked />
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">Switches</Text>
                <Group gap="lg">
                    <Switch size="compact" label="Auto-save" defaultChecked />
                    <Switch size="compact" label="Notifications" />
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">Radio Group</Text>
                <Radio.Group name="all-controls" defaultValue="opt1">
                    <Group gap="lg">
                        <Radio size="compact" value="opt1" label="Option 1" />
                        <Radio size="compact" value="opt2" label="Option 2" />
                        <Radio size="compact" value="opt3" label="Option 3" />
                    </Group>
                </Radio.Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">Slider</Text>
                <Slider
                    size="compact"
                    defaultValue={75}
                    label={(val) => `${val}%`}
                />
            </Box>
        </Stack>
    ),
};
