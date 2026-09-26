import "@mantine/core/styles.css";

import { DirectionProvider, type MantineThemeOverride, MantineProvider } from "@mantine/core";
import type { Preview, StoryContext } from "@storybook/react";
import { type ReactNode, useRef } from "react";

import { createCompactTheme } from "../src/theme";

// One theme per contrast mode, built once: MantineProvider re-resolves when the object changes.
const THEMES = {
    figma: createCompactTheme(),
    high: createCompactTheme({ highContrast: true }),
};

function getColorScheme(globals: Record<string, unknown>): "light" | "dark" {
    if (globals.theme === "light") {
        return "light";
    }
    return "dark";
}

// Section 2.3 of the hardening contract asks for a right-to-left global, so
// that every story can be flipped rather than only the ones that ship a
// dedicated RTL story. Mantine's DirectionProvider is the same channel the
// components read, so flipping it here is exactly what a consumer's own
// DirectionProvider does.
// The contrast toolbar: exact Figma (the default) or the WCAG 2.2 AA token set.
function getContrast(globals: Record<string, unknown>): "figma" | "high" {
    return globals.contrast === "high" ? "high" : "figma";
}

function getDirection(globals: Record<string, unknown>): "ltr" | "rtl" {
    return globals.direction === "rtl" ? "rtl" : "ltr";
}

type Scheme = "light" | "dark";

/**
 * One half of a `BOTH_SCHEMES` story (stories/helpers/schemes.ts): a wrapper that carries the
 * scheme as `color-scheme` (every `--cm-*` token is a `light-dark()` and resolves from it) and as
 * Mantine's `data-mantine-color-scheme`, with a nested MantineProvider whose CSS variables and
 * color-scheme attribute are scoped to this wrapper instead of `<html>`.
 * @param props - Component props
 * @param props.scheme - the scheme this half renders
 * @param props.theme - the theme the outer provider uses
 * @param props.children - the story
 * @returns the half
 */
function SchemeHalf({
    scheme,
    theme,
    children,
}: {
    scheme: Scheme;
    theme: MantineThemeOverride;
    children: ReactNode;
}): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    const className = `cm-scheme-${scheme}`;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <div style={{ font: "500 9px/14px var(--cm-font-family)", color: "var(--cm-text-secondary)" }}>
                {scheme === "light" ? "Light" : "Dark"}
            </div>
            <div
                ref={ref}
                className={className}
                data-mantine-color-scheme={scheme}
                style={{
                    colorScheme: scheme,
                    background: "var(--cm-bg)",
                    color: "var(--cm-text)",
                    padding: 16,
                }}
            >
                <MantineProvider
                    theme={theme}
                    forceColorScheme={scheme}
                    cssVariablesSelector={`.${className}`}
                    getRootElement={() => ref.current ?? undefined}
                >
                    {children}
                </MantineProvider>
            </div>
        </div>
    );
}

/**
 * "Show code" on a docs page prints the story's source. Two parts of that source are Storybook
 * plumbing rather than usage -- the `BOTH_SCHEMES` parameter and the `play` test -- so they are
 * cut out. A play body whose braces do not balance is left alone rather than cut wrongly.
 * @param code - the story source Storybook would show
 * @returns the source without the plumbing
 */
function stripStoryPlumbing(code: string): string {
    const out = code.replace(/\n[ \t]*parameters: BOTH_SCHEMES,?[ \t]*(?=\n)/g, "");
    const match = /\n[ \t]*play: /.exec(out);
    if (match === null) {
        return out;
    }
    const open = out.indexOf("{", out.indexOf("=>", match.index));
    let depth = 0;
    for (let i = open; open !== -1 && i < out.length; i++) {
        if (out[i] === "{") {
            depth++;
        } else if (out[i] === "}") {
            depth--;
            if (depth === 0) {
                const end = out[i + 1] === "," ? i + 2 : i + 1;
                return out.slice(0, match.index) + out.slice(end);
            }
        }
    }
    return out;
}

