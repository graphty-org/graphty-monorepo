import "../src/index.css";
import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import type { Preview, StoryContext } from "@storybook/react";
import React from "react";

import { pinErudaTopRight } from "../src/lib/eruda";
import { initSentry } from "../src/lib/sentry";
import { theme } from "../src/theme";
import { loadGraphtyElement } from "../src/elementLoader";
import { loadFrame } from "../src/workspace/frameLoader";
import { HeroTurns } from "../src/workspace/start/heroTurns";
import DocumentationTemplate from "./DocumentationTemplate.mdx";

// Error tracking in Storybook only when a DSN was built in. Without one there is nothing to set up,
// and the Sentry stories say on the page that it is not configured.
if (import.meta.env.VITE_SENTRY_DSN) {
    initSentry();
}

/**
 * Whether a page URL carries the `eruda` query flag.
 * @param read - returns the search string of the page to check; may throw for a cross-origin frame.
 * @returns true when the flag is present.
 */
function hasErudaFlag(read: () => string): boolean {
    try {
        return new URLSearchParams(read()).has("eruda");
    } catch {
        return false;
    }
}

// The eruda debug console, for mobile debugging, only when asked for with `&eruda` on the story
// URL (the preview iframe's or the manager's), and never in a visual capture or an automated
// browser, where it would be drawn into every snapshot.
if (
    !/[?&]chromatic=true/.test(globalThis.location.search) &&
    !navigator.webdriver &&
    (hasErudaFlag(() => globalThis.location.search) || hasErudaFlag(() => globalThis.parent.location.search))
) {
    void showEruda(); // NOSONAR(S7785): fire and forget on purpose; awaiting would hold every story until eruda loads
}

/** Load the eruda console and show it pinned top right, without making the preview wait for it. */
async function showEruda(): Promise<void> {
    const { default: eruda } = await import("eruda");
    eruda.init();
    eruda.show("console");
    pinErudaTopRight(eruda);
}

/**
 * Determines the Mantine color scheme based on Storybook globals.
 * Supports both Storybook's built-in backgrounds addon and custom theme global.
 */
function getColorScheme(globals: Record<string, unknown>): "light" | "dark" {
    // The light and dark modes the visual capture renders (parameters.chromatic.modes below) set
    // this global. Without reading it every story fell through to the default, dark, in both modes.
    if (globals.colorScheme === "light" || globals.colorScheme === "dark") {
        return globals.colorScheme;
    }

    // Check Storybook's built-in backgrounds addon
    const backgroundValue = globals.backgrounds as { value?: string } | undefined;
    if (
        backgroundValue?.value === "light" ||
        backgroundValue?.value === "#ffffff" ||
        backgroundValue?.value === "#F8F8F8"
    ) {
        return "light";
    }

    if (
        backgroundValue?.value === "dark" ||
        backgroundValue?.value === "#333333" ||
        backgroundValue?.value === "#1b1c1d"
    ) {
        return "dark";
    }

    // Fall back to custom theme global
    if (globals.theme === "light") {
        return "light";
    }

    return "dark";
}

const preview: Preview = {
    globalTypes: {
        // Set by the light and dark capture modes (parameters.chromatic.modes). Storybook ignores a
        // global from the story URL that is not declared here, so it needs a declaration of its own.
        colorScheme: {
            description: "Color scheme a visual capture mode forces",
        },
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
    },
    initialGlobals: {
        theme: "dark",
    },
    // The project frame and graphty-element load on demand in the app (src/workspace/frameLoader.ts,
    // src/elementLoader.ts); a story has them from its first render, so the start page's graph is
    // on the page, and waited for, when the story is captured.
    loaders: [
        async () => {
            await Promise.all([loadFrame(), loadGraphtyElement()]);
            return {};
        },
    ],
    decorators: [
        (Story, context: StoryContext) => {
            const colorScheme = getColorScheme(context.globals);
            return (
                <MantineProvider theme={theme} forceColorScheme={colorScheme}>
                    {/* The start page's graph holds still, so two pictures of a story are the same. */}
                    <HeroTurns.Provider value={false}>
                        <Story />
                    </HeroTurns.Provider>
                </MantineProvider>
            );
        },
    ],
    parameters: {
        controls: {
            expanded: true,
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        docs: {
            page: DocumentationTemplate,
        },
        options: {
            storySort: {
                method: "alphabetical",
                order: [
                    // App stories first
                    "App",
                    ["Default", "*"],
                    // Then Graphty stories
                    "Graphty",
                    ["Default", "*"],
                    // Compact Components
                    "Compact",
                    ["Overview", "Inputs", "Controls", "Buttons", "Display", "*"],
                    // Data View Components
                    "DataView",
                    ["ViewDataModal", "DataAccordion", "DataGrid", "CopyButton", "*"],
                ],
                includeNames: true,
            },
        },
        // Disable the default backgrounds addon since we use Mantine's color scheme
        backgrounds: { disable: true },
        // Visual capture settings (visual-review reads them)
        chromatic: {
            // Capture both light and dark color schemes
            modes: {
                light: { colorScheme: "light" },
                dark: { colorScheme: "dark" },
            },
        },
    },
};

export default preview;
