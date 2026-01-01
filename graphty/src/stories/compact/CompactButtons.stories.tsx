import { ActionIcon, Box, Button, Divider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { AlignLeft, ChevronDown, Copy, Hash, Palette, Plus, Settings, Trash, Type } from "lucide-react";

/**
 * Compact Button Components
 *
 * These stories demonstrate Button and ActionIcon components
 * styled with `size="compact"` for dense UI layouts.
 */
const meta: Meta = {
    title: "Compact/Buttons",
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

// Button Stories
export const ButtonVariants: Story = {
    name: "Button - Variants",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Variants
                </Text>
                <Group gap="xs">
                    <Button size="compact">Filled</Button>
                    <Button size="compact" variant="light">
                        Light
                    </Button>
                    <Button size="compact" variant="outline">
                        Outline
                    </Button>
                    <Button size="compact" variant="subtle">
                        Subtle
                    </Button>
                    <Button size="compact" variant="transparent">
                        Transparent
                    </Button>
                </Group>
            </Box>
        </Stack>
    ),
};

export const ButtonWithIcons: Story = {
    name: "Button - With Icons",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Left section
                </Text>
                <Group gap="xs">
                    <Button size="compact" leftSection={<Plus size={12} />}>
                        Add
                    </Button>
                    <Button size="compact" leftSection={<Settings size={12} />}>
                        Settings
                    </Button>
                    <Button size="compact" leftSection={<Trash size={12} />} color="red">
                        Delete
                    </Button>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Right section
                </Text>
                <Group gap="xs">
                    <Button size="compact" rightSection={<ChevronDown size={12} />}>
                        Menu
                    </Button>
                </Group>
            </Box>
        </Stack>
    ),
};

export const ButtonColors: Story = {
    name: "Button - Colors",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Filled
                </Text>
                <Group gap="xs">
                    <Button size="compact" color="blue">
                        Blue
                    </Button>
                    <Button size="compact" color="green">
                        Green
                    </Button>
                    <Button size="compact" color="red">
                        Red
                    </Button>
                    <Button size="compact" color="yellow">
                        Yellow
                    </Button>
                    <Button size="compact" color="gray">
                        Gray
                    </Button>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Light
                </Text>
                <Group gap="xs">
                    <Button size="compact" variant="light" color="blue">
                        Blue
                    </Button>
                    <Button size="compact" variant="light" color="green">
                        Green
                    </Button>
                    <Button size="compact" variant="light" color="red">
                        Red
                    </Button>
                    <Button size="compact" variant="light" color="yellow">
                        Yellow
                    </Button>
                    <Button size="compact" variant="light" color="gray">
                        Gray
                    </Button>
                </Group>
            </Box>
        </Stack>
    ),
};

export const ButtonSizeComparison: Story = {
    name: "Button - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        xs
                    </Text>
                </Box>
                <Button size="xs">Size xs</Button>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        compact
                    </Text>
                </Box>
                <Button size="compact">Size compact</Button>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        sm
                    </Text>
                </Box>
                <Button size="sm">Size sm</Button>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        md
                    </Text>
                </Box>
                <Button size="md">Size md</Button>
            </Group>
        </Stack>
    ),
};

// ActionIcon Stories
export const ActionIconVariants: Story = {
    name: "ActionIcon - Variants",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Variants
                </Text>
                <Group gap="xs">
                    <ActionIcon size="compact" variant="filled">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="light">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="outline">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="transparent">
                        <Plus size={14} />
                    </ActionIcon>
                </Group>
            </Box>
        </Stack>
    ),
};

export const ActionIconColors: Story = {
    name: "ActionIcon - Colors",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Filled
                </Text>
                <Group gap="xs">
                    <ActionIcon size="compact" color="blue">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" color="green">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" color="red">
                        <Trash size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" color="yellow">
                        <Settings size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" color="gray">
                        <Settings size={14} />
                    </ActionIcon>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Subtle
                </Text>
                <Group gap="xs">
                    <ActionIcon size="compact" variant="subtle" color="blue">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle" color="green">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle" color="red">
                        <Trash size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle" color="yellow">
                        <Settings size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle" color="gray">
                        <Settings size={14} />
                    </ActionIcon>
                </Group>
            </Box>
        </Stack>
    ),
};

export const ActionIconToolbar: Story = {
    name: "ActionIcon - Toolbar Pattern",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Formatting toolbar
                </Text>
                <Group gap={4}>
                    <ActionIcon size="compact" variant="filled">
                        <AlignLeft size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle">
                        <Type size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle">
                        <Palette size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle">
                        <Hash size={14} />
                    </ActionIcon>
                    <Divider orientation="vertical" />
                    <ActionIcon size="compact" variant="subtle">
                        <Copy size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle" color="red">
                        <Trash size={14} />
                    </ActionIcon>
                </Group>
            </Box>
        </Stack>
    ),
};

export const ActionIconSizeComparison: Story = {
    name: "ActionIcon - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        xs
                    </Text>
                </Box>
                <ActionIcon size="xs">
                    <Plus size={12} />
                </ActionIcon>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        compact
                    </Text>
                </Box>
                <ActionIcon size="compact">
                    <Plus size={14} />
                </ActionIcon>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        sm
                    </Text>
                </Box>
                <ActionIcon size="sm">
                    <Plus size={16} />
                </ActionIcon>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        md
                    </Text>
                </Box>
                <ActionIcon size="md">
                    <Plus size={18} />
                </ActionIcon>
            </Group>
        </Stack>
    ),
};

// All Buttons Combined
export const AllButtons: Story = {
    name: "All Buttons Overview",
    render: () => (
        <Stack gap="lg">
            <Box>
                <Text fw={500} mb="xs">
                    Button Variants
                </Text>
                <Group gap="xs">
                    <Button size="compact">Filled</Button>
                    <Button size="compact" variant="light">
                        Light
                    </Button>
                    <Button size="compact" variant="outline">
                        Outline
                    </Button>
                    <Button size="compact" variant="subtle">
                        Subtle
                    </Button>
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    Button with Icons
                </Text>
                <Group gap="xs">
                    <Button size="compact" leftSection={<Plus size={12} />}>
                        Add Item
                    </Button>
                    <Button size="compact" rightSection={<Settings size={12} />}>
                        Settings
                    </Button>
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    ActionIcon Variants
                </Text>
                <Group gap="xs">
                    <ActionIcon size="compact" variant="filled">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="light">
                        <Settings size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle">
                        <Trash size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="outline">
                        <ChevronDown size={14} />
                    </ActionIcon>
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    ActionIcon Toolbar
                </Text>
                <Group gap={4}>
                    <ActionIcon size="compact" variant="filled">
                        <AlignLeft size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle">
                        <Type size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle">
                        <Palette size={14} />
                    </ActionIcon>
                    <Divider orientation="vertical" />
                    <ActionIcon size="compact" variant="subtle">
                        <Copy size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="subtle" color="red">
                        <Trash size={14} />
                    </ActionIcon>
                </Group>
            </Box>
        </Stack>
    ),
};