const preview: Preview = {
    // Every CSF file gets a Docs page without opting in (storybook-ia.md 3.1).
    tags: ["autodocs"],
    globalTypes: {
        theme: {
            description: "Color scheme for Mantine components",
            toolbar: {
                title: "Theme",
                icon: "mirror",
                items: [
                    { value: "light", title: "Light", icon: "sun" },
                    { value: "dark", title: "Dark", icon: "moon" },
                ],
                dynamicTitle: true,
            },
        },
        contrast: {
            description: "Exact Figma, or the WCAG 2.2 AA token set (createCompactTheme({ highContrast: true }))",
            toolbar: {
                title: "Contrast",
                icon: "contrast",
                items: [
                    { value: "figma", title: "Figma" },
                    { value: "high", title: "WCAG AA" },
                ],
                dynamicTitle: true,
            },
        },
        // No toolbar: set by the Chromatic modes below (and by a `globals=schemes:single` URL),
        // so a BOTH_SCHEMES story is captured as one real, un-nested render per mode.
        schemes: {
            description: "auto: a BOTH_SCHEMES story renders light and dark side by side; single: it renders once, in the theme global's scheme",
        },
        direction: {
            description: "Text direction every component follows",
            toolbar: {
                title: "Direction",
                icon: "transfer",
                items: [
                    { value: "ltr", title: "Left to right" },
                    { value: "rtl", title: "Right to left" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        schemes: "auto",
        theme: "light",
        contrast: "figma",
        direction: "ltr",
    },
    decorators: [
        (Story, context: StoryContext) => {
            const colorScheme = getColorScheme(context.globals);
            const direction = getDirection(context.globals);
            const theme = THEMES[getContrast(context.globals)];

            // A States story with `parameters: BOTH_SCHEMES` renders twice, light
            // and dark side by side, and ignores the toolbar's theme; contrast
            // and direction still apply. Chromatic's modes set the `schemes`
            // global to "single", so it captures every story as one real,
            // un-nested render per scheme.
            if (context.parameters.schemes === "both" && context.globals.schemes !== "single") {
                return (
                    <DirectionProvider initialDirection={direction} detectDirection={false}>
                        <MantineProvider theme={theme} forceColorScheme={colorScheme}>
                            <div dir={direction} style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                                {(["light", "dark"] as const).map((scheme) => (
                                    <SchemeHalf key={scheme} scheme={scheme} theme={theme}>
                                        <Story />
                                    </SchemeHalf>
                                ))}
                            </div>
                        </MantineProvider>
                    </DirectionProvider>
                );
            }

            // `dir` on the wrapper as well as the provider: the provider is what
            // the components read, and the attribute is what the CSS logical
            // properties and Mantine's own stylesheet read. The wrapper paints
            // the theme's ground: on a docs page the story sits on Storybook's
            // own white canvas, where dark-scheme text would otherwise vanish.
            // In the canvas view it is the same color as the body, so nothing
            // a Chromatic snapshot captures changes.
            const inDocs = context.viewMode === "docs";
            return (
                <DirectionProvider initialDirection={direction} detectDirection={false}>
                    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
                        <div
                            dir={direction}
                            style={{
                                background: "var(--cm-bg)",
                                color: "var(--cm-text)",
                                padding: inDocs ? 16 : undefined,
                            }}
                        >
                            <Story />
                        </div>
                    </MantineProvider>
                </DirectionProvider>
            );
        },
    ],
    parameters: {
        options: {
            // The sidebar is grouped by what a reader is trying to do rather
            // than by which folder a file lives in, so the order is written out
            // here (compact-mantine/design/storybook-ia.md 2.3). Anything not
            // named below sorts alphabetically after it. Stories inside a page
            // keep their export order: Default first, then States.
            storySort: {
                method: "alphabetical",
                order: [
                    "Introduction",
                    [
                        "Getting started",
                        "Choosing a component",
                        "Customizing the theme",
                        "Languages and direction",
                        "Events and shared props",
                        "Accessibility",
                        "Upgrading to 0.9",
                    ],
                    "Foundations",
                    ["Color", "Typography", "Spacing, radii and grid", "Elevation", "Focus and motion", "Glyphs"],
                    "Components",
                    [
                        "Panels and rows",
                        ["Overview"],
                        "Inputs",
                        ["Overview"],
                        "Selection",
                        ["Overview"],
                        "Color",
                        ["Overview"],
                        "Actions",
                        ["Overview"],
                        "Overlays",
                        ["Overview"],
                        "Lists and trees",
                        ["Overview"],
                        "Data display",
                        ["Overview"],
                        "App shell",
                        ["Overview"],
                    ],
                    "Patterns",
                    "Themed Mantine",
                    ["Actions", "Inputs", "Selection", "Navigation", "Feedback", "Surfaces"],
                    "*",
                ],
            },
        },
        docs: {
            toc: true,
            // "Show code" shows how to use the component: no preview wrappers, no test plumbing.
            source: {
                excludeDecorators: true,
                transform: stripStoryPlumbing,
            },
        },
        controls: {
            expanded: true,
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: { disable: true },
        chromatic: {
            modes: {
                light: { theme: "light", schemes: "single" },
                dark: { theme: "dark", schemes: "single" },
            },
        },
    },
};

export default preview;
