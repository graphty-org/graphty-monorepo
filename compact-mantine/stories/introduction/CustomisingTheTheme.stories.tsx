import {
    Button,
    Checkbox,
    createTheme,
    Group,
    MantineProvider,
    type MantineThemeOverride,
    mergeMantineTheme,
    Select,
    Stack,
    Switch,
    Text,
    TextInput,
    useComputedColorScheme,
} from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useId, useRef } from "react";

import { compactTheme, PANEL_INK } from "../../src";

/**
 * `compactTheme` is an ordinary Mantine theme, so it is customised the way any Mantine theme
 * is: merge your changes on top of it. The stories below each change one thing -- the primary
 * colour, the font, the corner radius -- and show the result beside the default.
 *
 * ## Making it your own
 *
 * `compactTheme` is already merged with Mantine's default theme, so merge yours on top of it:
 *
 * ```tsx
 * import { createTheme, MantineProvider, mergeMantineTheme } from "@mantine/core";
 * import { compactTheme } from "@graphty/compact-mantine";
 *
 * const theme = mergeMantineTheme(compactTheme, createTheme({
 *     fontFamily: "Georgia, serif",
 * }));
 *
 * <MantineProvider theme={theme}>{children}</MantineProvider>;
 * ```
 *
 * Colours are the exception. Every colour the compact components draw is a `--cm-*` custom
 * property (`--cm-bg`, `--cm-text-secondary`, `--cm-bg-brand`, ...), not a Mantine palette, so
 * a colour is changed by setting its token in CSS, as the ChangePrimaryColor story below shows.
 * Mantine's `primaryColor` does not reach them.
 *
 * If you build your theme from several overrides instead, take `compactThemeOverride` (the same
 * as `createCompactTheme()`, or `createCompactTheme(options)` for the WCAG AA option). It is the
 * raw `createTheme()` result, and it goes straight into `mergeThemeOverrides()`:
 *
 * ```tsx
 * import { createTheme, mergeThemeOverrides } from "@mantine/core";
 * import { compactThemeOverride } from "@graphty/compact-mantine";
 *
 * const override = mergeThemeOverrides(compactThemeOverride, createTheme({ fontFamily: "Georgia, serif" }));
 * ```
 *
 * Merge component extensions with care: `mergeThemeOverrides` replaces a component's `vars` or
 * `styles` function rather than composing it, so an override of a component this theme already
 * extends discards the compact treatment. Adjust such a component through its props,
 * `classNames` or the `--cm-*` tokens instead.
 *
 * ## A compact region inside a normal-sized app
 *
 * `MantineProvider` nests, so an application can stay at its usual size and make one region
 * dense -- which is what a sidebar or an inspector usually wants.
 *
 * ```tsx
 * <MantineProvider>
 *     <TextInput label="Normal size" />
 *
 *     <MantineProvider theme={compactTheme}>
 *         <aside style={{ width: 240 }}>
 *             <TextInput label="Compact" />
 *         </aside>
 *     </MantineProvider>
 * </MantineProvider>;
 * ```
 *
 * Two providers on one page share `<html>` unless you tell the inner one otherwise. To keep
 * the inner theme's CSS variables and colour-scheme attribute inside its region, give it the
 * region as its root, as every story on this page does:
 *
 * ```tsx
 * <div className="compact-region" ref={regionRef}>
 *     <MantineProvider
 *         theme={compactTheme}
 *         cssVariablesSelector=".compact-region"
 *         getRootElement={() => regionRef.current ?? undefined}
 *     >
 *         <Inspector />
 *     </MantineProvider>
 * </div>;
 * ```
 *
 * One page renders one contrast mode: two providers with different `highContrast` settings on
 * the same page are not supported.
 *
 * ## Server rendering and shadow roots
 *
 * The stylesheet is injected into `document.head` when the theme is created. Without a DOM
 * (server rendering), put `compactGlobalCss()` in a `<style>` in your document head instead;
 * pass `{ highContrast: true }` to get the AA tokens without relying on the page attribute.
 * The same string works inside a shadow root: append it in a `<style>` to the root, after
 * Mantine's own `@mantine/core/styles.css`, which is still required.
 *
 * ```tsx
 * import { compactGlobalCss } from "@graphty/compact-mantine";
 *
 * <head>
 *     <style dangerouslySetInnerHTML={{ __html: compactGlobalCss() }} />
 * </head>;
 * ```
 */
const meta: Meta = {
    title: "Introduction/Customising the theme",
    parameters: {
        layout: "padded",
    },
};

export default meta;

type Story = StoryObj;

/**
 * One theme variant, rendered in a region of its own: the provider's CSS variables and its
 * colour-scheme attribute are scoped to the region, so it cannot restyle the rest of the page.
 * It follows the page's colour scheme.
 * @param props - Component props
 * @param props.name - The caption above the variant
 * @param props.theme - The merged theme to render with
 * @param props.children - The sample controls
 * @param props.style - Custom properties set on the region, such as `--cm-*` token overrides
 * @returns The captioned variant
 */
function Variant({
    name,
    theme,
    children,
    style,
}: {
    name: string;
    theme: MantineThemeOverride;
    children: React.ReactNode;
    style?: React.CSSProperties;
}): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    const scheme = useComputedColorScheme("dark");
    // Unique per variant, so two variants on one docs page never share a selector.
    const className = `cm-variant-${useId().replace(/[^\w-]/g, "")}`;

    return (
        <Stack gap={4}>
            <Text size="xs" fw={550} c={PANEL_INK.CHROME}>
                {name}
            </Text>
            <div ref={ref} className={className} style={style}>
                <MantineProvider
                    theme={theme}
                    forceColorScheme={scheme}
                    cssVariablesSelector={`.${className}`}
                    getRootElement={() => ref.current ?? undefined}
                >
                    <Stack gap="xs" w={160}>
                        {children}
                    </Stack>
                </MantineProvider>
            </div>
        </Stack>
    );
}

