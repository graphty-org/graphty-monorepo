import {
    Autocomplete,
    Box,
    ColorInput,
    Group,
    NativeSelect,
    NumberInput,
    PasswordInput,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
} from "@mantine/core";
import type {Meta, StoryObj} from "@storybook/react";
import {ChevronDown} from "lucide-react";

/**
 * Compact Input Components
 *
 * These stories demonstrate all input components styled with `size="compact"`,
 * which provides a 24px height and 11px font size - perfect for dense properties panels.
 */
const meta: Meta = {
    title: "Compact/Inputs",
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

// TextInput Stories
export const TextInputBasic: Story = {
    name: "TextInput - Basic",
    render: () => (
        <Stack gap="md">
            <TextInput size="compact" label="Label" placeholder="Enter text..." />
            <TextInput size="compact" placeholder="Without label" />
            <TextInput size="compact" label="With value" value="Sample text" readOnly />
        </Stack>
    ),
};

export const TextInputWithIcons: Story = {
    name: "TextInput - With Icons",
    render: () => (
        <Stack gap="md">
            <TextInput
                size="compact"
                label="Width"
                value="400"
                leftSection={<Text size="xs" c="dimmed" fw={500}>W</Text>}
                leftSectionWidth={24}
                leftSectionPointerEvents="none"
                styles={{input: {paddingLeft: 28}}}
            />
            <TextInput
                size="compact"
                label="Height"
                value="300"
                leftSection={<Text size="xs" c="dimmed" fw={500}>H</Text>}
                leftSectionWidth={24}
                leftSectionPointerEvents="none"
                styles={{input: {paddingLeft: 28}}}
            />
        </Stack>
    ),
};

export const TextInputSizeComparison: Story = {
    name: "TextInput - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Group gap="md" align="flex-end">
                <Box w={100}><Text size="xs" c="dimmed">xs (28px)</Text></Box>
                <TextInput size="xs" placeholder="Size xs" style={{flex: 1}} />
            </Group>
            <Group gap="md" align="flex-end">
                <Box w={100}><Text size="xs" c="dimmed">compact (24px)</Text></Box>
                <TextInput size="compact" placeholder="Size compact" style={{flex: 1}} />
            </Group>
            <Group gap="md" align="flex-end">
                <Box w={100}><Text size="xs" c="dimmed">sm (32px)</Text></Box>
                <TextInput size="sm" placeholder="Size sm" style={{flex: 1}} />
            </Group>
            <Group gap="md" align="flex-end">
                <Box w={100}><Text size="xs" c="dimmed">md (36px)</Text></Box>
                <TextInput size="md" placeholder="Size md" style={{flex: 1}} />
            </Group>
        </Stack>
    ),
};

// NumberInput Stories
export const NumberInputBasic: Story = {
    name: "NumberInput - Basic",
    render: () => (
        <Stack gap="md">
            <NumberInput size="compact" label="With controls" defaultValue={42} min={0} max={100} />
            <NumberInput size="compact" label="Without controls" defaultValue={42} hideControls />
            <NumberInput size="compact" label="With suffix" defaultValue={100} suffix="%" hideControls />
            <NumberInput size="compact" label="With decimal" defaultValue={3.14} decimalScale={2} step={0.01} hideControls />
        </Stack>
    ),
};

export const NumberInputWithUnits: Story = {
    name: "NumberInput - With Units",
    render: () => (
        <Group gap={8}>
            <NumberInput size="compact" defaultValue={0} suffix="°" hideControls style={{flex: 1}} />
            <NumberInput size="compact" defaultValue={100} suffix="%" hideControls style={{flex: 1}} />
            <NumberInput size="compact" defaultValue={12} suffix="px" hideControls style={{flex: 1}} />
        </Group>
    ),
};

