import { Button, Card, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Mantine Card, themed as Figma's cards (components.md 55): the library card is padding 8, a
 * transparent 1px edge, radius 5 and no fill; as a link or button it hovers to the hover ground
 * and rings 2px inside on keyboard focus. `radius="lg"` (13) with a visible edge is the promo card.
 */
const meta: Meta<typeof Card> = {
    title: "Compact Theme/Mantine Components/Card",
    component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

const Preview = (): React.JSX.Element => (
    <div style={{ height: 115, borderRadius: 5, background: "var(--cm-bg-tertiary)" }} />
);

const Library = ({ state }: { state?: string }): React.JSX.Element => (
    <Card component="button" w={224} data-cm-state={state} style={{ textAlign: "start" }}>
        <Preview />
        <Text size="sm" mt={8}>
            Created in this file
        </Text>
        <Text size="sm" c="var(--cm-text-secondary)">
            72 components
        </Text>
    </Card>
);

export const Default: Story = {
    render: () => <Library />,
};

/** Rest, hover and keyboard focus of the library card, and the promo card. */
export const States: Story = {
    render: () => (
        <Stack gap={16} p={16}>
            <Group gap={16} align="flex-start">
                {[undefined, "hover", "focus"].map((state) => (
                    <Stack key={state ?? "rest"} gap={4}>
                        <Text size="xs" c="dimmed">
                            {state ?? "rest"}
                        </Text>
                        <Library state={state} />
                    </Stack>
                ))}
            </Group>
            <Stack gap={4}>
                <Text size="xs" c="dimmed">
                    promo (radius lg, with an edge)
                </Text>
                <Card w={208} radius="lg" padding={12} style={{ borderColor: "var(--cm-border)" }}>
                    <Text size="sm" fw={500}>
                        Try the new layout
                    </Text>
                    <Text size="sm" c="var(--cm-text-secondary)">
                        Arrange nodes with one click.
                    </Text>
                    <Group justify="flex-end" gap={8} mt={12}>
                        <Button variant="default">Dismiss</Button>
                        <Button>Try it</Button>
                    </Group>
                </Card>
            </Stack>
        </Stack>
    ),
};
