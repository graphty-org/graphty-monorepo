import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import type { Preview, StoryContext } from "@storybook/react";
import React from "react";

import { compactTheme } from "../src";

function getColorScheme(globals: Record<string, unknown>): "light" | "dark" {
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
    decorators: [
        (Story, context: StoryContext) => {
            const colorScheme = getColorScheme(context.globals);
            return (
                <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                    <Story />
                </MantineProvider>
            );
        },
    ],
    parameters: {
        options: {
            storySort: {
                method: "alphabetical",
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
