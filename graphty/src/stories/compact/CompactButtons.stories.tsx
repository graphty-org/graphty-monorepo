import { ActionIcon, Box, Button, Divider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { AlignLeft, ChevronDown, Copy, Hash, Palette, Plus, Settings, Trash, Type } from "lucide-react";

/**
 * Compact Button Components
 *
 * These stories demonstrate Button and ActionIcon components
 * styled with `size="compact"` for dense UI layouts.
 *
 * Every group whose heading names a variant passes that variant explicitly. The
 * compact theme sets `defaultProps: {variant: "subtle"}` on ActionIcon
 * (compact-mantine/src/theme/components/buttons.ts), so an ActionIcon with no
 * variant renders subtle rather than Mantine's stock filled -- a "Filled" heading
 * over variant-less icons is what the product owner reported on 2026-09-13
 * ("filled icons aren't filled", Compact/Buttons "ActionIcon - Colors"). The
 * theme default stays; the stories say what they demonstrate.
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

/**
 * Caption carried by every size comparison in this file.
 *
 * `size="compact"` is this app's legacy size name, and compact-mantine resolves it
 * to the same scale entry as `size="sm"` -- `compactSize: "sm"` in
 * compact-mantine/src/theme/styles/buttons.ts. The two rows are therefore meant to
 * match, and saying so keeps the comparison from reading as the flattened size axis
 * it exists to disprove.
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
 * Duplicated in CompactControls.stories.tsx rather than shared: a module exported
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
                    <Button size="compact" variant="filled">
                        Filled
                    </Button>
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
                    <Button size="compact" variant="filled" color="blue">
                        Blue
                    </Button>
                    <Button size="compact" variant="filled" color="green">
                        Green
                    </Button>
                    <Button size="compact" variant="filled" color="red">
                        Red
                    </Button>
                    <Button size="compact" variant="filled" color="yellow">
                        Yellow
                    </Button>
                    <Button size="compact" variant="filled" color="gray">
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
            <Text size="xs" c="dimmed">
                {COMPACT_ALIAS_CAPTION}
            </Text>
            <Group gap="md" align="center">
                <SizeLabel token="xs" />
                <Button size="xs">Size xs</Button>
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="sm" />
                <Button size="sm">Size sm</Button>
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="compact" note={COMPACT_ALIAS_NOTE} />
                <Button size="compact">Size compact</Button>
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="md" />
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
                    <ActionIcon size="compact" variant="filled" color="blue">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="filled" color="green">
                        <Plus size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="filled" color="red">
                        <Trash size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="filled" color="yellow">
                        <Settings size={14} />
                    </ActionIcon>
                    <ActionIcon size="compact" variant="filled" color="gray">
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
            <Text size="xs" c="dimmed">
                {COMPACT_ALIAS_CAPTION}
            </Text>
            <Group gap="md" align="center">
                <SizeLabel token="xs" />
                <ActionIcon size="xs">
                    <Plus size={12} />
                </ActionIcon>
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="sm" />
                <ActionIcon size="sm">
                    <Plus size={16} />
                </ActionIcon>
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="compact" note={COMPACT_ALIAS_NOTE} />
                <ActionIcon size="compact">
                    <Plus size={14} />
                </ActionIcon>
            </Group>
            <Group gap="md" align="center">
                <SizeLabel token="md" />
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
                    <Button size="compact" variant="filled">
                        Filled
                    </Button>
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
