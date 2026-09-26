import { Button, Card, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `Card`, themed as Figma's library card: padding 8, a transparent 1px edge, radius 5
 * and no fill. As a link or a button (`component="a"` or `"button"`) it hovers to the hover
 * ground and rings 2px inside on keyboard focus. `radius="lg"` (13px) with a visible edge is the
 * promo card. Every prop is Mantine's: see [Card on mantine.dev](https://mantine.dev/core/card/).
 *
 * ## Usage
 *
 * ```tsx
 * import { Card, Text } from "@mantine/core";
 *
 * <Card component="button" onClick={open}>
 *     <Text size="sm">Created in this file</Text>
 *     <Text size="sm" c="var(--cm-text-secondary)">72 components</Text>
 * </Card>
 * ```
 *
 * A card that opens something should be a `button` or an `a`, so it is in the Tab order and its
 * text is its name.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Library card | padding 8px, 1px transparent edge, radius 5px |
 * | Focus | 2px ring inside |
 * | Promo card | radius 13px (`lg`), 1px `--cm-border` edge |
 */
const meta: Meta<typeof Card> = {
    title: "Themed Mantine/Surfaces/Card",
    component: Card,
    tags: ["autodocs"],
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

/** A library card as a button: a preview, a title and a count. */
export const Default: Story = {
    render: () => <Library />,
};

/** The library card at rest, hovered and focused (forced with `data-cm-state`), then the promo card. Light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={16}>
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
