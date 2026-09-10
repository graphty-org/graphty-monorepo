import "@mantine/core/styles.css";

import { DirectionProvider, MantineProvider } from "@mantine/core";
import type { Preview, StoryContext } from "@storybook/react";
import React from "react";

import { compactTheme } from "../src";

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
function getDirection(globals: Record<string, unknown>): "ltr" | "rtl" {
    return globals.direction === "rtl" ? "rtl" : "ltr";
}

const preview: Preview = {
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
        theme: "dark",
        direction: "ltr",
    },
    decorators: [
        (Story, context: StoryContext) => {
            const colorScheme = getColorScheme(context.globals);
            const direction = getDirection(context.globals);

            // `dir` on the wrapper as well as the provider: the provider is what
            // the components read, and the attribute is what the CSS logical
            // properties and Mantine's own stylesheet read.
            return (
                <DirectionProvider initialDirection={direction} detectDirection={false}>
                    <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                        <div dir={direction}>
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
            // here: alphabetical would put "Building a Panel" before "Getting
            // Started" and scatter the overview pages among the components.
            // Anything not named below sorts alphabetically after it.
            storySort: {
                method: "alphabetical",
                order: [
                    "Getting Started",
                    ["Introduction"],
                    "Building a Panel",
                    ["Overview"],
                    "Editing a Value",
                    ["Overview"],
                    "Showing Data",
                    ["Overview"],
                    "Floating Panels",
                    ["Overview"],
                    "Glyphs",
                    "Compact Theme",
                    ["Overview", "Showcase", "Mantine Components"],
                    "*",
                ],
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
                light: { theme: "light" },
                dark: { theme: "dark" },
            },
        },
    },
};

export default preview;
