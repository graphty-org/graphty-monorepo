import {
    ActionIcon,
    Box,
    Button,
    Checkbox,
    ColorInput,
    Divider,
    Group,
    NativeSelect,
    NumberInput,
    SegmentedControl,
    Slider,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import type {Meta, StoryObj} from "@storybook/react";
import {ChevronDown, Plus, Settings} from "lucide-react";

import {CompactComponentsDemo} from "../../components/demo/CompactComponentsDemo";

/**
 * Compact Components Overview
 *
 * The compact size system provides a consistent 24px height and 11px font size
 * across all form components, designed for dense UI layouts like properties panels.
 *
 * ## Specifications
 *
 * | Component | Height | Font Size |
 * |-----------|--------|-----------|
 * | Input components | 24px | 11px |
 * | SegmentedControl | auto | 10px |
 * | Checkbox | 16px | 11px |
 * | Switch | 16px | 11px |
 * | Slider track | 4px | - |
 * | Button | 24px | 11px |
 * | ActionIcon | 24px | - |
 * | Badge | 14px | 9px |
 * | Pill | 16px | 10px |
 */
const meta: Meta = {
    title: "Compact/Overview",
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <Box p="md" style={{minWidth: 500, backgroundColor: "var(--mantine-color-body)"}}>
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj;

export const Introduction: Story = {
    render: () => (
        <Stack gap="lg">
            <Box>
                <Title order={2} mb="md">Compact Component System</Title>
                <Text c="dimmed" mb="lg">
                    The compact size provides a dense UI suitable for properties panels,
                    toolbars, and data-heavy interfaces. All components use{" "}
                    <code>size="compact"</code> to achieve consistent 24px heights and 11px fonts.
                </Text>
            </Box>

            <Box>
                <Title order={4} mb="sm">Quick Example</Title>
                <Box
                    p="sm"
                    style={{
                        backgroundColor: "var(--mantine-color-default-hover)",
                        borderRadius: "var(--mantine-radius-sm)",
                    }}
                >
                    <Text size="xs" fw={500} mb="sm">Node Properties</Text>
                    <Stack gap={8}>
                        <Group grow>
                            <NativeSelect
                                size="compact"
                                data={["Sphere", "Cube", "Cone"]}
                                rightSection={<ChevronDown size={14} />}
                            />
                            <NumberInput
                                size="compact"
                                defaultValue={1.0}
                                decimalScale={1}
                                hideControls
                            />
                        </Group>
                        <SegmentedControl
                            size="compact"
                            data={["Solid", "Gradient"]}
                            fullWidth
                        />
                        <Group>
                            <ColorInput size="compact" defaultValue="#5B8FF9" style={{flex: 1}} />
                            <NumberInput size="compact" defaultValue={100} suffix="%" w={60} hideControls />
                        </Group>
                        <Slider size="compact" defaultValue={75} label={(val) => `${val}%`} />
                        <Group gap="md">
                            <Checkbox size="compact" label="Visible" defaultChecked />
                            <Checkbox size="compact" label="Selectable" defaultChecked />
                        </Group>
                        <Group justify="flex-end">
                            <Button size="compact" variant="subtle">Reset</Button>
                            <Button size="compact">Apply</Button>
                        </Group>
                    </Stack>
                </Box>
            </Box>
        </Stack>
    ),
};

export const SizeSpecifications: Story = {
    render: () => (
        <Stack gap="lg">
            <Title order={3}>CSS Variable Specifications</Title>

            <Box
                p="md"
                style={{
                    backgroundColor: "var(--mantine-color-default)",
                    borderRadius: "var(--mantine-radius-sm)",
                    fontFamily: "monospace",
                    fontSize: "12px",
                }}
            >
                <Text component="pre" style={{margin: 0, whiteSpace: "pre-wrap"}}>
                    {`/* Input Components */
--input-size: 24px;
--input-fz: 11px;
--input-padding-x: 8px;
--input-bg: var(--mantine-color-default);
--input-bd: none;

/* SegmentedControl */
--sc-font-size: 10px;
--sc-padding: 4px 8px;

/* Checkbox */
--checkbox-size: 16px;

/* Switch */
--switch-height: 16px;
--switch-width: 28px;
--switch-thumb-size: 12px;

/* Radio */
--radio-size: 16px;
--radio-icon-size: 6px;

/* Slider */
--slider-size: 4px;
--slider-thumb-size: 12px;

/* Button */
--button-height: 24px;
--button-fz: 11px;
--button-padding-x: 8px;

/* ActionIcon */
--ai-size: 24px;

/* Badge */
--badge-height: 14px;
--badge-fz: 9px;
--badge-padding-x: 4px;

/* Pill */
--pill-height: 16px;
--pill-fz: 10px;`}
                </Text>
            </Box>
        </Stack>
    ),
};

export const AllComponents: Story = {
    name: "All Components Demo",
    parameters: {
        layout: "fullscreen",
    },
    decorators: [
        (Story) => <Story />,
    ],
    render: () => <CompactComponentsDemo />,
};

export const PropertiesPanelExample: Story = {
    render: () => (
        <Box
            p="sm"
            style={{
                backgroundColor: "var(--mantine-color-default-hover)",
                borderRadius: "var(--mantine-radius-sm)",
                width: 260,
            }}
        >
            <Group justify="space-between" mb="sm">
                <Text size="xs" fw={500}>Node Style</Text>
                <ActionIcon size="compact" variant="subtle">
                    <Settings size={14} />
                </ActionIcon>
            </Group>

            <Stack gap={8}>
                <Box>
                    <Text size="xs" c="dimmed" mb={2}>Shape</Text>
                    <Group gap={4} grow>
                        <NativeSelect
                            size="compact"
                            data={[
                                {group: "Basic", items: ["Sphere", "Cube"]},
                                {group: "Advanced", items: ["Torus", "Cone"]},
                            ]}
                            rightSection={<ChevronDown size={14} />}
                        />
                        <NumberInput
                            size="compact"
                            defaultValue={1.0}
                            min={0.1}
                            max={10}
                            step={0.1}
                            decimalScale={1}
                            hideControls
                        />
                    </Group>
                </Box>

                <Divider />

                <Box>
                    <Text size="xs" c="dimmed" mb={2}>Color Mode</Text>
                    <SegmentedControl
                        size="compact"
                        data={["Solid", "Gradient", "Radial"]}
                        fullWidth
                    />
                </Box>

                <Box>
                    <Text size="xs" c="dimmed" mb={2}>Color</Text>
                    <Group gap={8}>
                        <ColorInput
                            size="compact"
                            defaultValue="#5b8ff9"
                            style={{flex: 1}}
                        />
                        <NumberInput
                            size="compact"
                            defaultValue={100}
                            min={0}
                            max={100}
                            hideControls
                            suffix="%"
                            w={60}
                        />
                    </Group>
                </Box>

                <Divider />

                <Box>
                    <Text size="xs" c="dimmed" mb={2}>Visibility</Text>
                    <Group gap="md">
                        <Checkbox size="compact" label="Visible" defaultChecked />
                        <Checkbox size="compact" label="Selectable" defaultChecked />
                    </Group>
                </Box>

                <Box>
                    <Text size="xs" c="dimmed" mb={2}>Opacity</Text>
                    <Slider
                        size="compact"
                        defaultValue={100}
                        min={0}
                        max={100}
                        label={(val) => `${val}%`}
                    />
                </Box>

                <Divider />

                <Group gap="xs" justify="flex-end">
                    <Button size="compact" variant="subtle">Reset</Button>
                    <Button size="compact">Apply</Button>
                </Group>
            </Stack>
        </Box>
    ),
};

export const FigmaStyleColorRow: Story = {
    name: "Figma-Style Color Row",
    render: () => (
        <Stack gap="lg">
            <Box>
                <Title order={4} mb="sm">Figma-style Fill Row</Title>
                <Text size="xs" c="dimmed" mb="md">
                    Pattern: [color swatch] [hex value] | [opacity%] [visibility] [delete]
                </Text>

                <Group gap={0}>
                    <ActionIcon
                        variant="filled"
                        size={24}
                        radius={0}
                        style={{
                            backgroundColor: "var(--mantine-color-default)",
                            borderRadius: "4px 0 0 4px",
                        }}
                    >
                        <Box
                            style={{
                                width: 14,
                                height: 14,
                                borderRadius: 2,
                                backgroundColor: "#5B8FF9",
                                border: "1px solid var(--mantine-color-default-border)",
                            }}
                        />
                    </ActionIcon>
                    <TextInput
                        size="compact"
                        defaultValue="5B8FF9"
                        w={96}
                        styles={{
                            input: {
                                borderRadius: 0,
                                fontFamily: "monospace",
                                textTransform: "uppercase",
                            },
                        }}
                    />
                    <Box
                        style={{
                            width: 1,
                            height: 24,
                            backgroundColor: "var(--mantine-color-default-border)",
                        }}
                    />
                    <NumberInput
                        size="compact"
                        defaultValue={100}
                        min={0}
                        max={100}
                        hideControls
                        suffix="%"
                        w={56}
                        styles={{
                            input: {
                                borderRadius: "0 4px 4px 0",
                                textAlign: "right",
                            },
                        }}
                    />
                    <Group gap={4} ml={8}>
                        <ActionIcon size="compact" variant="subtle">
                            <Plus size={14} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Box>
        </Stack>
    ),
};
