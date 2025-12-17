import "../src/index.css";
import "@mantine/core/styles.css";

import {createTheme, MantineProvider} from "@mantine/core";
import type {Preview} from "@storybook/react";
import eruda from "eruda";
import React from "react";

import {initSentry} from "../src/lib/sentry";
import DocumentationTemplate from "./DocumentationTemplate.mdx";

// Initialize Sentry for error tracking in Storybook
initSentry();

const theme = createTheme({
    colors: {
        dark: [
            "#d5d7da",
            "#a3a8b1",
            "#7a828e",
            "#5f6873",
            "#48525c",
            "#374047",
            "#2a3035",
            "#1f2428",
            "#161b22",
            "#0d1117",
        ],
    },
});

// Initialize eruda for mobile debugging
eruda.init();
eruda.show("console");
eruda.position({x: window.innerWidth - 60, y: 20});

const preview: Preview = {
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
                ],
                includeNames: true,
            },
        },
    },
    decorators: [
        (Story) => React.createElement(
            MantineProvider,
            {theme, defaultColorScheme: "dark"},
            React.createElement(Story),
        ),
    ],
};

export default preview;
