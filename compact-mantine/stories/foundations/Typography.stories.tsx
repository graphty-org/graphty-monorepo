import { Box, Stack, Text, Title } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { PANEL_INK } from "../../src";
import { CM_FONT_FAMILY, CM_TYPE, compactFontSizes, compactLineHeights } from "../../src/theme/tokens";

/**
 * The type the theme sets: one face, a five-step scale, and three weights.
 *
 * The face is **Inter Variable** (latin subset), bundled inside the package and inlined into its
 * stylesheet, so Figma's in-between weights render exactly with no font setup and no network
 * request. It is licensed under the SIL Open Font License 1.1 (`dist/fonts/LICENSE-Inter.txt`).
 * To use another face, set `fontFamily` in a theme merged over this one.
 *
 * ## The rules
 *
 * - **Body text is 11/16 at weight 450**, with 0.055px of tracking: Mantine's `Text size="sm"`,
 *   and every control's face.
 * - **Emphasis is weight, never size or color**: 550 for headings and strong labels, 600 for
 *   top-level layer names.
 * - **Captions are 9/14** (`size="xs"`): field captions above a field row, legends, the state
 *   names in the stories here.
 * - **Line heights are pixels**, so a row's height does not drift with the font size.
 *
 * ## Usage
 *
 * ```tsx
 * <Text size="sm">Body, 11/16 at 450</Text>
 * <Text size="sm" fw={550}>Strong, 11/16 at 550</Text>
 * <Text size="xs">Caption, 9/14</Text>
 * ```
 *
 * In your own CSS, the family is `var(--cm-font-family)`.
 */
const meta: Meta = {
    title: "Foundations/Typography",
    parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj;

const SAMPLE = "Node size scales with degree";

/**
 * Mantine's `fontSizes` and `lineHeights` scale as the theme sets it. Pass these names as `size`
 * to `Text` and every Mantine component; `sm` is the compact default.
 */
export const Scale: Story = {
    render: () => (
        <Stack gap={12}>
            {(Object.keys(compactFontSizes) as (keyof typeof compactFontSizes)[]).map((size) => (
                <Box key={size} style={{ display: "grid", gridTemplateColumns: "120px auto", alignItems: "baseline" }}>
                    <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                        {size} {compactFontSizes[size]} / {compactLineHeights[size]}
                    </Text>
                    <Text size={size}>{SAMPLE}</Text>
                </Box>
            ))}
        </Stack>
    ),
};

/** The three weights of the variable face the theme uses, at body size. */
export const Weights: Story = {
    render: () => (
        <Stack gap={8}>
            {[
                { weight: 450, use: "body text, values, controls" },
                { weight: 550, use: "headings, strong labels, section titles" },
                { weight: 600, use: "top-level layer names" },
            ].map(({ weight, use }) => (
                <Box key={weight} style={{ display: "grid", gridTemplateColumns: "120px 240px auto", alignItems: "baseline" }}>
                    <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                        {weight}
                    </Text>
                    <Text size="sm" fw={weight}>
                        {SAMPLE}
                    </Text>
                    <Text size="xs" c={PANEL_INK.CHROME}>
                        {use}
                    </Text>
                </Box>
            ))}
        </Stack>
    ),
};

/**
 * Every type role the components draw with, measured from Figma: size, line height, weight and
 * tracking. The components read these through the stylesheet; a role name is not a prop.
 */
export const Roles: Story = {
    render: () => (
        <Box
            style={{
                display: "grid",
                gridTemplateColumns: "120px 200px auto",
                gap: "8px 16px",
                alignItems: "baseline",
            }}
        >
            <Text size="sm" fw={550}>
                Role
            </Text>
            <Text size="sm" fw={550}>
                Size / line / weight / tracking
            </Text>
            <Text size="sm" fw={550}>
                Sample
            </Text>
            {Object.entries(CM_TYPE).map(([role, t]) => (
                <Box key={role} style={{ display: "contents" }}>
                    <Text size="xs" ff="monospace">
                        {role}
                    </Text>
                    <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                        {t.fontSize}/{t.lineHeight} {t.fontWeight} {t.letterSpacing}
                    </Text>
                    <span
                        style={{
                            fontFamily: "var(--cm-font-family)",
                            fontSize: t.fontSize,
                            lineHeight: `${String(t.lineHeight)}px`,
                            fontWeight: t.fontWeight,
                            letterSpacing: t.letterSpacing,
                            color: PANEL_INK.VALUE,
                        }}
                    >
                        {SAMPLE}
                    </span>
                </Box>
            ))}
        </Box>
    ),
};

/** Mantine headings take the same face at weight 550. */
export const Headings: Story = {
    render: () => (
        <Stack gap={4}>
            {([1, 2, 3, 4, 5, 6] as const).map((order) => (
                <Title key={order} order={order}>
                    Heading {order}
                </Title>
            ))}
            <Text size="xs" ff="monospace" c={PANEL_INK.CHROME} mt={8}>
                font-family: {CM_FONT_FAMILY}
            </Text>
        </Stack>
    ),
};