// NativeSelect Stories
export const NativeSelectBasic: Story = {
    name: "NativeSelect - Basic",
    render: () => (
        <Stack gap="md">
            <NativeSelect
                size="compact"
                label="Basic select"
                data={["Option 1", "Option 2", "Option 3"]}
            />
            <NativeSelect
                size="compact"
                label="With custom icon"
                data={["Option 1", "Option 2", "Option 3"]}
                rightSection={<ChevronDown size={14} />}
            />
            <NativeSelect
                size="compact"
                label="With groups"
                data={[
                    {group: "Basic", items: ["Sphere", "Cube"]},
                    {group: "Advanced", items: ["Torus", "Cone"]},
                ]}
            />
        </Stack>
    ),
};

// Select Stories
export const SelectBasic: Story = {
    name: "Select - Basic",
    render: () => (
        <Stack gap="md">
            <Select
                size="compact"
                label="Searchable select"
                placeholder="Pick one"
                data={["React", "Vue", "Angular", "Svelte", "Solid"]}
                searchable
            />
            <Select
                size="compact"
                label="With clearable"
                placeholder="Pick one"
                data={["Option 1", "Option 2", "Option 3"]}
                clearable
            />
        </Stack>
    ),
};

// Autocomplete Stories
export const AutocompleteBasic: Story = {
    name: "Autocomplete - Basic",
    render: () => (
        <Stack gap="md">
            <Autocomplete
                size="compact"
                label="Autocomplete"
                placeholder="Type to search..."
                data={["React", "Vue", "Angular", "Svelte", "Solid"]}
            />
        </Stack>
    ),
};

// ColorInput Stories
export const ColorInputBasic: Story = {
    name: "ColorInput - Basic",
    render: () => (
        <Stack gap="md">
            <ColorInput
                size="compact"
                label="Color picker"
                defaultValue="#5B8FF9"
            />
            <ColorInput
                size="compact"
                label="With swatches"
                defaultValue="#FF6B6B"
                swatches={["#5B8FF9", "#FF6B6B", "#61D095", "#F7B731", "#9B59B6"]}
            />
            <ColorInput
                size="compact"
                label="With alpha"
                format="hexa"
                defaultValue="#5B8FF980"
            />
        </Stack>
    ),
};

// Textarea Stories
export const TextareaBasic: Story = {
    name: "Textarea - Basic",
    render: () => (
        <Stack gap="md">
            <Textarea
                size="compact"
                label="Description"
                placeholder="Enter description..."
                rows={3}
            />
            <Textarea
                size="compact"
                label="Auto-resize"
                placeholder="Type to grow..."
                autosize
                minRows={2}
                maxRows={6}
            />
        </Stack>
    ),
};

// PasswordInput Stories
export const PasswordInputBasic: Story = {
    name: "PasswordInput - Basic",
    render: () => (
        <Stack gap="md">
            <PasswordInput
                size="compact"
                label="Password"
                placeholder="Enter password..."
            />
            <PasswordInput
                size="compact"
                label="With visibility toggle"
                placeholder="Toggle to see"
                defaultValue="secret123"
            />
        </Stack>
    ),
};

// All Inputs Combined
export const AllInputs: Story = {
    name: "All Inputs Overview",
    render: () => (
        <Stack gap="lg">
            <Box>
                <Text fw={500} mb="xs">Text Inputs</Text>
                <Group grow>
                    <TextInput size="compact" placeholder="TextInput" />
                    <PasswordInput size="compact" placeholder="PasswordInput" />
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">Number Input</Text>
                <Group grow>
                    <NumberInput size="compact" placeholder="With controls" />
                    <NumberInput size="compact" placeholder="No controls" hideControls />
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">Select Inputs</Text>
                <Group grow>
                    <NativeSelect size="compact" data={["Option 1", "Option 2"]} />
                    <Select size="compact" data={["Option 1", "Option 2"]} placeholder="Select" />
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">Other Inputs</Text>
                <Group grow>
                    <Autocomplete size="compact" placeholder="Autocomplete" data={["React", "Vue"]} />
                    <ColorInput size="compact" defaultValue="#5B8FF9" />
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">Textarea</Text>
                <Textarea size="compact" placeholder="Multi-line input..." rows={2} />
            </Box>
        </Stack>
    ),
};
