import { Badge, Box, Group, MantineSize, Pill, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Compact Display Components
 *
 * These stories demonstrate display components (Badge, Pill)
 * styled with `size="compact"` for dense UI layouts.
 */
const meta: Meta = {
    title: "Compact/Display",
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

// Badge Stories
export const BadgeVariants: Story = {
    name: "Badge - Variants",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Variants
                </Text>
                <Group gap="xs">
                    <Badge size="compact">Filled</Badge>
                    <Badge size="compact" variant="light">
                        Light
                    </Badge>
                    <Badge size="compact" variant="outline">
                        Outline
                    </Badge>
                    <Badge size="compact" variant="dot">
                        Dot
                    </Badge>
                </Group>
            </Box>
        </Stack>
    ),
};

export const BadgeColors: Story = {
    name: "Badge - Colors",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Filled
                </Text>
                <Group gap="xs">
                    <Badge size="compact" color="blue">
                        Blue
                    </Badge>
                    <Badge size="compact" color="green">
                        Green
                    </Badge>
                    <Badge size="compact" color="red">
                        Red
                    </Badge>
                    <Badge size="compact" color="yellow">
                        Yellow
                    </Badge>
                    <Badge size="compact" color="gray">
                        Gray
                    </Badge>
                    <Badge size="compact" color="violet">
                        Violet
                    </Badge>
                    <Badge size="compact" color="cyan">
                        Cyan
                    </Badge>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Light
                </Text>
                <Group gap="xs">
                    <Badge size="compact" variant="light" color="blue">
                        Blue
                    </Badge>
                    <Badge size="compact" variant="light" color="green">
                        Green
                    </Badge>
                    <Badge size="compact" variant="light" color="red">
                        Red
                    </Badge>
                    <Badge size="compact" variant="light" color="yellow">
                        Yellow
                    </Badge>
                    <Badge size="compact" variant="light" color="gray">
                        Gray
                    </Badge>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Outline
                </Text>
                <Group gap="xs">
                    <Badge size="compact" variant="outline" color="blue">
                        Blue
                    </Badge>
                    <Badge size="compact" variant="outline" color="green">
                        Green
                    </Badge>
                    <Badge size="compact" variant="outline" color="red">
                        Red
                    </Badge>
                    <Badge size="compact" variant="outline" color="yellow">
                        Yellow
                    </Badge>
                    <Badge size="compact" variant="outline" color="gray">
                        Gray
                    </Badge>
                </Group>
            </Box>
        </Stack>
    ),
};

export const BadgeSizeComparison: Story = {
    name: "Badge - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        xs
                    </Text>
                </Box>
                <Badge size="xs">Size xs</Badge>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        compact
                    </Text>
                </Box>
                <Badge size="compact">Size compact</Badge>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        sm
                    </Text>
                </Box>
                <Badge size="sm">Size sm</Badge>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        md
                    </Text>
                </Box>
                <Badge size="md">Size md</Badge>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        lg
                    </Text>
                </Box>
                <Badge size="lg">Size lg</Badge>
            </Group>
        </Stack>
    ),
};

export const BadgeUseCases: Story = {
    name: "Badge - Use Cases",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Status indicators
                </Text>
                <Group gap="xs">
                    <Badge size="compact" color="green">
                        Active
                    </Badge>
                    <Badge size="compact" color="yellow">
                        Pending
                    </Badge>
                    <Badge size="compact" color="red">
                        Error
                    </Badge>
                    <Badge size="compact" color="gray">
                        Inactive
                    </Badge>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Element types
                </Text>
                <Group gap="xs">
                    <Badge size="compact" variant="light" color="blue">
                        Node
                    </Badge>
                    <Badge size="compact" variant="light" color="green">
                        Edge
                    </Badge>
                    <Badge size="compact" variant="light" color="violet">
                        Label
                    </Badge>
                    <Badge size="compact" variant="light" color="cyan">
                        Group
                    </Badge>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Counts
                </Text>
                <Group gap="xs">
                    <Badge size="compact">12</Badge>
                    <Badge size="compact" color="green">
                        +5
                    </Badge>
                    <Badge size="compact" color="red">
                        -3
                    </Badge>
                </Group>
            </Box>
        </Stack>
    ),
};

