import "../src/index.css";
import "@mantine/core/styles.css";

import {MantineProvider} from "@mantine/core";
import type {Preview} from "@storybook/react";
import eruda from "eruda";
import {createElement} from "react";

import {theme} from "../src/theme";
import DocumentationTemplate from "./DocumentationTemplate.mdx";

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
                    // Compact Components
                    "Compact",
                    ["Overview", "Inputs", "Controls", "Buttons", "Display", "*"],
                ],
                includeNames: true,
            },
        },
    },
    decorators: [
        (Story) => createElement(
            MantineProvider,
            {theme, defaultColorScheme: "dark"},
            createElement(Story),
        ),
    ],
};

export default preview;
