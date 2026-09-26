import { Box, SegmentedControl, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { ControlGroup, ControlSection, PANEL_GRID, PANEL_INK, PanelField, ToggleRow } from "../../src";
import { CM_COLORS, CM_HIGH_CONTRAST } from "../../src/theme/tokens";
import { BOTH_SCHEMES } from "../helpers/schemes";

/**
 * Every color the theme draws with, and how light and dark work.
 *
 * Each color is a CSS custom property named `--cm-<role>` (`--cm-bg`, `--cm-text-secondary`,
 * `--cm-bg-brand`, ...), written with the CSS `light-dark()` function, so it resolves from the
 * `color-scheme` of the element that uses it rather than from a class on the page. That is why
 * one theme serves both schemes, and why a subtree can render dark inside a light app: menus,
 * list boxes, tooltips and the toast set `color-scheme: dark` on their surface and every token
 * inside follows.
 *
 * ## Using the colors in your own code
 *
 * Read `PANEL_INK` rather than a token name or a hex. It names one color per role a panel row
 * paints -- `VALUE` for primary text, `CHROME` for secondary, `SURFACE` for a field, `SELECTED`,
 * `HOVER`, `BORDER`, `ACCENT`, `FOCUS`, `MENU` and more -- and every entry is a `var(--cm-*)`, so it
 * follows the scheme and the contrast option with no further work.
 *
 * ```tsx
 * import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
 *
 * <div style={{ height: PANEL_GRID.ROW_PITCH, color: PANEL_INK.CHROME }}>Custom row</div>;
 * ```
 *
 * In a stylesheet, read the token itself: `color: var(--cm-text-secondary)`.
 *
 * ## The WCAG AA option
 *
 * Tokens marked **AA** below change under `createCompactTheme({ highContrast: true })`; switch
 * the toolbar's **Contrast** control to see their AA values. Nothing else changes.
 *
 * ## Mantine's palettes
 *
 * The theme's `primaryColor` is `brand`, Figma's blue (#0d99ff filled, #007be5 links, #0768cf
 * pressed, #0c8ce9 in dark), and `colors.dark` is Figma's neutral ramp (#2c2c2c panels, #383838
 * fields, #444444 hover). `compactColors`, `compactDarkColors` and `compactBrandColors` export
 * them for reuse. Every other Mantine palette (`red`, `blue`, ...) is Mantine's own.
 */
const meta: Meta = {
    title: "Foundations/Color",
    parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj;

type TokenName = keyof typeof CM_COLORS;

/**
 * A swatch of one token, resolved in the given scheme, with its hex under it.
 * @param props - Component props
 * @param props.name - the token, without `--cm-`
 * @param props.scheme - which scheme to resolve it in
 * @returns the swatch
 */
function Swatch({ name, scheme }: { name: TokenName; scheme: "light" | "dark" }): React.JSX.Element {
    return (
        <Box style={{ colorScheme: scheme, background: "var(--cm-bg)", padding: 4, borderRadius: 5 }}>
            <Box
                style={{
                    height: 16,
                    borderRadius: 2,
                    background: `var(--cm-${name})`,
                    boxShadow: "inset 0 0 0 1px var(--cm-border-translucent)",
                }}
            />
            <Text size="xs" ff="monospace" c="var(--cm-text-secondary)" mt={2}>
                {CM_COLORS[name][scheme]}
            </Text>
        </Box>
    );
}

/**
 * One panel, rendered once in each scheme from the same theme object: a section, a field pair,
 * a toggle, a segmented control and a group. Nothing in the components names a scheme; each
 * color resolves from the `color-scheme` of the half it is in.
 */
export const LightAndDark: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Box w={PANEL_GRID.WIDTH}>
            <ControlSection label="Node size">
                <Box style={{ display: "flex", gap: PANEL_GRID.GUTTER, paddingBlock: 4 }}>
                    <PanelField label="Smallest" glyph="sizeSmallest" kind="number" defaultValue={1} />
                    <PanelField label="Largest" glyph="sizeLargest" kind="number" defaultValue={4} />
                </Box>
                <ToggleRow label="Scale with zoom" defaultChecked />
            </ControlSection>
            <ControlGroup label="Layout">
                <Box style={{ paddingInline: PANEL_GRID.PAD_LEFT, paddingBlock: 4 }}>
                    <SegmentedControl fullWidth data={["2D", "3D"]} defaultValue="3D" aria-label="Dimensions" />
                </Box>
            </ControlGroup>
        </Box>
    ),
};

/**
 * Every color token, light and dark side by side, with its value in each. Each swatch sets
 * `color-scheme` on a wrapper and the token resolves for that scheme: the same mechanism a dark
 * menu uses inside the light app.
 */
export const Tokens: Story = {
    render: () => (
        <Box
            style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, auto) minmax(96px, 160px) minmax(96px, 160px)",
                gap: "4px 16px",
                alignItems: "center",
            }}
        >
            <Text size="sm" fw={550}>
                Token
            </Text>
            <Text size="sm" fw={550}>
                Light
            </Text>
            <Text size="sm" fw={550}>
                Dark
            </Text>
            {(Object.keys(CM_COLORS) as TokenName[]).map((name) => (
                <Box key={name} style={{ display: "contents" }}>
                    <Text size="sm" ff="monospace">
                        --cm-{name}
                        {name in CM_HIGH_CONTRAST ? " (AA)" : ""}
                    </Text>
                    <Swatch name={name} scheme="light" />
                    <Swatch name={name} scheme="dark" />
                </Box>
            ))}
        </Box>
    ),
};

/**
 * Every `PANEL_INK` role: the constant to import, the token it reads, and the color it
 * resolves to in each scheme. Paint your own rows from these and they match the components.
 */
export const PanelInk: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={4}>
            {Object.entries(PANEL_INK).map(([role, value]) => (
                <Box
                    key={role}
                    style={{ display: "grid", gridTemplateColumns: "24px 232px auto", gap: 8, alignItems: "center" }}
                >
                    <Box
                        style={{
                            width: 24,
                            height: 16,
                            borderRadius: 2,
                            background: value,
                            boxShadow: "inset 0 0 0 1px var(--cm-border-translucent)",
                        }}
                    />
                    <Text size="sm" ff="monospace" c={PANEL_INK.VALUE}>
                        PANEL_INK.{role}
                    </Text>
                    <Text size="xs" ff="monospace" c={PANEL_INK.CHROME}>
                        {value.replace(/^var\((.*)\)$/, "$1")}
                    </Text>
                </Box>
            ))}
        </Stack>
    ),
};