// Pill Stories
export const PillBasic: Story = {
    name: "Pill - Basic",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Basic pills
                </Text>
                <Group gap="xs">
                    <Pill size={"compact" as MantineSize}>Tag 1</Pill>
                    <Pill size={"compact" as MantineSize}>Tag 2</Pill>
                    <Pill size={"compact" as MantineSize}>Tag 3</Pill>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    With remove button
                </Text>
                <Group gap="xs">
                    <Pill size={"compact" as MantineSize} withRemoveButton>
                        Node
                    </Pill>
                    <Pill size={"compact" as MantineSize} withRemoveButton>
                        Edge
                    </Pill>
                    <Pill size={"compact" as MantineSize} withRemoveButton>
                        Label
                    </Pill>
                </Group>
            </Box>
        </Stack>
    ),
};

export const PillSizeComparison: Story = {
    name: "Pill - Size Comparison",
    render: () => (
        <Stack gap="xs">
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        xs
                    </Text>
                </Box>
                <Pill size="xs">Size xs</Pill>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        compact
                    </Text>
                </Box>
                <Pill size={"compact" as MantineSize}>Size compact</Pill>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        sm
                    </Text>
                </Box>
                <Pill size="sm">Size sm</Pill>
            </Group>
            <Group gap="md" align="center">
                <Box w={80}>
                    <Text size="xs" c="dimmed">
                        md
                    </Text>
                </Box>
                <Pill size="md">Size md</Pill>
            </Group>
        </Stack>
    ),
};

export const PillUseCases: Story = {
    name: "Pill - Use Cases",
    render: () => (
        <Stack gap="md">
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Selected filters
                </Text>
                <Group gap="xs">
                    <Pill size={"compact" as MantineSize} withRemoveButton>
                        Type: Node
                    </Pill>
                    <Pill size={"compact" as MantineSize} withRemoveButton>
                        Color: Blue
                    </Pill>
                    <Pill size={"compact" as MantineSize} withRemoveButton>
                        Size: Large
                    </Pill>
                </Group>
            </Box>
            <Box>
                <Text size="xs" c="dimmed" mb={4}>
                    Tags
                </Text>
                <Group gap="xs">
                    <Pill size={"compact" as MantineSize}>Important</Pill>
                    <Pill size={"compact" as MantineSize}>Review</Pill>
                    <Pill size={"compact" as MantineSize}>Draft</Pill>
                </Group>
            </Box>
        </Stack>
    ),
};

// All Display Components Combined
export const AllDisplay: Story = {
    name: "All Display Overview",
    render: () => (
        <Stack gap="lg">
            <Box>
                <Text fw={500} mb="xs">
                    Badge Variants
                </Text>
                <Group gap="xs">
                    <Badge size="compact">Filled</Badge>
                    <Badge size="compact" variant="light">
                        Light
                    </Badge>
                    <Badge size="compact" variant="outline">
                        Outline
                    </Badge>
                    <Badge size="compact" variant="dot">
                        Dot
                    </Badge>
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    Badge Colors
                </Text>
                <Group gap="xs">
                    <Badge size="compact" color="blue">
                        Blue
                    </Badge>
                    <Badge size="compact" color="green">
                        Green
                    </Badge>
                    <Badge size="compact" color="red">
                        Red
                    </Badge>
                    <Badge size="compact" color="yellow">
                        Yellow
                    </Badge>
                    <Badge size="compact" color="gray">
                        Gray
                    </Badge>
                </Group>
            </Box>

            <Box>
                <Text fw={500} mb="xs">
                    Pills
                </Text>
                <Group gap="xs">
                    <Pill size={"compact" as MantineSize}>Tag 1</Pill>
                    <Pill size={"compact" as MantineSize}>Tag 2</Pill>
                    <Pill size={"compact" as MantineSize} withRemoveButton>
                        Removable
                    </Pill>
                </Group>
            </Box>
        </Stack>
    ),
};
