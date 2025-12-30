import "../src/index.css";
import "@mantine/core/styles.css";

import {MantineProvider} from "@mantine/core";
import type {Preview, StoryContext} from "@storybook/react";
import eruda from "eruda";
import React from "react";

import {initSentry} from "../src/lib/sentry";
import {theme} from "../src/theme";
import DocumentationTemplate from "./DocumentationTemplate.mdx";

// Initialize Sentry for error tracking in Storybook
initSentry();

// Initialize eruda for mobile debugging
eruda.init();
eruda.show("console");
eruda.position({x: window.innerWidth - 60, y: 20});

/**
 * Determines the Mantine color scheme based on Storybook globals.
 * Supports both Storybook's built-in backgrounds addon and custom theme global.
 */
function getColorScheme(globals: Record<string, unknown>): "light" | "dark" {
    // Check Storybook's built-in backgrounds addon
    const backgroundValue = globals.backgrounds as {value?: string} | undefined;
    if (backgroundValue?.value === "light" || backgroundValue?.value === "#ffffff" || backgroundValue?.value === "#F8F8F8") {
        return "light";
    }

    if (backgroundValue?.value === "dark" || backgroundValue?.value === "#333333" || backgroundValue?.value === "#1b1c1d") {
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
        theme: {
            description: "Color scheme for Mantine components",
            toolbar: {
                title: "Theme",
                icon: "mirror",
                items: [
                    {value: "light", title: "Light", icon: "sun"},
                    {value: "dark", title: "Dark", icon: "moon"},
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        theme: "dark",
    },
    decorators: [
        (Story, context: StoryContext) => {
            const colorScheme = getColorScheme(context.globals);
            return (
                <MantineProvider theme={theme} forceColorScheme={colorScheme}>
                    <Story />
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
        backgrounds: {disable: true},
        // Chromatic visual testing configuration
        chromatic: {
            // Capture both light and dark color schemes
            modes: {
                light: {colorScheme: "light"},
                dark: {colorScheme: "dark"},
            },
        },
    },
};

export default preview;
