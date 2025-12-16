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
        // Disable the default backgrounds addon since we use Mantine's color scheme
        backgrounds: {disable: true},
    },
    globalTypes: {
        colorScheme: {
            name: "Color Scheme",
            description: "Mantine color scheme (light/dark)",
            defaultValue: "dark",
            toolbar: {
                icon: "mirror",
                items: [
                    {value: "light", title: "Light"},
                    {value: "dark", title: "Dark"},
                ],
                dynamicTitle: true,
            },
        },
    },
    decorators: [
        (Story, context) => {
            const colorScheme = (context.globals.colorScheme ?? "dark") as "light" | "dark";
            return createElement(
                MantineProvider,
                {theme, forceColorScheme: colorScheme},
                createElement(Story),
            );
        },
    ],
};

export default preview;