/** The controls each variant shows: a primary button, a checkbox and a switch. */
function PrimarySample(): React.JSX.Element {
    return (
        <>
            <Button>Primary button</Button>
            <Checkbox label="Checkbox" defaultChecked />
            <Switch label="Switch" defaultChecked />
        </>
    );
}

/** A labelled field and a button, where the font shows most. */
function FontSample(): React.JSX.Element {
    return (
        <>
            <TextInput label="Username" placeholder="Enter a username" />
            <Button>Submit</Button>
        </>
    );
}

/** A field, a button and a select, where the corner radius shows most. */
function RadiusSample(): React.JSX.Element {
    return (
        <>
            <TextInput placeholder="Input" />
            <Button>Button</Button>
            <Select data={["Option A", "Option B"]} placeholder="Select" />
        </>
    );
}

/**
 * The `--cm-*` accent tokens a primary colour has to replace, pointed at one of Mantine's
 * palettes. Shade 6 fills, 7 and 8 are hover and pressed, and text and glyphs take a darker shade
 * on light and a lighter one on dark.
 * @param palette - A Mantine palette name, such as "teal"
 * @returns The custom properties to set on the region
 */
function accentTokens(palette: string): React.CSSProperties {
    const c = (shade: number): string => `var(--mantine-color-${palette}-${String(shade)})`;
    return {
        "--cm-bg-brand": c(6),
        "--cm-bg-brand-hover": c(7),
        "--cm-bg-brand-pressed": c(8),
        "--cm-border-selected": c(6),
        "--cm-text-brand": `light-dark(${c(7)}, ${c(4)})`,
        "--cm-icon-brand": `light-dark(${c(7)}, ${c(4)})`,
    } as React.CSSProperties;
}

/**
 * The accent is Figma's blue by default. The compact components draw it from the `--cm-*` accent
 * tokens rather than from Mantine's `primaryColor`, so set those tokens on the region (or on
 * `:root`) to change it; every filled button, checked box and switch follows. Merging a
 * `primaryColor` into the theme does not change them.
 *
 * ```css
 * .my-app {
 *     --cm-bg-brand: var(--mantine-color-teal-6);
 *     --cm-bg-brand-hover: var(--mantine-color-teal-7);
 *     --cm-bg-brand-pressed: var(--mantine-color-teal-8);
 *     --cm-border-selected: var(--mantine-color-teal-6);
 *     --cm-text-brand: light-dark(var(--mantine-color-teal-7), var(--mantine-color-teal-4));
 *     --cm-icon-brand: light-dark(var(--mantine-color-teal-7), var(--mantine-color-teal-4));
 * }
 * ```
 */
export const ChangePrimaryColor: Story = {
    render: (): React.JSX.Element => (
        <Group gap="xl" align="flex-start">
            <Variant name="Default" theme={compactTheme}>
                <PrimarySample />
            </Variant>
            {(["teal", "grape", "orange"] as const).map((palette) => (
                <Variant
                    key={palette}
                    name={palette[0].toUpperCase() + palette.slice(1)}
                    theme={compactTheme}
                    style={accentTokens(palette)}
                >
                    <PrimarySample />
                </Variant>
            ))}
        </Group>
    ),
};

/**
 * The font is the bundled Inter by default. Merge `fontFamily` (and `headings.fontFamily`) to
 * change it; the compact sizes and line heights stay.
 *
 * ```tsx
 * const theme = mergeMantineTheme(compactTheme, createTheme({
 *     fontFamily: "Georgia, serif",
 *     headings: { fontFamily: "Georgia, serif" },
 * }));
 * ```
 */
export const ChangeFonts: Story = {
    render: (): React.JSX.Element => (
        <Group gap="xl" align="flex-start">
            <Variant name="Default (Inter)" theme={compactTheme}>
                <FontSample />
            </Variant>
            <Variant
                name="Monospace"
                theme={mergeMantineTheme(compactTheme, createTheme({ fontFamily: "ui-monospace, monospace" }))}
            >
                <FontSample />
            </Variant>
            <Variant name="Serif" theme={mergeMantineTheme(compactTheme, createTheme({ fontFamily: "Georgia, serif" }))}>
                <FontSample />
            </Variant>
        </Group>
    ),
};

/**
 * The corner radius is Figma's 5px on controls by default. Merge a `radius` scale and a
 * `defaultRadius` to round or square every control.
 *
 * ```tsx
 * const theme = mergeMantineTheme(compactTheme, createTheme({
 *     radius: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px" },
 *     defaultRadius: "md",
 * }));
 * ```
 */
export const ChangeBorderRadius: Story = {
    render: (): React.JSX.Element => (
        <Group gap="xl" align="flex-start">
            <Variant name="Default" theme={compactTheme}>
                <RadiusSample />
            </Variant>
            <Variant
                name="Rounded"
                theme={mergeMantineTheme(
                    compactTheme,
                    createTheme({
                        radius: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px" },
                        defaultRadius: "md",
                    }),
                )}
            >
                <RadiusSample />
            </Variant>
            <Variant
                name="Sharp"
                theme={mergeMantineTheme(
                    compactTheme,
                    createTheme({
                        radius: { xs: "0px", sm: "0px", md: "2px", lg: "2px", xl: "4px" },
                        defaultRadius: "sm",
                    }),
                )}
            >
                <RadiusSample />
            </Variant>
        </Group>
    ),
};
